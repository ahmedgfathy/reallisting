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
    You are a professional Real Estate Data Classifier for the Egyptian market.
    Your mission: Analyze Arabic WhatsApp messages and extract structured data.
    
    Fields to extract:
    1. category: Always "عقار" if it's about real estate, otherwise "أخرى".
    2. propertyType: The specific type of property (e.g., "شقة", "فيلا", "أرض", "محل", "مكتب", "عمارة", "شاليه", "مخزن").
    3. purpose: The transaction type: "بيع" (Sale), "إيجار" (Rent), or "مطلوب" (Wanted).
    4. region: The specific neighborhood/city in Arabic (e.g., "التجمع", "الشيخ زايد", "المعادي", "أكتوبر").
    
    Rules:
    - If the message is a "Request/Wanted" (مطلوب), the purpose MUST be "مطلوب".
    - If the message is a "Listing/Offer" (معروض/للبيع/للايجار), the purpose is "بيع" or "إيجار".
    - Normalize regions: "تجمع" -> "التجمع الخامس", "زايد" -> "الشيخ زايد".
    
    Examples:
    Message: "مطلوب شقة في زايد ميزانية 3 مليون" -> {"category":"عقار", "propertyType":"شقة", "purpose":"مطلوب", "region":"الشيخ زايد"}
    Message: "للبيع فيلا في التجمع استلام فوري" -> {"category":"عقار", "propertyType":"فيلا", "purpose":"بيع", "region":"التجمع الخامس"}
    Message: "شقة للايجار بمدينتي" -> {"category":"عقار", "propertyType":"شقة", "purpose":"إيجار", "region":"مدينتي"}
    
    Return ONLY a JSON object. No other text.
    Message to analyze: "${text}"
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
