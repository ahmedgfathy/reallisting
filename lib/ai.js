const fetch = require('node-fetch');

const AI_API_KEY = process.env.AI_API_KEY;
// Default to a common OpenAI-compatible endpoint structure, but user calls it "Ollama". 
// Usually Ollama runs locally, but with a key like this it looks like a hosted service 
// (perhaps text-generation-webui or a cloud provider). 
// For now we will use a generic structure that can be easily pointed to whatever URL.
const AI_ENDPOINT = process.env.AI_ENDPOINT || 'https://api.ollama.com/v1/chat/completions'; // Placeholder URL

async function analyzeMessage(text) {
    if (!AI_API_KEY) {
        console.warn('AI_API_KEY is missing. Falling back to basic regex.');
        return null;
    }

    const systemPrompt = `
    You are an expert Real Estate Text Analyzer for the Egyptian market.
    Your task is to extract structured data from informal WhatsApp messages about real estate.
    
    Extract the following fields in JSON format:
    - category: "عقار" (Real Estate) or "أخرى" (Other)
    - propertyType: "شقة" (Apartment), "فيلا" (Villa), "أرض" (Land), "محل" (Shop), "مكتب" (Office), "عمارة" (Building), etc.
    - purpose: "بيع" (Sale), "إيجار" (Rent), "مطلوب" (Wanted)
    - region: The specific neighborhood or district (e.g., "التجمع الخامس", "مدينة نصر", "الشيخ زايد"). Use "أخرى" if unknown.
    - price: The extracted price number if available, or null.
    
    If the message is not related to real estate, set category to "أخرى".
    
    Output JSON only. No markdown.
  `;

    try {
        const response = await fetch(AI_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${AI_API_KEY}`
            },
            body: JSON.stringify({
                model: "llama3", // User mentioned Ollama, Llama 3 is common. Configurable.
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: text }
                ],
                temperature: 0.1,
                response_format: { type: "json_object" }
            })
        });

        if (!response.ok) {
            throw new Error(`AI API Error: ${response.statusText}`);
        }

        const data = await response.json();
        const content = data.choices[0]?.message?.content;

        try {
            return JSON.parse(content);
        } catch (parseError) {
            console.error('Failed to parse AI response JSON:', content);
            return null;
        }

    } catch (error) {
        console.error('AI Analysis failed:', error.message);
        return null;
    }
}

module.exports = { analyzeMessage };
