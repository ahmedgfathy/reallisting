const { messages, verifyToken, corsHeaders } = require('../lib/db');
const { extractWithRegex } = require('../lib/regex');

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

const MOBILE_REGEX = /(?:\+?20|0020|0)?1[0-9]{9}|(?:\+?966|00966|0)?5[0-9]{8}/g;
const SYSTEM_NOISE_PATTERNS = [
  /security code/i,
  /tap to learn more/i,
  /end-to-end encrypted/i,
  /verification code/i,
  /\botp\b/i,
  /joined using this group's invite link/i,
  /this message was deleted/i,
  /missed (voice|video) call/i,
  /رمز التحقق/i,
  /كود التفعيل/i,
  /تم تغيير رمز الامان/i,
  /تم تغيير كود الامان/i,
  /مشفرة من طرف الى طرف/i,
  /انضم باستخدام رابط الدعوة/i,
  /تم حذف هذه الرسالة/i,
  /مكالمة (صوتية|فيديو) فائتة/i
];
const PROPERTY_SIGNAL_REGEX = /(شقة|شقه|فيلا|ارض|أرض|محل|مكتب|عمارة|عماره|منزل|بيت|شاليه|دوبلكس|روف|استوديو|للبيع|بيع|للايجار|للإيجار|ايجار|إيجار|مطلوب|متر|م2|م²|غرف|غرفة|حمام|سعر|جنيه|مليون|تشطيب|الحي|حي|مجاورة|منطقة)/i;

function normalizeArabicText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/[ؤئ]/g, 'ء')
    .replace(/[\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function containsSystemNoise(text) {
  const normalized = normalizeArabicText(text);
  return SYSTEM_NOISE_PATTERNS.some((pattern) => pattern.test(normalized));
}

function sanitizeListingMessage(rawText) {
  const initial = normalizeDigits(rawText)
    .replace(/[\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/g, ' ')
    .replace(/\r/g, '\n');

  const cleanedLines = initial
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !containsSystemNoise(line))
    .map((line) => line
      .replace(MOBILE_REGEX, ' ')
      .replace(/(?:للتواصل|اتصال|واتساب|whatsapp|phone|tel)\s*[:\-]?\s*/gi, ' ')
      .replace(/~\s*[^\n\r]{2,40}/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim())
    .filter(Boolean);

  return cleanedLines.join(' ').trim();
}

function hasUsableListingSignals(msg, cleanedMessage) {
  const metadata = msg?.ai_metadata || {};
  const hasStructuredFields = Boolean(
    (msg?.property_type && msg.property_type !== 'أخرى') ||
    (msg?.region && msg.region !== 'أخرى') ||
    metadata.area ||
    metadata.price ||
    metadata.space_m2 ||
    metadata.bedrooms ||
    metadata.bathrooms ||
    metadata.district
  );

  return hasStructuredFields || PROPERTY_SIGNAL_REGEX.test(cleanedMessage || '');
}

function canonicalCategory(value, fallbackText = '') {
  const text = normalizeArabicText(value || fallbackText);
  if (!text) return 'أخرى';
  if (text.includes('مطلوب') || text.includes('شراء')) return 'مطلوب';
  if (text.includes('ايجار') || text.includes('للايجار') || text.includes('اجار')) return 'إيجار';
  if (text.includes('بيع') || text.includes('للبيع') || text.includes('تنازل')) return 'بيع';
  return 'أخرى';
}

function canonicalPropertyType(value, fallbackText = '') {
  const text = normalizeArabicText(value || fallbackText);
  if (!text) return 'أخرى';
  if (/(شقه|شقة|شقق|دوبلكس|استوديو|روف|بنتهاوس|تاون هاوس|توين هاوس)/.test(text)) return 'شقة';
  if (/(فيلا|فيلات)/.test(text)) return 'فيلا';
  if (/(ارض|أرض|اراضي|قطعه)/.test(text)) return 'أرض';
  if (/(محل|shop)/.test(text)) return 'محل';
  if (/(مكتب|اداري|إداري|عياده|عيادة)/.test(text)) return 'مكتب';
  if (/(عماره|عمارة)/.test(text)) return 'عمارة';
  if (/(منزل|بيت)/.test(text)) return 'منزل';
  if (/(شاليه|مصيف)/.test(text)) return 'شاليه';
  if (/(مصنع|ورشه|ورشة)/.test(text)) return 'مصنع';
  if (/(مخزن|مستودع)/.test(text)) return 'مخزن';
  if (/(دور ارضي|ارضي)/.test(text)) return 'دور أرضي';
  return 'أخرى';
}

function canonicalPurpose(value, propertyType, fallbackText = '') {
  const text = normalizeArabicText(value || fallbackText);
  if (/(تجاري|اداري|إداري|محل|مكتب|عياده|عيادة|مول)/.test(text)) return 'تجاري';
  if (/(صناعي|مصنع|مخزن|مستودع|ورشه|ورشة|هنجر)/.test(text)) return 'صناعي';
  if (/(سكني|سكنيه|شقه|شقة|فيلا|منزل|بيت|عائلي|شاليه)/.test(text)) return 'سكني';

  if (propertyType === 'محل' || propertyType === 'مكتب') return 'تجاري';
  if (propertyType === 'مصنع' || propertyType === 'مخزن') return 'صناعي';
  if (propertyType === 'شقة' || propertyType === 'فيلا' || propertyType === 'منزل' || propertyType === 'شاليه') return 'سكني';
  return 'أخرى';
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

    // Format response - mask sensitive data for unapproved users
    const formattedMessages = data
      .map(msg => {
        let messageContent = sanitizeListingMessage(msg.message || '');
        const regexData = extractWithRegex(messageContent);

        // Hide obvious non-property system messages, especially from old imports.
        if (!messageContent || containsSystemNoise(messageContent) || !hasUsableListingSignals(msg, messageContent)) {
          return null;
        }

        // Keep masking for non-approved users as a second safety net.
        if (!isApprovedUser) {
          messageContent = messageContent.replace(MOBILE_REGEX, '***********');
        }

        const propertyTypeSource = msg.property_type && msg.property_type !== 'أخرى'
          ? msg.property_type
          : (regexData.property_type || messageContent);
        const categorySource = msg.category && msg.category !== 'أخرى'
          ? msg.category
          : (regexData.ad_type || messageContent);
        const purposeSource = msg.purpose && msg.purpose !== 'أخرى'
          ? msg.purpose
          : (regexData.purpose || messageContent);

        const propertyType = canonicalPropertyType(propertyTypeSource, messageContent);
        const category = canonicalCategory(categorySource, messageContent);
        const purpose = canonicalPurpose(purposeSource, propertyType, messageContent);
        const region = msg.region && msg.region !== 'أخرى'
          ? msg.region
          : (regexData.district || 'أخرى');

        const mergedMetadata = {
          ...(msg.ai_metadata || {}),
          district: msg.ai_metadata?.district || region || 'أخرى',
          area: msg.ai_metadata?.area || msg.ai_metadata?.space_m2 || regexData.space_m2 || null,
          price: msg.ai_metadata?.price || regexData.raw_price || null,
          bedrooms: msg.ai_metadata?.bedrooms || regexData.bedrooms || null,
          bathrooms: msg.ai_metadata?.bathrooms || regexData.bathrooms || null
        };

        const formatted = {
          id: msg.id,
          message: messageContent,
          date_of_creation: msg.date_of_creation,
          source_file: msg.source_file || '',
          image_url: msg.image_url || '',
          category,
          property_type: propertyType,
          region,
          purpose,
          ai_metadata: mergedMetadata
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
      })
      .filter(Boolean);

    return res.status(200).json({
      data: formattedMessages,
      total: total,
      totalPages: Math.ceil(total / parseInt(limit)),
      page: parseInt(page),
      limit: parseInt(limit),
      hasMore: data.length === parseInt(limit)
    });

  } catch (error) {
    console.error('Messages error:', error);
    return res.status(500).json({ error: 'Failed to fetch messages' });
  }
};
