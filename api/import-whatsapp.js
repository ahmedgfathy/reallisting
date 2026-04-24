const { messages, regions, corsHeaders, verifyToken } = require('../lib/db');
const { analyzeMessage } = require('../lib/ai');
const { extractWithRegex } = require('../lib/regex');

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
  const normalized = String(text || '').replace(/[^\d+]/g, '');
  const mobileRegex = /(?:\+?966|00966|0)?5\d{8}|(?:\+?20|0020|0)?1\d{9}/g;
  const matches = normalized.match(mobileRegex);
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

function normalizeArabicText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/[ؤئ]/g, 'ء')
    .replace(/[\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function toFiniteNumber(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const normalized = String(value)
    .replace(/[^\d.]/g, '')
    .trim();
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

const SYSTEM_NOISE_PATTERNS = [
  /security code/i,
  /tap to learn more/i,
  /end-to-end encrypted/i,
  /verification code/i,
  /\botp\b/i,
  /joined using this group's invite link/i,
  /this message was deleted/i,
  /missed (voice|video) call/i,
  /رمز التحقق/i,
  /كود التفعيل/i,
  /تم تغيير رمز الامان/i,
  /تم تغيير كود الامان/i,
  /مشفرة من طرف الى طرف/i,
  /انضم باستخدام رابط الدعوة/i,
  /تم حذف هذه الرسالة/i,
  /مكالمة (صوتية|فيديو) فائتة/i
];

const PROPERTY_SIGNAL_REGEX = /(شقة|شقه|فيلا|ارض|أرض|محل|مكتب|عمارة|عماره|منزل|بيت|شاليه|دوبلكس|روف|استوديو|للبيع|بيع|للايجار|للإيجار|ايجار|إيجار|مطلوب|متر|م2|م²|غرف|غرفة|حمام|سعر|جنيه|مليون|تشطيب|الحي|حي|مجاورة|منطقة)/i;
const MOBILE_REGEX = /(?:\+?20|0020|0)?1\d{9}|(?:\+?966|00966|0)?5\d{8}/g;

function containsSystemNoise(text) {
  const normalized = normalizeArabicText(text);
  return SYSTEM_NOISE_PATTERNS.some((pattern) => pattern.test(normalized));
}

function sanitizeListingMessage(rawText) {
  const initial = String(rawText || '')
    .replace(/[\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/g, ' ')
    .replace(/\r/g, '\n');

  const cleanedLines = initial
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !containsSystemNoise(line))
    .map((line) => line
      .replace(MOBILE_REGEX, ' ')
      .replace(/(?:للتواصل|اتصال|واتساب|whatsapp|phone|tel)\s*[:\-]?\s*/gi, ' ')
      .replace(/~\s*[^\n\r]{2,40}/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim())
    .filter(Boolean);

  return cleanedLines.join(' ').trim();
}

function hasPropertySignals(text, regexData, regionGuess) {
  if (!text) return false;
  if (PROPERTY_SIGNAL_REGEX.test(text)) return true;
  return Boolean(
    regexData?.property_type ||
    regexData?.space_m2 ||
    regexData?.raw_price ||
    regexData?.bedrooms ||
    regexData?.bathrooms ||
    regexData?.district ||
    (regionGuess && regionGuess !== 'أخرى')
  );
}

function isPropertyMessage(rawText, regexData, regionGuess) {
  const text = normalizeArabicText(rawText);
  if (!text || text.length < 12) return false;
  if (containsSystemNoise(text)) return false;

  const withoutPhones = text.replace(MOBILE_REGEX, '').replace(/[^\p{L}\s]/gu, '').trim();
  if (withoutPhones.length < 6 && !hasPropertySignals(text, regexData, regionGuess)) {
    return false;
  }

  return hasPropertySignals(text, regexData, regionGuess);
}

function canonicalCategory(value) {
  const text = normalizeArabicText(value);
  if (!text) return 'أخرى';
  if (text.includes('مطلوب') || text.includes('شراء')) return 'مطلوب';
  if (text.includes('ايجار') || text.includes('للايجار') || text.includes('اجار')) return 'إيجار';
  if (text.includes('بيع') || text.includes('للبيع') || text.includes('تنازل')) return 'بيع';
  return 'أخرى';
}

function canonicalPropertyType(value) {
  const text = normalizeArabicText(value);
  if (!text) return 'أخرى';
  if (/(شقه|شقة|شقق|دوبلكس|استوديو|روف|بنتهاوس|تاون هاوس|توين هاوس)/.test(text)) return 'شقة';
  if (/(فيلا|فيلات)/.test(text)) return 'فيلا';
  if (/(ارض|أرض|اراضي|اراضي|قطعه)/.test(text)) return 'أرض';
  if (/(محل|shop)/.test(text)) return 'محل';
  if (/(مكتب|اداري|إداري|عياده|عيادة)/.test(text)) return 'مكتب';
  if (/(عماره|عمارة)/.test(text)) return 'عمارة';
  if (/(منزل|بيت)/.test(text)) return 'منزل';
  if (/(شاليه|مصيف)/.test(text)) return 'شاليه';
  if (/(مصنع|ورشه|ورشة)/.test(text)) return 'مصنع';
  if (/(مخزن|مستودع)/.test(text)) return 'مخزن';
  if (/(دور ارضي|ارضي)/.test(text)) return 'دور أرضي';
  return 'أخرى';
}

function canonicalPurpose(value, propertyType) {
  const text = normalizeArabicText(value);
  if (/(تجاري|اداري|إداري|محل|مكتب|عياده|عيادة|مول)/.test(text)) return 'تجاري';
  if (/(صناعي|مصنع|مخزن|مستودع|ورشه|ورشة|هنجر)/.test(text)) return 'صناعي';
  if (/(سكني|سكنيه|شقه|شقة|فيلا|منزل|بيت|عائلي|شاليه)/.test(text)) return 'سكني';

  if (propertyType === 'محل' || propertyType === 'مكتب') return 'تجاري';
  if (propertyType === 'مصنع' || propertyType === 'مخزن') return 'صناعي';
  if (propertyType === 'شقة' || propertyType === 'فيلا' || propertyType === 'منزل' || propertyType === 'شاليه') return 'سكني';
  return 'أخرى';
}

// Advanced Classifier based on User's New Schema
function classifyMessageRegex(messageText) {
  const text = messageText.toLowerCase();

  // 1. نوع الإعلان (Category) -> Rent/Sell/Buy
  let category = 'أخرى';
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
  let purpose = 'أخرى';
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
    const hasAI = !!(process.env.OPENAI_API_KEY || process.env.GEMINI_API_KEY || process.env.AI_API_KEY);

    console.log(`🚀 Processing ${rawMessages.length} messages. AI Enabled: ${hasAI}`);

    // Process with AI in small parallel groups to maintain speed without hitting limits
    const processedMessages = await processInGroups(rawMessages, 5, async (msg) => {
      try {
        const rawMessage = String(msg.message || '').trim();
        if (!rawMessage) return null;

        const mobile = extractMobileNumber(msg.sender) || extractMobileNumber(msg.message);
        const regexData = extractWithRegex(rawMessage);
        const regexClass = classifyMessageRegex(rawMessage);
        const autoRegion = extractRegion(rawMessage, availableRegions);

        if (!isPropertyMessage(rawMessage, regexData, autoRegion)) {
          return null;
        }

        let aiResult = null;
        if (hasAI) {
          try {
            aiResult = await analyzeMessage(rawMessage);
          } catch (e) {
            console.warn('AI error, using regex.');
          }
        }

        const propertyType = canonicalPropertyType(aiResult?.propertyType || regexData.property_type || regexClass.propertyType);
        const category = canonicalCategory(aiResult?.category || regexData.ad_type || regexClass.category);
        const purpose = canonicalPurpose(aiResult?.purpose || regexData.purpose || regexClass.purpose, propertyType);
        const mainRegion = aiResult?.region || autoRegion;
        const specificDistrict = aiResult?.district || regexData.district || (autoRegion !== 'أخرى' ? autoRegion : 'أخرى');
        const cleanMessage = sanitizeListingMessage(rawMessage) || rawMessage;

        if (!cleanMessage || containsSystemNoise(cleanMessage)) {
          return null;
        }

        return {
          message: cleanMessage,
          sender_name: msg.sender || null,
          sender_mobile: mobile || regexData.phone || null,
          date_of_creation: msg.date || null,
          source_file: finalFileName || null,
          image_url: null,
          category,
          property_type: propertyType,
          region: specificDistrict, // Prioritize the specific area (e.g. "الحي 22") for the region filter
          purpose,
          ai_metadata: aiResult ? {
            main_region: mainRegion,
            district: specificDistrict,
            area: toFiniteNumber(aiResult.area) ?? regexData.space_m2 ?? null,
            price: toFiniteNumber(aiResult.price) ?? toFiniteNumber(regexData.raw_price),
            keywords: aiResult.keywords,
            space_m2: regexData.space_m2,
            bedrooms: regexData.bedrooms,
            bathrooms: regexData.bathrooms,
            finishing: regexData.finishing,
          } : {
            main_region: mainRegion,
            district: specificDistrict,
            space_m2: regexData.space_m2,
            bedrooms: regexData.bedrooms,
            bathrooms: regexData.bathrooms,
            finishing: regexData.finishing,
            area: regexData.space_m2,
            price: toFiniteNumber(regexData.raw_price),
            raw_price: regexData.raw_price,
            price_unit: regexData.price_unit,
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

    if (!result.success) {
      console.error('Failed to save messages to database:', result.error);
      return res.status(500).json({
        error: 'Failed to save messages to database',
        details: result.error
      });
    }

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
