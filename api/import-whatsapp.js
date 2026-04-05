const { messages, regions, corsHeaders, verifyToken } = require('../lib/db');
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

  // Specific regex for "الحي" and "المجاورة" patterns
  const areaPatterns = [
    /(?:الحي|الحى|حي|الحي)\s+(\d+)/i,
    /(?:المجاورة|مجاورة|مجاوره|مج)\s+(\d+)/i,
    /(?:منطقة صناعيه|صناعية|الصناعية)/i
  ];

  for (const pattern of areaPatterns) {
    const match = text.match(pattern);
    if (match) {
      return match[0].trim(); // Returns "الحي 22" or "مج 5" or "صناعية"
    }
  }

  for (const region of availableRegions) {
    if (text.includes(region.name.toLowerCase())) {
      return region.name;
    }
  }
  return 'أخرى';
}

// Advanced Classifier based on User's New Schema
function classifyMessageRegex(messageText) {
  const text = messageText.toLowerCase();

  // 1. نوع الإعلان (Category) -> Rent/Sell/Buy
  let category = 'بيع'; // Default
  if (text.includes('مطلوب') || text.includes('شراء')) category = 'مطلوب';
  else if (text.includes('للايجار') || text.includes('إيجار') || text.includes('ايجار') || text.includes('للسكن')) category = 'إيجار';
  else if (text.includes('للبيع') || text.includes('بيع') || text.includes('تنازل')) category = 'بيع';

  // 2. نوع العقار (Property Type) -> Apartment, Villa, Land
  let propertyType = 'أخرى';
  if (text.match(/شقة|شقق|شقه/)) propertyType = 'شقة';
  else if (text.match(/فيلا|فيلات/)) propertyType = 'فيلا';
  else if (text.match(/أرض|ارض|اراضي|أراضي|قطعة/)) propertyType = 'أرض';
  else if (text.match(/محل/)) propertyType = 'محل';
  else if (text.match(/مكتب|اداري/)) propertyType = 'مكتب';
  else if (text.match(/عمارة|بيت|منزل|كامل/)) propertyType = 'عمارة';
  else if (text.match(/شاليه|مصيف/)) propertyType = 'شاليه';
  else if (text.match(/مصنع|ورشة/)) propertyType = 'مصنع';
  else if (text.match(/مخزن/)) propertyType = 'مخزن';
  else if (text.match(/ارضي|دور ارضي/)) propertyType = 'دور أرضي';

  // 3. الغرض (Purpose) -> Commercial / Residential / Industrial
  let purpose = 'سكني'; // Default to Residential
  if (text.match(/محل|مكتب|اداري|تجاري|عيادة|مول/)) purpose = 'تجاري';
  else if (text.match(/مصنع|ورشة|مخزن|صناعي|هنجر/)) purpose = 'صناعي';
  else if (text.match(/شقة|فيلا|منزل|بيت|سكن|عائلي/)) purpose = 'سكني';

  // Special case: Land can be undetermined, but usually residential unless in industrial area
  if (propertyType === 'أرض' && text.match(/صناعية|منطقة صناعية/)) purpose = 'صناعي';

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
    const hasAI = !!(process.env.GEMINI_API_KEY || process.env.AI_API_KEY);

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

        const propertyType = aiResult?.propertyType || regexClass.propertyType;
        const mainRegion = aiResult?.region || autoRegion;
        const specificDistrict = aiResult?.district || (autoRegion !== 'أخرى' ? autoRegion : 'أخرى');

        return {
          message: msg.message || null,
          sender_name: msg.sender || null,
          sender_mobile: mobile || null,
          date_of_creation: msg.date || null,
          source_file: finalFileName || null,
          image_url: null,
          category: aiResult?.category || regexClass.category,
          property_type: propertyType,
          region: specificDistrict, // Prioritize the specific area (e.g. "الحي 22") for the region filter
          purpose: aiResult?.purpose || regexClass.purpose,
          ai_metadata: aiResult ? {
            main_region: mainRegion,
            district: specificDistrict,
            area: aiResult.area,
            price: aiResult.price,
            keywords: aiResult.keywords
          } : {
            district: specificDistrict
          }
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
      aiUsed: hasAI,
      classifications: validMessages.map(m => ({
        msg: m.message.substring(0, 30) + '...',
        region: m.region,
        type: m.property_type,
        purpose: m.purpose
      }))
    });
  } catch (error) {
    console.error('Import error:', error);
    return res.status(500).json({ error: 'Failed' });
  }
};
