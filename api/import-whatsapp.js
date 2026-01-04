const crypto = require('crypto');

module.exports = async (context) => {
  const { req, res, log, error } = context;
  const { databases, getUserBySession, isConfigured, getConfigError, APPWRITE_DATABASE_ID, COLLECTIONS, importMessages } = require('./lib_appwrite');

  if (req.method === 'OPTIONS') {
    return res.text('', 200, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    });
  }

  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.json({ error: 'No token provided' }, 401);

  const userResult = await getUserBySession(token);
  if (!userResult.success || userResult.user.role !== 'admin') {
    return res.json({ error: 'Admin access required' }, 403);
  }

  if (req.method !== 'POST') return res.json({ error: 'Method not allowed' }, 405);

  try {
    const { text, fileContent, filename: bodyFilename } = req.body || {};
    let chatText = text || fileContent || '';
    const filename = bodyFilename || `import_${Date.now()}.txt`;

    if (!chatText) return res.json({ error: 'No chat text provided' }, 400);

    // Simple parser for WhatsApp - we can import the logic if it's external, 
    // but here we inline or require a helper.
    const lines = chatText.split('\n');
    const parsedMessages = [];
    const whatsappRegex = /^\[?(\d{1,2}\/\d{1,2}\/\d{2,4}),?\s+(\d{1,2}:\d{2}(?::\d{2})?)\]?\s*[-–—]?\s*([^:]+):\s*(.+)$/;

    for (const line of lines) {
      const match = line.match(whatsappRegex);
      if (match) {
        const [, date, time, sender, message] = match;
        parsedMessages.push({
          date: date.trim(),
          time: time.trim(),
          sender: sender.trim(),
          message: message.trim()
        });
      }
    }

    if (parsedMessages.length === 0) {
      return res.json({ error: 'No messages parsed' }, 400);
    }

    let imported = 0;
    let errors = 0;

    for (const msg of parsedMessages) {
      try {
        const docId = crypto.createHash('md5').update(msg.date + msg.time + msg.sender + msg.message).digest('hex');

        await databases.createDocument(
          APPWRITE_DATABASE_ID,
          COLLECTIONS.MESSAGES,
          docId,
          {
            message: msg.message,
            senderName: msg.sender,
            senderMobile: 'N/A', // Extraction could be added here
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
        if (e.code === 409) continue;
        errors++;
      }
    }

    return res.json({
      success: true,
      message: 'Import completed',
      stats: { totalParsed: parsedMessages.length, imported, errors }
    }, 200, { 'Access-Control-Allow-Origin': '*' });

  } catch (err) {
    error('Import error: ' + err.message);
    return res.json({ error: err.message }, 500);
  }
};
