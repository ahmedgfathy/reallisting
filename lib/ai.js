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
    
    PROPERTY TYPES (propertyType):
    - Identify as: "شقة" (for شقة/شقق), "فيلا" (for فيلا/فيلات), "أرض" (for أرض/اراضي), "منزل" (for منزل/عمارة), "مصنع", "مخزن", "دور أرضي", "مكتب", "محل".
    
    REGIONS/LOCATIONS (region & district):
    - Look for: "الحي X", "المجاورة Y", "مج Z", "المنطقة الصناعية".
    - Normalize "تجمع" -> "التجمع الخامس", "زايد" -> "الشيخ زايد".
    
    REQUIRED FIELDS:
    - category: "عقار" or "أخرى"
    - propertyType: From the list above.
    - purpose: "بيع" (Sale), "إيجار" (Rent), or "مطلوب" (Wanted)
    - region: The main city/area (e.g. العاشر من رمضان).
    - district: The specific district/neighborhood (e.g. الحي 22, مجاورة 70).
    - area: Number only if present.
    - price: Number only if present.
    - keywords: Array of extra features.
    
    Return ONLY JSON.
    Example:
    {"category":"عقار", "propertyType":"أرض", "purpose":"بيع", "region":"العاشر من رمضان", "district":"الحي 22", "area":276, "price":2800000, "keywords":["واجهة غربي"]}
    
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
