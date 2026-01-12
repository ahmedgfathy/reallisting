const { messages, regions, corsHeaders, verifyToken } = require('../lib/supabase');
const fs = require('fs');
const path = require('path');

// Storage directory in project root
const STORAGE_DIR = path.join(process.cwd(), 'storage', 'uploads');

// Ensure storage directory exists
function ensureStorageDir() {
  if (!fs.existsSync(STORAGE_DIR)) {
    fs.mkdirSync(STORAGE_DIR, { recursive: true });
    console.log('📁 Created storage directory:', STORAGE_DIR);
  }
}

// Helper to parse request body
async function parseBody(req) {
  if (req.body) return req.body;
  
  return new Promise((resolve) => {
    let body = '';
    req.on('data', chunk => { 
      body += chunk.toString(); 
    });
    req.on('end', () => {
      try {
        const parsed = JSON.parse(body);
        resolve(parsed);
      } catch (error) {
        console.error('Body parse error:', error);
        resolve({});
      }
    });
    req.on('error', (error) => {
      console.error('Request error:', error);
      resolve({});
    });
  });
}

// Parse WhatsApp text format
function parseWhatsAppText(text) {
  const lines = text.split('\n');
  const parsedMessages = [];
  
  // WhatsApp format: [DD/MM/YYYY, HH:MM:SS] Sender Name: Message
  // or: DD/MM/YYYY, HH:MM - Sender Name: Message
  const messageRegex = /^\[?(\d{1,2}\/\d{1,2}\/\d{2,4}),?\s+(\d{1,2}:\d{2}(?::\d{2})?(?:\s?[AP]M)?)\]?\s*-?\s*([^:]+):\s*(.+)$/i;
  
  let currentMessage = null;
  
  for (const line of lines) {
    const match = line.match(messageRegex);
    
    if (match) {
      // Save previous message if exists
      if (currentMessage) {
        parsedMessages.push(currentMessage);
      }
      
      const [, date, time, sender, messageText] = match;
      
      // Parse date (handle DD/MM/YYYY or DD/MM/YY)
      const dateParts = date.split('/');
      let day = parseInt(dateParts[0]);
      let month = parseInt(dateParts[1]) - 1; // JS months are 0-indexed
      let year = parseInt(dateParts[2]);
      
      // Handle 2-digit years
      if (year < 100) {
        year += 2000;
      }
      
      // Parse time
      const timeParts = time.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?(?:\s?([AP]M))?/i);
      let hours = parseInt(timeParts[1]);
      const minutes = parseInt(timeParts[2]);
      const seconds = timeParts[3] ? parseInt(timeParts[3]) : 0;
      const ampm = timeParts[4];
      
      // Convert to 24-hour format if needed
      if (ampm) {
        if (ampm.toUpperCase() === 'PM' && hours < 12) hours += 12;
        if (ampm.toUpperCase() === 'AM' && hours === 12) hours = 0;
      }
      
      const messageDate = new Date(year, month, day, hours, minutes, seconds);
      
      currentMessage = {
        sender: sender.trim(),
        message: messageText.trim(),
        date: messageDate.toISOString()
      };
    } else if (currentMessage && line.trim()) {
      // Continuation of previous message
      currentMessage.message += '\n' + line;
    }
  }
  
  // Add last message
  if (currentMessage) {
    parsedMessages.push(currentMessage);
  }
  
  return parsedMessages;
}

// Extract mobile numbers from text
function extractMobileNumber(text) {
  // Egyptian mobile: 01[0-9]{9} or +201[0-9]{9}
  // Saudi mobile: 05[0-9]{8} or +9665[0-9]{8}
  const mobileRegex = /(?:\+?966|0)?5\d{8}|(?:\+?20|0)?1\d{9}/g;
  const matches = text.match(mobileRegex);
  return matches ? matches[0] : '';
}

// Extract region from message
function extractRegion(messageText, availableRegions) {
  const text = messageText.toLowerCase();
  
  for (const region of availableRegions) {
    if (text.includes(region.name.toLowerCase())) {
      return region.name;
    }
  }
  
  return 'أخرى';
}

// Classify message
function classifyMessage(messageText) {
  const text = messageText.toLowerCase();
  
  // Category
  let category = 'أخرى';
  if (text.includes('عقار') || text.includes('عقارات')) category = 'عقار';
  if (text.includes('شقة') || text.includes('شقق')) category = 'شقة';
  if (text.includes('فيلا')) category = 'فيلا';
  if (text.includes('أرض') || text.includes('ارض')) category = 'أرض';
  if (text.includes('محل') || text.includes('محلات')) category = 'محل';
  if (text.includes('مكتب')) category = 'مكتب';
  
  // Property type
  let propertyType = 'أخرى';
  if (text.includes('شقة')) propertyType = 'شقة';
  if (text.includes('فيلا')) propertyType = 'فيلا';
  if (text.includes('دور')) propertyType = 'دور';
  if (text.includes('أرض')) propertyType = 'أرض';
  if (text.includes('عمارة')) propertyType = 'عمارة';
  
  // Purpose
  let purpose = 'أخرى';
  if (text.includes('للبيع') || text.includes('بيع')) purpose = 'بيع';
  if (text.includes('للإيجار') || text.includes('ايجار') || text.includes('إيجار')) purpose = 'إيجار';
  if (text.includes('مطلوب')) purpose = 'مطلوب';
  
  return { category, propertyType, purpose };
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

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verify admin token
    const token = req.headers.authorization?.replace('Bearer ', '');
    const payload = verifyToken(token);
    
    if (!payload || payload.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const body = await parseBody(req);
    console.log('Received body:', { hasFileContent: !!body.fileContent, fileName: body.fileName || body.filename });
    
    const { fileContent, fileName, filename } = body;
    const finalFileName = fileName || filename || `whatsapp_${Date.now()}.txt`;

    if (!fileContent) {
      console.error('No file content in body');
      return res.status(400).json({ error: 'No file content provided' });
    }

    // Step 1: Save file to storage
    ensureStorageDir();
    const filePath = path.join(STORAGE_DIR, finalFileName);
    
    console.log(`📁 Saving file to: ${filePath}`);
    fs.writeFileSync(filePath, fileContent, 'utf8');
    console.log(`✅ File saved successfully`);

    // Step 2: Extract/Process the file
    console.log(`📝 Extracting messages from: ${finalFileName}`);

    // Parse WhatsApp messages
    const parsedMessages = parseWhatsAppText(fileContent);
    console.log(`📝 Parsed ${parsedMessages.length} messages`);

    // Get available regions
    const availableRegions = await regions.getAll();

    // Import messages
    let imported = 0;
    let skipped = 0;
    const errors = [];

    for (const msg of parsedMessages) {
      try {
        const mobile = extractMobileNumber(msg.message);
        const region = extractRegion(msg.message, availableRegions);
        const { category, propertyType, purpose } = classifyMessage(msg.message);

        const result = await messages.create({
          message: msg.message,
          sender_name: msg.sender,
          sender_mobile: mobile,
          date_of_creation: msg.date,
          source_file: finalFileName,
          category,
          property_type: propertyType,
          region,
          purpose
        });

        if (result.success) {
          imported++;
        } else {
          skipped++;
          errors.push(`Message from ${msg.sender}: ${result.error}`);
        }
      } catch (error) {
        skipped++;
        errors.push(`Error processing message: ${error.message}`);
      }
    }

    console.log(`✅ Import complete: ${imported} imported, ${skipped} skipped`);

    // Step 3: Delete the file after extraction
    try {
      fs.unlinkSync(filePath);
      console.log(`🗑️  File deleted: ${finalFileName}`);
    } catch (deleteError) {
      console.error('Failed to delete file:', deleteError);
      // Don't fail the import if deletion fails
    }

    return res.status(200).json({
      success: true,
      imported,
      skipped,
      total: parsedMessages.length,
      errors: errors.slice(0, 10) // Return first 10 errors only
    });

  } catch (error) {
    console.error('Import error:', error);
    return res.status(500).json({ 
      success: false,
      error: error.message || 'Import failed'
    });
  }
};
