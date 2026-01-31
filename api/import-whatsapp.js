const { messages, regions, corsHeaders, verifyToken } = require('../lib/database');
const { analyzeMessage } = require('../lib/ai');

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

// Extract mobile numbers from text
function extractMobileNumber(text) {
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

// Basic Regex Classifier (Fallback/Boost)
function classifyMessageRegex(messageText) {
  const text = messageText.toLowerCase();

  let category = 'أخرى';
  if (text.includes('عقار') || text.includes('عقارات')) category = 'عقار';
  else if (text.includes('شقة') || text.includes('شقق')) category = 'شقة';
  else if (text.includes('فيلا')) category = 'فيلا';
  else if (text.includes('أرض') || text.includes('ارض')) category = 'أرض';
  else if (text.includes('محل') || text.includes('محلات')) category = 'محل';
  else if (text.includes('مكتب')) category = 'مكتب';

  let propertyType = 'أخرى';
  if (text.includes('شقة')) propertyType = 'شقة';
  else if (text.includes('فيلا')) propertyType = 'فيلا';
  else if (text.includes('دور')) propertyType = 'دور';
  else if (text.includes('أرض')) propertyType = 'أرض';
  else if (text.includes('عمارة')) propertyType = 'عمارة';

  let purpose = 'بيع';
  if (text.includes('للبيع') || text.includes('بيع')) purpose = 'بيع';
  else if (text.includes('للإيجار') || text.includes('ايجار') || text.includes('إيجار')) purpose = 'إيجار';
  else if (text.includes('مطلوب')) purpose = 'مطلوب';

  return { category, propertyType, purpose };
}

// Helper to process in chunks for AI
async function processInGroups(items, groupSize, task) {
  const results = [];
  for (let i = 0; i < items.length; i += groupSize) {
    const group = items.slice(i, i + groupSize);
    const groupResults = await Promise.all(group.map(task));
    results.push(...groupResults);
  }
  return results;
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
    const { messages: rawMessages, fileName } = body;
    const finalFileName = fileName || `batch_${Date.now()}.txt`;

    if (!rawMessages || !Array.isArray(rawMessages)) {
      return res.status(400).json({ error: 'Invalid messages format' });
    }

    // Get available regions
    const availableRegions = await regions.getAll();
    const hasAI = !!process.env.AI_API_KEY;

    console.log(`🚀 Processing ${rawMessages.length} messages. AI Enabled: ${hasAI}`);

    // Process with AI in small parallel groups to maintain speed without hitting limits
    const processedMessages = await processInGroups(rawMessages, 5, async (msg) => {
      try {
        const mobile = extractMobileNumber(msg.message);
        const regexClass = classifyMessageRegex(msg.message);
        const autoRegion = extractRegion(msg.message, availableRegions);

        let aiResult = null;
        if (hasAI) {
          try {
            aiResult = await analyzeMessage(msg.message);
          } catch (e) {
            console.warn('AI error, using regex.');
          }
        }

        return {
          message: msg.message || null,
          sender_name: msg.sender || null,
          sender_mobile: mobile || null,
          date_of_creation: msg.date || null,
          source_file: finalFileName || null,
          image_url: null,
          category: aiResult?.category || regexClass.category,
          property_type: aiResult?.propertyType || regexClass.propertyType,
          region: aiResult?.region || autoRegion,
          purpose: aiResult?.purpose || regexClass.purpose
        };
      } catch (err) {
        return null;
      }
    });

    const validMessages = processedMessages.filter(m => m !== null);
    if (validMessages.length === 0) {
      return res.status(200).json({ success: true, imported: 0, skipped: rawMessages.length });
    }

    const result = await messages.createBatch(validMessages);

    return res.status(200).json({
      success: true,
      imported: result.count || 0,
      skipped: rawMessages.length - (result.count || 0),
      total: rawMessages.length,
      aiUsed: hasAI
    });
  } catch (error) {
    console.error('Import error:', error);
    return res.status(500).json({ error: 'Failed' });
  }
};
