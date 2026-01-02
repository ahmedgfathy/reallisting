const { supabase, verifyToken, corsHeaders } = require('./_lib/supabase');

// Helper to parse request body for multipart/form-data or text
async function parseBody(req) {
  if (req.body) return req.body;
  return new Promise((resolve) => {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      try {
        resolve(JSON.parse(body));
      } catch {
        resolve({ text: body });
      }
    });
  });
}

// Parse WhatsApp exported chat text
function parseWhatsAppChat(text) {
  const lines = text.split('\n');
  const messages = [];
  
  // WhatsApp format: [DD/MM/YYYY, HH:MM:SS] Name: Message
  // or: DD/MM/YYYY, HH:MM - Name: Message
  const whatsappRegex = /^\[?(\d{1,2}\/\d{1,2}\/\d{2,4}),?\s+(\d{1,2}:\d{2}(?::\d{2})?)\]?\s*[-–]?\s*([^:]+):\s*(.+)$/;
  
  for (const line of lines) {
    const match = line.match(whatsappRegex);
    if (match) {
      const [, date, time, sender, message] = match;
      messages.push({
        date: date.trim(),
        time: time.trim(),
        sender: sender.trim(),
        message: message.trim()
      });
    }
  }
  
  return messages;
}

// Extract mobile number from message text
function extractMobile(text) {
  // Egyptian mobile patterns
  const patterns = [
    /\b(01[0-9]{9})\b/,           // 01xxxxxxxxx
    /\b(\+201[0-9]{9})\b/,        // +201xxxxxxxxx
    /\b(00201[0-9]{9})\b/         // 00201xxxxxxxxx
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      let mobile = match[1];
      // Normalize to 01xxxxxxxxx format
      if (mobile.startsWith('+20')) {
        mobile = '0' + mobile.substring(3);
      } else if (mobile.startsWith('0020')) {
        mobile = '0' + mobile.substring(4);
      }
      return mobile;
    }
  }
  return null;
}

// Extract property details from message
function extractPropertyDetails(message) {
  const details = {
    category: 'أخرى',
    propertyType: 'أخرى',
    region: 'العاشر من رمضان',  // Default to 10th Ramadan
    purpose: 'أخرى'
  };
  
  const lowerMessage = message.toLowerCase();
  
  // Extract category
  if (lowerMessage.includes('معروض') || lowerMessage.includes('للبيع') || lowerMessage.includes('للإيجار')) {
    details.category = 'معروض';
  } else if (lowerMessage.includes('مطلوب')) {
    details.category = 'مطلوب';
  }
  
  // Extract property type
  const propertyTypes = [
    { keywords: ['شقة', 'شقه'], value: 'شقة' },
    { keywords: ['فيلا'], value: 'فيلا' },
    { keywords: ['دوبلكس'], value: 'دوبلكس' },
    { keywords: ['محل', 'محلات'], value: 'محل' },
    { keywords: ['مكتب', 'مكاتب'], value: 'مكتب' },
    { keywords: ['أرض', 'ارض', 'قطعة'], value: 'أرض' },
    { keywords: ['عمارة', 'عماره'], value: 'عمارة' },
    { keywords: ['بنتهاوس', 'بينتهاوس'], value: 'بنتهاوس' }
  ];
  
  for (const type of propertyTypes) {
    if (type.keywords.some(kw => lowerMessage.includes(kw))) {
      details.propertyType = type.value;
      break;
    }
  }
  
  // Extract purpose
  if (lowerMessage.includes('للبيع') || lowerMessage.includes('بيع')) {
    details.purpose = 'بيع';
  } else if (lowerMessage.includes('للإيجار') || lowerMessage.includes('إيجار') || lowerMessage.includes('ايجار')) {
    details.purpose = 'إيجار';
  }
  
  // Extract region if mentioned (look for common regions)
  const regions = [
    'التجمع الخامس',
    'التجمع الثالث',
    'الشيخ زايد',
    '6 أكتوبر',
    'المعادي',
    'مدينة نصر',
    'مصر الجديدة',
    'العاشر من رمضان',
    'الرحاب',
    'القاهرة الجديدة'
  ];
  
  for (const region of regions) {
    if (message.includes(region)) {
      details.region = region;
      break;
    }
  }
  
  return details;
}

// Generate unique message ID
function generateMessageId() {
  return `whatsapp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

module.exports = async (req, res) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    Object.entries(corsHeaders).forEach(([k, v]) => res.setHeader(k, v));
    return res.status(200).end();
  }
  
  Object.entries(corsHeaders).forEach(([k, v]) => res.setHeader(k, v));
  
  // Verify admin authentication
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  
  const payload = verifyToken(token);
  if (!payload || payload.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const body = await parseBody(req);
    const chatText = body.text || body.content || '';
    
    if (!chatText) {
      return res.status(400).json({ error: 'No chat text provided' });
    }
    
    // Parse WhatsApp chat
    const parsedMessages = parseWhatsAppChat(chatText);
    
    if (parsedMessages.length === 0) {
      return res.status(400).json({ 
        error: 'No messages parsed. Please ensure the text is in WhatsApp export format.' 
      });
    }
    
    const stats = {
      total: parsedMessages.length,
      imported: 0,
      skipped: 0,
      errors: 0,
      sendersCreated: 0
    };
    
    const senderCache = new Map();
    
    // Process each message
    for (const msg of parsedMessages) {
      try {
        const mobile = extractMobile(msg.message);
        const details = extractPropertyDetails(msg.message);
        
        let senderId = null;
        
        // If mobile found, create/get sender
        if (mobile) {
          if (senderCache.has(mobile)) {
            senderId = senderCache.get(mobile);
          } else {
            // Use the get_or_create_sender RPC function
            const { data: senderIdResult, error: senderError } = await supabase
              .rpc('get_or_create_sender', {
                p_mobile: mobile,
                p_name: msg.sender || '',
                p_date: msg.date
              });
            
            if (senderError) {
              console.error('Error creating sender:', senderError);
            } else {
              senderId = senderIdResult;
              senderCache.set(mobile, senderId);
              if (!stats.sendersCreated) stats.sendersCreated = 0;
              stats.sendersCreated++;
            }
          }
        }
        
        // Clean message - remove mobile numbers for privacy
        let cleanMessage = msg.message;
        if (mobile) {
          cleanMessage = cleanMessage.replace(new RegExp(mobile.replace(/[+]/g, '\\+'), 'g'), '***');
        }
        
        // Insert message into database
        const messageData = {
          id: generateMessageId(),
          message: cleanMessage,
          sender_id: senderId,
          mobile: mobile || 'N/A',
          date_of_creation: msg.date,
          source_file: 'whatsapp_import',
          category: details.category,
          property_type: details.propertyType,
          region: details.region,
          purpose: details.purpose,
          created_at: new Date().toISOString()
        };
        
        const { error: insertError } = await supabase
          .from('messages')
          .insert([messageData]);
        
        if (insertError) {
          console.error('Error inserting message:', insertError);
          stats.errors++;
        } else {
          stats.imported++;
        }
        
      } catch (error) {
        console.error('Error processing message:', error);
        stats.errors++;
      }
    }
    
    return res.status(200).json({
      success: true,
      message: `Import completed successfully`,
      stats: {
        totalParsed: stats.total,
        imported: stats.imported,
        sendersCreated: stats.sendersCreated,
        errors: stats.errors
      }
    });
    
  } catch (error) {
    console.error('Import error:', error);
    return res.status(500).json({ error: error.message });
  }
};
