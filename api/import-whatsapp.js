const { query, verifyToken, corsHeaders } = require('../lib/database');

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
    
    // Record upload in database (without external storage)
    if (body.fileContent && body.filename) {
      await query(
        'INSERT INTO chat_uploads (filename, file_path, uploaded_by, status) VALUES ($1, $2, $3, $4)',
        [filename, filename, payload.username, 'processing']
      );
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
    
    // Helper to insert rows in batches using VALUES
    const insertBatch = async (table, columns, rows) => {
      if (!rows.length) return { data: [], error: null };
      const values = [];
      const params = [];
      let paramIndex = 1;
      for (const row of rows) {
        const placeholders = columns.map(() => `$${paramIndex++}`);
        values.push(`(${placeholders.join(', ')})`);
        columns.forEach(col => params.push(row[col]));
      }
      const sql = `INSERT INTO ${table} (${columns.join(', ')}) VALUES ${values.join(', ')} RETURNING id, mobile`;
      return query(sql, params);
    };

    // Get existing senders
    if (uniqueMobiles.size > 0) {
      const mobilesArray = Array.from(uniqueMobiles.keys());
      const { data: existingSenders } = await query(
        'SELECT id, mobile FROM sender WHERE mobile = ANY($1::text[])',
        [mobilesArray]
      );
      
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
        const { data: createdSenders, error: senderError } = await insertBatch(
          'sender',
          ['mobile', 'name', 'first_seen_date', 'first_seen_time'],
          newSenders
        );
        
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
        const columns = ['id', 'message', 'sender_id', 'name', 'mobile', 'date_of_creation', 'source_file', 'category', 'property_type', 'region', 'purpose', 'created_at'];
        const { error: insertError } = await (async () => {
          const values = [];
          const params = [];
          let paramIndex = 1;
          for (const row of messagesToInsert) {
            const placeholders = columns.map(() => `$${paramIndex++}`);
            values.push(`(${placeholders.join(', ')})`);
            columns.forEach(col => params.push(row[col]));
          }
          const sql = `INSERT INTO messages (${columns.join(', ')}) VALUES ${values.join(', ')}`;
          const { error } = await query(sql, params);
          return { error };
        })();
        
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
        await query(
          `UPDATE chat_uploads
           SET status = 'completed', processed_at = $1, total_parsed = $2,
               total_imported = $3, senders_created = $4, errors = $5
           WHERE uploaded_by = $6 AND filename = $7`,
          [new Date().toISOString(), stats.total, stats.imported, stats.sendersCreated, stats.errors, payload.username, filename]
        );
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
