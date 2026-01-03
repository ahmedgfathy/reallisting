const { supabase, verifyToken, corsHeaders } = require('../lib/supabase');

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
        resolve({ text: body });
      }
    });
  });
}

// Parse WhatsApp exported chat text
function parseWhatsAppChat(text) {
  const lines = text.split('\n');
  const messages = [];
  
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
    
    // Accept both 'text' (old format) and 'fileContent' (new format)
    let chatText = body.text || body.fileContent || body.content || '';
    const filename = body.filename || `import_${Date.now()}.txt`;
    
    if (!chatText) {
      return res.status(400).json({ error: 'No chat text provided' });
    }
    
    // If this is a file upload, store it in Supabase Storage
    if (body.fileContent && body.filename) {
      try {
        const timestamp = Date.now();
        const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
        const filePath = `${payload.username}/${timestamp}_${safeName}`;
        
        // Upload to Supabase Storage
        await supabase.storage
          .from('whatsapp-chats')
          .upload(filePath, chatText, {
            contentType: 'text/plain',
            upsert: false
          });
        
        // Record upload in database
        await supabase
          .from('chat_uploads')
          .insert([{
            filename: filename,
            file_path: filePath,
            uploaded_by: payload.username,
            status: 'processing'
          }]);
      } catch (storageError) {
        console.log('Storage upload skipped:', storageError.message);
        // Continue even if storage fails
      }
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
    
    // Batch processing for better performance
    const BATCH_SIZE = 100;
    const senderCache = new Map();
    
    // First, extract all unique mobiles and create senders in batch
    const uniqueMobiles = new Map(); // mobile -> {sender, date, time}
    
    for (const msg of parsedMessages) {
      const mobile = extractMobile(msg.message);
      if (mobile && !uniqueMobiles.has(mobile)) {
        uniqueMobiles.set(mobile, {
          sender: msg.sender || '',
          date: msg.date,
          time: msg.time
        });
      }
    }
    
    // Get existing senders
    if (uniqueMobiles.size > 0) {
      const mobilesArray = Array.from(uniqueMobiles.keys());
      const { data: existingSenders } = await supabase
        .from('sender')
        .select('id, mobile')
        .in('mobile', mobilesArray);
      
      if (existingSenders) {
        existingSenders.forEach(s => senderCache.set(s.mobile, s.id));
      }
      
      // Create new senders in batch
      const newSenders = [];
      for (const [mobile, info] of uniqueMobiles) {
        if (!senderCache.has(mobile)) {
          newSenders.push({
            mobile: mobile,
            name: info.sender,
            first_seen_date: info.date,
            first_seen_time: info.time
          });
        }
      }
      
      if (newSenders.length > 0) {
        const { data: createdSenders, error: senderError } = await supabase
          .from('sender')
          .insert(newSenders)
          .select('id, mobile');
        
        if (!senderError && createdSenders) {
          createdSenders.forEach(s => senderCache.set(s.mobile, s.id));
          stats.sendersCreated = createdSenders.length;
        }
      }
    }
    
    // Now process messages in batches
    for (let i = 0; i < parsedMessages.length; i += BATCH_SIZE) {
      const batch = parsedMessages.slice(i, i + BATCH_SIZE);
      const messagesToInsert = [];
      
      for (const msg of batch) {
        try {
          const mobile = extractMobile(msg.message);
          const details = extractPropertyDetails(msg.message);
          const senderId = mobile ? senderCache.get(mobile) : null;
          
          const messageData = {
            id: generateMessageId(),
            message: msg.message,
            sender_id: senderId,
            name: msg.sender || '',
            mobile: mobile || 'N/A',
            date_of_creation: msg.date,
            source_file: filename || 'whatsapp_import',
            category: details.category,
            property_type: details.propertyType,
            region: details.region,
            purpose: details.purpose,
            created_at: new Date().toISOString()
          };
          
          messagesToInsert.push(messageData);
        } catch (error) {
          console.error('Error preparing message:', error);
          stats.errors++;
        }
      }
      
      // Batch insert messages
      if (messagesToInsert.length > 0) {
        const { error: insertError } = await supabase
          .from('messages')
          .insert(messagesToInsert);
        
        if (insertError) {
          console.error('Batch insert error:', insertError);
          stats.errors += messagesToInsert.length;
        } else {
          stats.imported += messagesToInsert.length;
        }
      }
    }
    
    // Update chat_uploads status if this was a file upload
    if (body.fileContent && body.filename) {
      try {
        await supabase
          .from('chat_uploads')
          .update({
            status: 'completed',
            processed_at: new Date().toISOString(),
            total_parsed: stats.total,
            total_imported: stats.imported,
            senders_created: stats.sendersCreated,
            errors: stats.errors
          })
          .eq('uploaded_by', payload.username)
          .eq('filename', filename)
          .order('uploaded_at', { ascending: false })
          .limit(1);
      } catch (updateError) {
        console.log('Failed to update chat_uploads:', updateError.message);
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
