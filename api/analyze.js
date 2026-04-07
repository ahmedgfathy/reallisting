const { corsHeaders, verifyToken } = require('../lib/db');
const { extractWithRegex, normalizeArabicText } = require('../lib/regex');

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
    // Verify authentication token
    const token = req.headers.authorization?.replace('Bearer ', '');
    const payload = verifyToken(token);
    if (!payload) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const body = await parseBody(req);
    const { message } = body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Step 1: Run regex extraction first (fast, free, no external dependency)
    const regexResult = extractWithRegex(message);

    // Step 2: Enhance with OpenAI if key is configured (server-side only)
    const openaiKey = process.env.OPENAI_API_KEY;
    if (!openaiKey) {
      return res.status(200).json({
        success: true,
        source: 'regex',
        data: regexResult,
      });
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You extract Arabic real estate messages into strict JSON only.
Return valid JSON with no markdown and no explanation.
Fields: ad_type, property_type, purpose, area, district, title, description, price, currency, space_m2, bedrooms, bathrooms, finishing, phone, contact_name, listing_intent, confidence
If unknown, use null.`.trim(),
          },
          {
            role: 'user',
            content: message,
          },
        ],
        temperature: 0,
        max_tokens: 1024,
      }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      console.error(`OpenAI API Error: ${response.status} - ${errBody}`);
      // Fall back to regex result on OpenAI error
      return res.status(200).json({
        success: true,
        source: 'regex',
        data: regexResult,
      });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return res.status(200).json({
        success: true,
        source: 'regex',
        data: regexResult,
      });
    }

    try {
      const cleanContent = content.replace(/```json|```/g, '').trim();
      const aiResult = JSON.parse(cleanContent);

      // Merge regex + AI results, preferring AI for non-null fields
      const merged = {
        ...regexResult,
        ...Object.fromEntries(
          Object.entries(aiResult).filter(([, v]) => v !== null && v !== undefined)
        ),
      };

      return res.status(200).json({
        success: true,
        source: 'openai',
        data: merged,
        raw_ai: aiResult,
      });
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', content);
      return res.status(200).json({
        success: true,
        source: 'regex',
        data: regexResult,
      });
    }
  } catch (error) {
    console.error('Analyze error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: String(error),
    });
  }
};
