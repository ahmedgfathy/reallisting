const { supabase, corsHeaders } = require('./_lib/supabase');

// This endpoint runs automatically via Vercel Cron (every hour)
// Or you can call it manually: GET /api/clean-mobiles-cron

/**
 * Enhanced contact information cleaning patterns
 */
const patterns = {
  // Security code messages (entire line)
  securityCode: /.*security code.*changed.*/gi,
  
  // Mobile numbers with various formats
  // Must be 11 digits (Egyptian mobile) or 10 digits (without leading 0)
  mobileNumbers: /(\+?20)?0?1[0-9]{9}\b/g,
  
  // Arabic digits (11 consecutive digits that start with ٠١ which is Egyptian mobile prefix)
  arabicDigits: /٠١[٠-٩]{9}/g,
  
  // Common contact patterns
  contactPatterns: [
    /\b(call|tel|phone|mobile|whatsapp|واتساب|اتصل|موبايل|تليفون|رقم)\s*:?\s*[+\d\s()-]+/gi,
  ]
};

function cleanText(text) {
  if (!text || typeof text !== 'string') return text;
  
  const original = text;
  let cleaned = text;
  let hasContactInfo = false;
  
  // Check and remove security code messages
  if (patterns.securityCode.test(cleaned)) {
    cleaned = cleaned.replace(patterns.securityCode, '');
    hasContactInfo = true;
  }
  
  // Check and remove mobile numbers
  if (patterns.mobileNumbers.test(cleaned)) {
    cleaned = cleaned.replace(patterns.mobileNumbers, '');
    hasContactInfo = true;
  }
  
  // Check and remove Arabic digit sequences
  if (patterns.arabicDigits.test(cleaned)) {
    cleaned = cleaned.replace(patterns.arabicDigits, '');
    hasContactInfo = true;
  }
  
  // Check and remove contact patterns
  patterns.contactPatterns.forEach(pattern => {
    if (pattern.test(cleaned)) {
      cleaned = cleaned.replace(pattern, '');
      hasContactInfo = true;
    }
  });
  
  // Only clean up whitespace if we found contact info
  if (hasContactInfo) {
    cleaned = cleaned.replace(/\s+/g, ' ').trim();
    
    cleaned = cleaned.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0 && /[a-zA-Zا-ي]/.test(line))
      .join('\n');
  }
  
  return cleaned;
}

module.exports = async (req, res) => {
  // Verify cron secret for security
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  Object.entries(corsHeaders).forEach(([k, v]) => res.setHeader(k, v));

  const startTime = Date.now();
  
  try {
    console.log('Starting enhanced contact information cleanup...');
    
    // Get recent messages (last 2 hours) that might contain contact info
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    
    const { data: messages, error: fetchError } = await supabase
      .from('messages')
      .select('id, message')
      .gte('created_at', twoHoursAgo)
      .order('created_at', { ascending: false })
      .limit(1000);

    if (fetchError) {
      console.error('Fetch error:', fetchError);
      return res.status(500).json({ error: 'Failed to fetch messages' });
    }

    // Filter messages containing contact info and clean them
    const updates = [];
    
    for (const msg of messages || []) {
      if (msg.message) {
        const cleaned = cleanText(msg.message);
        if (cleaned !== msg.message && cleaned.length > 0) {
          updates.push({ id: msg.id, message: cleaned });
        }
      }
    }

    // Update in parallel batches of 10
    let updated = 0;
    for (let i = 0; i < updates.length; i += 10) {
      const batch = updates.slice(i, i + 10);
      await Promise.all(
        batch.map(u => 
          supabase.from('messages').update({ message: u.message }).eq('id', u.id)
        )
      );
      updated += batch.length;
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log(`✓ Cleaned ${updated} messages in ${duration}s`);
    
    return res.status(200).json({
      success: true,
      cleaned: updated,
      checked: messages?.length || 0,
      duration: `${duration}s`
    });

  } catch (error) {
    console.error('Cron error:', error);
    return res.status(500).json({ error: error.message });
  }
};
