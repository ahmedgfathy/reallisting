const { supabase, verifyToken, corsHeaders } = require('./_lib/supabase');

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
  const patterns = [
    /(\+201[0-9]{9})/,
    /(00201[0-9]{9})/,
    /\b(01[0-9]{9})\b/
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      let mobile = match[1];
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
    region: 'العاشر من رمضان',
    purpose: 'أخرى'
  };
  
  const lowerMessage = message.toLowerCase();
  
  if (lowerMessage.includes('مطلوب')) {
    details.category = 'مطلوب';
  } else if (lowerMessage.includes('معروض') || lowerMessage.includes('للبيع') || lowerMessage.includes('للإيجار')) {
    details.category = 'معروض';
  }
  
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
  
  if (lowerMessage.includes('للبيع') || lowerMessage.includes('بيع')) {
    details.purpose = 'بيع';
  } else if (lowerMessage.includes('للإيجار') || lowerMessage.includes('إيجار') || lowerMessage.includes('ايجار')) {
    details.purpose = 'إيجار';
  }
  
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
    const { uploadId } = req.body;
    
    if (!uploadId) {
      return res.status(400).json({ error: 'Upload ID required' });
    }
    
    // Get upload record
    const { data: upload, error: uploadError } = await supabase
      .from('chat_uploads')
      .select('*')
      .eq('id', uploadId)
      .single();
    
    if (uploadError || !upload) {
      return res.status(404).json({ error: 'Upload not found' });
    }
    
    if (upload.status !== 'pending') {
      return res.status(400).json({ error: 'Upload already processed or processing' });
    }
    
    // Update status to processing
    await supabase
      .from('chat_uploads')
      .update({ status: 'processing' })
      .eq('id', uploadId);
    
    // Download file from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('whatsapp-chats')
      .download(upload.file_path);
    
    if (downloadError) {
      await supabase
        .from('chat_uploads')
        .update({ 
          status: 'failed',
          error_message: 'Failed to download file: ' + downloadError.message 
        })
        .eq('id', uploadId);
      return res.status(500).json({ error: 'Failed to download file' });
    }
    
    // Convert blob to text
    const chatText = await fileData.text();
    
    // Parse WhatsApp chat
    const parsedMessages = parseWhatsAppChat(chatText);
    
    if (parsedMessages.length === 0) {
      await supabase
        .from('chat_uploads')
        .update({ 
          status: 'failed',
          error_message: 'No messages found in file' 
        })
        .eq('id', uploadId);
      return res.status(400).json({ error: 'No messages parsed from file' });
    }
    
    const stats = {
      total: parsedMessages.length,
      imported: 0,
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
        
        if (mobile) {
          if (senderCache.has(mobile)) {
            senderId = senderCache.get(mobile);
          } else {
            const { data: existingSender } = await supabase
              .from('sender')
              .select('id')
              .eq('mobile', mobile)
              .single();
            
            const senderExists = !!existingSender;
            
            if (existingSender) {
              senderId = existingSender.id;
              senderCache.set(mobile, senderId);
            } else {
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
                if (!senderExists) stats.sendersCreated++;
              }
            }
          }
        }
        
        const messageData = {
          id: generateMessageId(),
          message: msg.message,
          sender_id: senderId,
          name: msg.sender || '',
          mobile: mobile || 'N/A',
          date_of_creation: msg.date,
          source_file: upload.filename,
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
    
    // Update upload record with results
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
      .eq('id', uploadId);
    
    return res.status(200).json({
      success: true,
      message: 'Processing completed successfully',
      stats: {
        totalParsed: stats.total,
        imported: stats.imported,
        sendersCreated: stats.sendersCreated,
        errors: stats.errors
      }
    });
    
  } catch (error) {
    console.error('Processing error:', error);
    
    // Update status to failed
    if (req.body.uploadId) {
      await supabase
        .from('chat_uploads')
        .update({ 
          status: 'failed',
          error_message: error.message 
        })
        .eq('id', req.body.uploadId);
    }
    
    return res.status(500).json({ error: error.message });
  }
};
