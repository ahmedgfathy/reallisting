const { messages, verifyToken, corsHeaders } = require('../lib/db');

// Helper to parse request body
async function parseBody(req) {
  if (req.body) return req.body;
  return new Promise((resolve) => {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      try {
        resolve(JSON.parse(body));
      } catch {
        resolve({});
      }
    });
  });
}

// Normalize Arabic/Persian digits to ASCII digits.
function normalizeDigits(value) {
  return String(value || '')
    .replace(/[\u0660-\u0669]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[\u06F0-\u06F9]/g, (d) => String(d.charCodeAt(0) - 0x06F0));
}

// Try to extract a phone from one or more candidate strings.
function extractContactMobile(...candidates) {
  const mobileRegex = /(?:\+?20|0020|0)?1[0-9]{9}|(?:\+?966|00966|0)?5[0-9]{8}/g;

  for (const value of candidates) {
    const text = normalizeDigits(value);
    const match = text.match(mobileRegex);
    if (match && match[0]) {
      // Keep only digits/+ for safe tel links in UI.
      return match[0].replace(/[^\d+]/g, '');
    }
  }
  return '';
}

module.exports = async (req, res) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    Object.entries(corsHeaders).forEach(([key, value]) => {
      res.setHeader(key, value);
    });
    return res.status(200).end();
  }

  Object.entries(corsHeaders).forEach(([key, value]) => {
    res.setHeader(key, value);
  });

  // POST - Create new message/property listing (requires active user or admin)
  if (req.method === 'POST') {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'يجب تسجيل الدخول لإضافة إعلان' });
      }
      const token = authHeader.substring(7);
      const payload = verifyToken(token);
      if (!payload) {
        return res.status(401).json({ error: 'جلسة غير صالحة، يرجى إعادة تسجيل الدخول' });
      }
      const isAllowed = payload.role === 'admin' || payload.isActive === true;
      if (!isAllowed) {
        return res.status(403).json({ error: 'حسابك في انتظار الموافقة من المشرف' });
      }

      const body = await parseBody(req);
      const {
        message,
        sender_name,
        sender_mobile,
        category,
        property_type,
        region,
        purpose
      } = body || {};

      if (!message || !message.trim()) {
        return res.status(400).json({ error: 'نص الإعلان مطلوب' });
      }

      const result = await messages.create({
        message: message.trim(),
        sender_name: (sender_name || '').trim(),
        sender_mobile: (sender_mobile || '').trim(),
        date_of_creation: new Date().toISOString(),
        source_file: 'إضافة يدوية',
        category: category || 'أخرى',
        property_type: property_type || 'أخرى',
        region: region || 'أخرى',
        purpose: purpose || 'أخرى',
        ai_metadata: {}
      });

      if (!result.success) {
        return res.status(500).json({ error: result.error || 'فشل إضافة الإعلان' });
      }

      return res.status(201).json({ success: true, id: result.id });
    } catch (error) {
      console.error('Create message error:', error);
      return res.status(500).json({ error: 'فشل إضافة الإعلان' });
    }
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      page = 1,
      limit = 50,
      search = '',
      category = '',
      propertyType = '',
      region = '',
      purpose = ''
    } = req.query;

    // Check if user is authenticated and approved
    const authHeader = req.headers.authorization;
    let isApprovedUser = false;

    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const payload = verifyToken(token);

      if (payload) {
        isApprovedUser = payload.role === 'admin' || payload.isActive === true;
      }
    }

    // Get messages from database
    const filters = {};

    // Only add filters if they're not "الكل" (All)
    if (category && category !== 'الكل') filters.category = category;
    if (propertyType && propertyType !== 'الكل') filters.property_type = propertyType;
    if (region && region !== 'الكل') filters.region = region;
    if (purpose && purpose !== 'الكل') filters.purpose = purpose;
    if (search) filters.search = search;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const data = await messages.getAll(filters, parseInt(limit), offset);
    const total = await messages.count(filters);

    const MOBILE_REGEX = /(?:\+?20|0020|0)?1[0-9]{9}|(?:\+?966|00966|0)?5[0-9]{8}/g;

    // Format response - mask sensitive data for unapproved users
    const formattedMessages = data.map(msg => {
      let messageContent = msg.message || '';

      // Mask mobile numbers in message content if user is not approved
      if (!isApprovedUser && messageContent) {
        // Replace all occurrences of mobile-like patterns with ***********
        messageContent = messageContent.replace(MOBILE_REGEX, '***********');
      }

      const formatted = {
        id: msg.id,
        message: messageContent,
        date_of_creation: msg.date_of_creation,
        source_file: msg.source_file || '',
        image_url: msg.image_url || '',
        category: msg.category || 'أخرى',
        property_type: msg.property_type || 'أخرى',
        region: msg.region || 'أخرى',
        purpose: msg.purpose || 'أخرى',
        ai_metadata: msg.ai_metadata || {}
      };

      // Only show contact info for approved users
      // If sender_mobile is missing, recover it from sender_name/message for old imports.
      if (isApprovedUser) {
        const recoveredMobile = extractContactMobile(
          msg.sender_mobile,
          msg.sender_name,
          msg.message
        );
        formatted.sender_name = msg.sender_name || '';
        formatted.sender_mobile = recoveredMobile || '';
      } else {
        formatted.sender_name = '';
        formatted.sender_mobile = '';
      }

      return formatted;
    });

    return res.status(200).json({
      data: formattedMessages,
      total: total,
      totalPages: Math.ceil(total / parseInt(limit)),
      page: parseInt(page),
      limit: parseInt(limit),
      hasMore: formattedMessages.length === parseInt(limit)
    });

  } catch (error) {
    console.error('Messages error:', error);
    return res.status(500).json({ error: 'Failed to fetch messages' });
  }
};
