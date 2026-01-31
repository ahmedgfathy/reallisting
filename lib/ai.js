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
    Extract structured real estate data from this Arabic WhatsApp message:
    Fields:
    - category: "عقار" (Real Estate) or "أخرى" (Other)
    - propertyType: "شقة" (Apartment), "فيلا", "أرض", "محل", "مكتب", "عمارة", etc.
    - purpose: "بيع" (Sale), "إيجار" (Rent), "مطلوب" (Wanted)
    - region: District name in Arabic (e.g. "التجمع الخامس").
    
    Return JSON only. Format: {"category": "...", "propertyType": "...", "purpose": "...", "region": "..."}
    Message: ${text}
    `;

    try {
        const response = await fetch(GEMINI_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: systemPrompt }] }],
                generationConfig: {
                    temperature: 0.1,
                    topP: 0.95,
                    topK: 40,
                    maxOutputTokens: 1024,
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
            return JSON.parse(content);
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
