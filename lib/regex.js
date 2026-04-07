// Arabic real estate regex patterns, normalization, and extraction helpers
// Note: \b word boundaries do not work with Arabic characters in JavaScript,
// so patterns match Arabic terms directly without word boundary anchors.

const realEstateRegex = {
  phone: /(?:\+?2)?01[0-2,5]{1}[0-9]{8}/g,

  price: /(?:السعر|مطلوب|بـ|بسعر)?\s*([0-9]{1,3}(?:[,.\s]?[0-9]{3})*|[0-9]+)\s*(مليون|مليوني?ن|ألف|الف|جنيه|جم|egp)?/gi,

  areaSqm: /([0-9]{2,4})\s*(?:متر|م2|متر2|متر مربع)/gi,

  bedrooms: /([0-9]{1,2})\s*(?:غرف|غرفة|نوم)/gi,

  bathrooms: /([0-9]{1,2})\s*(?:حمام|حمامات)/gi,

  floors: /([0-9]{1,2})\s*(?:دور|أدوار|ادوار)/gi,

  adType: /(بيع|للبيع|إيجار|للايجار|للإيجار|مطلوب)/gi,

  propertyType: /(شقة|شقه|فيلا|دوبلكس|بنتهاوس|عمارة|عماره|أرض|ارض|محل|مكتب|عيادة|صيدلية|مخزن|استوديو|روف|توين هاوس|تاون هاوس)/gi,

  purpose: /(سكني|سكنية|تجاري|إداري|اداري|طبي|مصيفي|استثماري)/gi,

  finishing: /(سوبر لوكس|نصف تشطيب|تشطيب كامل|لوكس|الترا سوبر لوكس|بدون تشطيب|على الطوب الأحمر|ع الطوب الاحمر)/gi,

  district: /(الحي\s*\d+|حي\s*\d+|التجمع\s*(?:الأول|الاول|الثاني|الثانى|الخامس)|مدينتي|الرحاب|الشروق|العاصمة الإدارية|العاصمه الاداريه|الشيخ زايد|6 اكتوبر|أكتوبر|المعادي|مدينة نصر|مصر الجديدة|التجمع الخامس)/gi,
};

/**
 * Normalize Arabic text for consistent matching.
 * @param {string} input
 * @returns {string}
 */
function normalizeArabicText(input) {
  return String(input || '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/**
 * Extract structured fields from a raw Arabic real estate message using regex.
 * @param {string} message
 * @returns {object}
 */
function extractWithRegex(message) {
  const text = message ?? '';

  // Reset lastIndex before each use since regex flags include 'g'
  const phone = text.match(realEstateRegex.phone)?.[0] ?? null;
  const adType = text.match(realEstateRegex.adType)?.[0] ?? null;
  const propertyType = text.match(realEstateRegex.propertyType)?.[0] ?? null;
  const purpose = text.match(realEstateRegex.purpose)?.[0] ?? null;
  const finishing = text.match(realEstateRegex.finishing)?.[0] ?? null;
  const district = text.match(realEstateRegex.district)?.[0] ?? null;

  const areaMatch = [...text.matchAll(realEstateRegex.areaSqm)][0];
  const areaSqm = areaMatch ? Number(areaMatch[1]) : null;

  const floorsMatch = [...text.matchAll(realEstateRegex.floors)][0];
  const floors = floorsMatch ? Number(floorsMatch[1]) : null;

  const bedroomsMatch = [...text.matchAll(realEstateRegex.bedrooms)][0];
  const bedrooms = bedroomsMatch ? Number(bedroomsMatch[1]) : null;

  const bathroomsMatch = [...text.matchAll(realEstateRegex.bathrooms)][0];
  const bathrooms = bathroomsMatch ? Number(bathroomsMatch[1]) : null;

  const priceMatch = [...text.matchAll(realEstateRegex.price)][0];
  const rawPrice = priceMatch?.[1] ?? null;
  const priceUnit = priceMatch?.[2] ?? null;

  return {
    phone,
    ad_type: adType,
    property_type: propertyType,
    purpose,
    finishing,
    district,
    space_m2: areaSqm,
    floors,
    bedrooms,
    bathrooms,
    raw_price: rawPrice,
    price_unit: priceUnit,
    raw_text: text,
  };
}

module.exports = { realEstateRegex, normalizeArabicText, extractWithRegex };
