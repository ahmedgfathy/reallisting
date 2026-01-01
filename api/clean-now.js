const { supabase, corsHeaders } = require('./_lib/supabase');

// Manual cleaning endpoint - call this after importing new data
// GET /api/clean-now

/**
 * Enhanced contact information cleaning patterns
 */
const patterns = {
  // Security code messages (multiple formats)
  securityCodePatterns: [
    /.*PM - Your security code.*/gi,
    /.*security code.*changed.*/gi,
    /.*verification code.*/gi,
    /.*Tap to learn more.*/gi,
    /.*sbdalslamsyd79.*/gi
  ],
  
  // Mobile numbers with various formats
  mobileNumbers: /(\+?20)?0?1[0-9]{9}\b/g,
  
  // Arabic digits
  arabicDigits: /٠١[٠-٩]{9}/g,
  
  // Common contact patterns
  contactPatterns: [
    /\b(call|tel|phone|mobile|whatsapp|واتساب|اتصل|موبايل|تليفون|رقم)\s*:?\s*[+\d\s()-]+/gi,
  ]
};

function cleanText(text) {
  if (!text || typeof text !== 'string') return text;
  
  let cleaned = text;
  let hasContactInfo = false;
  
  // Remove security code messages (all patterns)
  patterns.securityCodePatterns.forEach(pattern => {
    if (pattern.test(cleaned)) {
      cleaned = cleaned.replace(pattern, '');
      hasContactInfo = true;
    }
  });
  
  // Remove mobile numbers
  if (patterns.mobileNumbers.test(cleaned)) {
    cleaned = cleaned.replace(patterns.mobileNumbers, '');
    hasContactInfo = true;
  }
  
  // Remove Arabic digit sequences
  if (patterns.arabicDigits.test(cleaned)) {
    cleaned = cleaned.replace(patterns.arabicDigits, '');
    hasContactInfo = true;
  }
  
  // Remove contact patterns
  patterns.contactPatterns.forEach(pattern => {
    if (pattern.test(cleaned)) {
      cleaned = cleaned.replace(pattern, '');
      hasContactInfo = true;
    }
  });
  
  // Clean up whitespace if we found contact info
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
  Object.entries(corsHeaders).forEach(([k, v]) => res.setHeader(k, v));

  const startTime = Date.now();
  
  try {
    console.log('🧹 Starting manual contact information cleanup...');
    
    // Get ALL messages
    const { data: messages, error: fetchError } = await supabase
      .from('messages')
      .select('id, message')
      .order('created_at', { ascending: false })
      .limit(100000);

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

    // Update in parallel batches of 20
    let updated = 0;
    for (let i = 0; i < updates.length; i += 20) {
      const batch = updates.slice(i, i + 20);
      await Promise.all(
        batch.map(u => 
          supabase.from('messages').update({ message: u.message }).eq('id', u.id)
        )
      );
      updated += batch.length;
      console.log(`Progress: ${updated}/${updates.length}`);
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log(`✓ Cleaned ${updated} messages in ${duration}s`);
    
    return res.status(200).json({
      success: true,
      cleaned: updated,
      checked: messages?.length || 0,
      duration: `${duration}s`,
      message: `Successfully cleaned ${updated} messages out of ${messages?.length || 0} checked`
    });

  } catch (error) {
    console.error('Cleaning error:', error);
    return res.status(500).json({ error: error.message });
  }
};
