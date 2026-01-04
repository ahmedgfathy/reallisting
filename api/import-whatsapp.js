const { databases, getUserBySession, corsHeaders, isConfigured, getConfigError, APPWRITE_DATABASE_ID, COLLECTIONS, ID, Query } = require('../lib/appwrite');
const crypto = require('crypto');

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

// Generate valid Appwrite ID (max 36 chars) from content to avoid duplicates
function getAppwriteId(content) {
  return crypto.createHash('md5').update(content).digest('hex');
}

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') {
    Object.entries(corsHeaders).forEach(([k, v]) => res.setHeader(k, v));
    return res.status(200).end();
  }
  Object.entries(corsHeaders).forEach(([k, v]) => res.setHeader(k, v));

  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'No token provided' });

  const userResult = await getUserBySession(token);
  if (!userResult.success || userResult.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const body = await parseBody(req);
    let chatText = body.text || body.fileContent || '';
    const filename = body.filename || `import_${Date.now()}.txt`;

    if (!chatText) return res.status(400).json({ error: 'No chat text provided' });

    const parsedMessages = parseWhatsAppChat(chatText);
    if (parsedMessages.length === 0) {
      return res.status(400).json({ error: 'No messages parsed' });
    }

    let imported = 0;
    let errors = 0;

    for (const msg of parsedMessages) {
      try {
        const mobile = extractMobile(msg.message);
        const docId = getAppwriteId(msg.date + msg.time + msg.sender + msg.message);

        await databases.createDocument(
          APPWRITE_DATABASE_ID,
          COLLECTIONS.MESSAGES,
          docId,
          {
            message: msg.message,
            senderName: msg.sender,
            senderMobile: mobile || 'N/A',
            dateOfCreation: msg.date,
            sourceFile: filename,
            category: 'أخرى',
            propertyType: 'أخرى',
            region: 'أخرى',
            purpose: 'أخرى'
          }
        );
        imported++;
      } catch (e) {
        if (e.code === 409) {
          // Skip duplicates silently
          continue;
        }
        console.error('Import item error:', e.message);
        errors++;
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Import completed',
      stats: { totalParsed: parsedMessages.length, imported, errors }
    });

  } catch (error) {
    console.error('Import error:', error);
    res.status(500).json({ error: error.message });
  }
};
