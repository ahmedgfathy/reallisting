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
  const whatsappRegex = /^\[?(\d{1,2}\/\d{1,2}\/\d{2,4}),?\s+(\d{1,2}:\d{2}(?::\d{2})?)\]?\s*[-–—]?\s*([^:]+):\s*(.+)$/;
  
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
  // Egyptian mobile patterns - without word boundaries for better Arabic support
  const patterns = [
    /(\+201[0-9]{9})/,        // +201xxxxxxxxx
    /(00201[0-9]{9})/,        // 00201xxxxxxxxx
    /\b(01[0-9]{9})\b/        // 01xxxxxxxxx (word boundary OK for this)
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
  
  // Extract category - check مطلوب first before معروض
  if (lowerMessage.includes('مطلوب')) {
    details.category = 'مطلوب';
  } else if (lowerMessage.includes('معروض') || lowerMessage.includes('للبيع') || lowerMessage.includes('للإيجار')) {
    details.category = 'معروض';
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
  // Use timestamp + random + counter for better uniqueness
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 11);
  const counter = Math.floor(Math.random() * 10000);
  return `whatsapp_${timestamp}_${random}_${counter}`;
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
            // Try using the get_or_create_sender RPC function first
            try {
              // First check if sender exists
              const { data: existingSenderCheck } = await supabase
                .from('sender')
                .select('id')
                .eq('mobile', mobile)
                .single();
              
              const senderExists = !!existingSenderCheck;
              
              const { data: senderIdResult, error: senderError } = await supabase
                .rpc('get_or_create_sender', {
                  p_mobile: mobile,
                  p_name: msg.sender || '',
                  p_date: msg.date
                });
              
              if (!senderError && senderIdResult) {
                senderId = senderIdResult;
                senderCache.set(mobile, senderId);
                // Only increment if sender didn't exist before
                if (!senderExists) {
                  stats.sendersCreated++;
                }
              }
            } catch (rpcError) {
              // If RPC function doesn't exist, use direct insert/select approach
              console.log('RPC function not available, using direct approach');
              
              // Try to find existing sender
              const { data: existingSender } = await supabase
                .from('sender')
                .select('id')
                .eq('mobile', mobile)
                .single();
              
              if (existingSender) {
                senderId = existingSender.id;
                senderCache.set(mobile, senderId);
              } else {
                // Create new sender
                const { data: newSender, error: insertError } = await supabase
                  .from('sender')
                  .insert([{
                    mobile: mobile,
                    name: msg.sender || '',
                    first_seen_date: msg.date,
                    first_seen_time: msg.time
                  }])
                  .select('id')
                  .single();
                
                if (!insertError && newSender) {
                  senderId = newSender.id;
                  senderCache.set(mobile, senderId);
                  stats.sendersCreated++;
                }
              }
            }
          }
        }
        
        // Clean message - remove mobile numbers for privacy
        let cleanMessage = msg.message;
        if (mobile) {
          // Escape all special regex characters for safe replacement
          const mobileEscaped = mobile.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          cleanMessage = cleanMessage.replace(new RegExp(mobileEscaped, 'g'), '***');
        }
        
        // Insert message into database
        // First, try to get IDs for normalized schema if it exists
        let regionId = null, categoryId = null, propertyTypeId = null, purposeId = null;
        
        // Try to look up normalized IDs (if tables exist)
        try {
          const { data: regionData } = await supabase
            .from('regions')
            .select('id')
            .eq('name', details.region)
            .single();
          if (regionData) regionId = regionData.id;
          
          const { data: categoryData } = await supabase
            .from('categories')
            .select('id')
            .eq('name', details.category)
            .single();
          if (categoryData) categoryId = categoryData.id;
          
          const { data: typeData } = await supabase
            .from('property_types')
            .select('id')
            .eq('name', details.propertyType)
            .single();
          if (typeData) propertyTypeId = typeData.id;
          
          const { data: purposeData } = await supabase
            .from('purposes')
            .select('id')
            .eq('name', details.purpose)
            .single();
          if (purposeData) purposeId = purposeData.id;
        } catch (lookupError) {
          // Normalized tables don't exist, will use text columns
          console.log('Using non-normalized schema (text columns)');
        }
        
        const messageData = {
          id: generateMessageId(),
          message: cleanMessage,
          sender_id: senderId,
          date_of_creation: msg.date,
          source_file: 'whatsapp_import',
          created_at: new Date().toISOString()
        };
        
        // Add fields based on schema (normalized or not)
        if (regionId) {
          messageData.region_id = regionId;
        } else {
          messageData.region = details.region;
        }
        
        if (categoryId) {
          messageData.category_id = categoryId;
        } else {
          messageData.category = details.category;
        }
        
        if (propertyTypeId) {
          messageData.property_type_id = propertyTypeId;
        } else {
          messageData.property_type = details.propertyType;
        }
        
        if (purposeId) {
          messageData.purpose_id = purposeId;
        } else {
          messageData.purpose = details.purpose;
        }
        
        // Add mobile if not using normalized schema
        if (!senderId || !regionId) {
          messageData.mobile = mobile || 'N/A';
        }
        
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
      message: 'Import completed successfully',
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
