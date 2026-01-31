// Using global fetch (Node 18+)

const API_KEY = process.env.GEMINI_API_KEY || process.env.AI_API_KEY;
// Gemini endpoint
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;

async function analyzeMessage(text) {
    if (!API_KEY) {
        console.warn('AI API Key is missing. Falling back to basic regex.');
        return null;
    }

    const systemPrompt = `
    You are an expert Real Estate Data Scientist for the Egyptian market.
    Your task: Extract deep structured keywords from Arabic WhatsApp messages.
    
    1. CATEGORY (نوع الإعلان - Transaction Type):
    - "بيع": (للبيع, بيع, تنازل)
    - "إيجار": (للايجار, إيجار, سكن)
    - "مطلوب": (مطلوب, شراء)
    
    2. PROPERTY TYPE (نوع العقار):
    - Identify as: "شقة", "فيلا", "أرض", "منزل", "مصنع", "مخزن", "دور أرضي", "مكتب", "محل".
    
    3. PURPOSE (الغرض - Usage Type):
    - "سكني": (Apartments, Villas, Homes)
    - "تجاري": (Shops, Offices, Malls, Clinics)
    - "صناعي": (Factories, Warehouses, Industrial Lands)
    
    4. REGION/DISTRICT (المنطقة):
    - Extract distinct neighborhood: "الحي X", "المجاورة Y", "المنطقة الصناعية".
    
    REQUIRED FIELDS:
    - category: "بيع" or "إيجار" or "مطلوب"
    - propertyType: From list above.
    - purpose: "سكني" or "تجاري" or "صناعي"
    - region: Main city (e.g. العاشر من رمضان).
    - district: Specific area (e.g. الحي 22).
    - area: Number only.
    - price: Number only.
    - keywords: Array of features.
    
    Return ONLY JSON.
    Example:
    {"category":"بيع", "propertyType":"أرض", "purpose":"صناعي", "region":"العاشر من رمضان", "district":"المنطقة الصناعية", "area":1000, "price":5000000, "keywords":["رخصة سارية"]}
    
    Message: "${text}"
    `;

    try {
        const response = await fetch(GEMINI_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: systemPrompt }] }],
                generationConfig: {
                    temperature: 0.0,
                    topP: 1,
                    maxOutputTokens: 2048,
                    responseMimeType: "application/json",
                }
            })
        });

        if (!response.ok) {
            const errBody = await response.text();
            throw new Error(`Gemini API Error: ${response.status} - ${errBody}`);
        }

        const data = await response.json();
        const content = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!content) return null;

        try {
            const cleanContent = content.replace(/```json|```/g, '').trim();
            const result = JSON.parse(cleanContent);
            console.log(`✅ Gemini Classified: ${result.region} | ${result.propertyType} | ${result.purpose}`);
            return result;
        } catch (parseError) {
            console.error('Failed to parse Gemini response:', content);
            return null;
        }

    } catch (error) {
        console.error('AI Analysis failed:', error.message);
        return null;
    }
}

module.exports = { analyzeMessage };
