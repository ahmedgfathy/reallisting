const { createClient } = require('@supabase/supabase-js');

// Use environment variables if available, otherwise fallback to defaults
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://gxyrpboyubpycejlkxue.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd4eXJwYm95dWJweWNlamxreHVlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzEwNjU5OSwiZXhwIjoyMDgyNjgyNTk5fQ.jaQO9OmympAlJqrClhxQ-NFkmp74tB-IpRPqRf0eXvk';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Enhanced patterns to remove contact information
const patterns = {
  // Security code messages (multiple formats)
  securityCodePatterns: [
    /.*PM - Your security code.*/gi,
    /.*security code.*changed.*/gi,
    /.*verification code.*/gi,
    /.*Tap to learn more.*/gi,
    /.*sbdalslamsyd79.*/gi
  ],
  
  // Mobile numbers with various formats:
  // - 01xxxxxxxxx (Egyptian format)
  // - +201xxxxxxxxx (International format)
  // - 201xxxxxxxxx (Without +)
  mobileNumbers: /(\+?20)?0?1[0-9]{9}\b/g,
  
  // Arabic digits (11 consecutive digits that start with ٠١ which is Egyptian mobile prefix)
  arabicDigits: /٠١[٠-٩]{9}/g,
  
  // Common contact patterns (keywords followed by numbers)
  contactPatterns: [
    /\b(call|tel|phone|mobile|whatsapp|واتساب|اتصل|موبايل|تليفون|رقم)\s*:?\s*[+\d\s()-]+/gi,
  ]
};

/**
 * Clean text from all contact information patterns
 */
function cleanText(text) {
  if (!text || typeof text !== 'string') return text;
  
  const original = text;
  let cleaned = text;
  let hasContactInfo = false;
  
  // Check and remove security code messages (all patterns)
  patterns.securityCodePatterns.forEach(pattern => {
    if (pattern.test(cleaned)) {
      cleaned = cleaned.replace(pattern, '');
      hasContactInfo = true;
    }
  });
  
  // Check and remove mobile numbers in various formats
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
  
  // Only clean up whitespace if we actually found contact info
  if (hasContactInfo) {
    // Clean up whitespace
    cleaned = cleaned.replace(/\s+/g, ' ').trim();
    
    // Remove lines that are now empty or just punctuation
    cleaned = cleaned.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0 && /[a-zA-Zا-ي]/.test(line))
      .join('\n');
  }
  
  return cleaned;
}

/**
 * Clean messages table
 */
async function cleanMessages() {
  console.log('🧹 Cleaning messages table...\n');
  
  const BATCH_SIZE = 1000;
  const PARALLEL_UPDATES = 50;
  let offset = 0;
  let totalCleaned = 0;
  let totalProcessed = 0;
  const startTime = Date.now();

  while (true) {
    const { data: messages, error } = await supabase
      .from('messages')
      .select('id, message')
      .range(offset, offset + BATCH_SIZE - 1);

    if (error || !messages || messages.length === 0) break;

    // Filter and clean messages with contact info
    const toUpdate = messages
      .map(m => {
        if (!m.message) return null;
        const cleaned = cleanText(m.message);
        if (cleaned !== m.message && cleaned.length > 0) {
          return { id: m.id, message: cleaned };
        }
        return null;
      })
      .filter(Boolean);

    // Update in parallel batches
    for (let i = 0; i < toUpdate.length; i += PARALLEL_UPDATES) {
      const batch = toUpdate.slice(i, i + PARALLEL_UPDATES);
      await Promise.all(
        batch.map(update =>
          supabase
            .from('messages')
            .update({ message: update.message })
            .eq('id', update.id)
        )
      );
    }

    totalCleaned += toUpdate.length;
    totalProcessed += messages.length;
    
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    const rate = Math.round(totalProcessed / elapsed);
    
    console.log(
      `Messages - Processed: ${totalProcessed.toLocaleString()} | ` +
      `Cleaned: ${totalCleaned.toLocaleString()} | ` +
      `Speed: ${rate}/s`
    );

    if (messages.length < BATCH_SIZE) break;
    offset += BATCH_SIZE;
  }

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`✅ Messages: ${totalCleaned.toLocaleString()} cleaned in ${totalTime}s\n`);
  return { processed: totalProcessed, cleaned: totalCleaned };
}

/**
 * Clean properties table
 */
async function cleanProperties() {
  console.log('🧹 Cleaning properties table...\n');
  
  const BATCH_SIZE = 1000;
  const PARALLEL_UPDATES = 50;
  let offset = 0;
  let totalCleaned = 0;
  let totalProcessed = 0;
  const startTime = Date.now();

  while (true) {
    const { data: properties, error } = await supabase
      .from('glomar_properties')
      .select('id, description, note, mobileno, tel')
      .range(offset, offset + BATCH_SIZE - 1);

    if (error || !properties || properties.length === 0) break;

    // Filter and clean properties with contact info
    const toUpdate = properties
      .map(p => {
        const updates = {};
        let hasChanges = false;
        
        // Clean description
        if (p.description) {
          const cleaned = cleanText(p.description);
          if (cleaned !== p.description) {
            updates.description = cleaned;
            hasChanges = true;
          }
        }
        
        // Clean note
        if (p.note) {
          const cleaned = cleanText(p.note);
          if (cleaned !== p.note) {
            updates.note = cleaned;
            hasChanges = true;
          }
        }
        
        // Remove mobileno and tel entirely
        if (p.mobileno) {
          updates.mobileno = null;
          hasChanges = true;
        }
        
        if (p.tel) {
          updates.tel = null;
          hasChanges = true;
        }
        
        return hasChanges ? { id: p.id, ...updates } : null;
      })
      .filter(Boolean);

    // Update in parallel batches
    for (let i = 0; i < toUpdate.length; i += PARALLEL_UPDATES) {
      const batch = toUpdate.slice(i, i + PARALLEL_UPDATES);
      await Promise.all(
        batch.map(update => {
          const { id, ...fields } = update;
          return supabase
            .from('glomar_properties')
            .update(fields)
            .eq('id', id);
        })
      );
    }

    totalCleaned += toUpdate.length;
    totalProcessed += properties.length;
    
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    const rate = Math.round(totalProcessed / elapsed);
    
    console.log(
      `Properties - Processed: ${totalProcessed.toLocaleString()} | ` +
      `Cleaned: ${totalCleaned.toLocaleString()} | ` +
      `Speed: ${rate}/s`
    );

    if (properties.length < BATCH_SIZE) break;
    offset += BATCH_SIZE;
  }

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`✅ Properties: ${totalCleaned.toLocaleString()} cleaned in ${totalTime}s\n`);
  return { processed: totalProcessed, cleaned: totalCleaned };
}

/**
 * Main execution
 */
async function main() {
  console.log('🚀 Enhanced Contact Information Cleanup\n');
  console.log('Removing:');
  console.log('  • Security code messages');
  console.log('  • Mobile numbers (all formats)');
  console.log('  • Arabic digit phone numbers');
  console.log('  • Contact information patterns\n');
  
  const overallStart = Date.now();
  
  try {
    // Clean messages
    const messagesResult = await cleanMessages();
    
    // Clean properties
    const propertiesResult = await cleanProperties();
    
    const totalTime = ((Date.now() - overallStart) / 1000).toFixed(1);
    
    console.log('═══════════════════════════════════════');
    console.log('✅ CLEANUP COMPLETED');
    console.log('═══════════════════════════════════════');
    console.log(`Total time: ${totalTime}s`);
    console.log(`\nMessages:`);
    console.log(`  Processed: ${messagesResult.processed.toLocaleString()}`);
    console.log(`  Cleaned: ${messagesResult.cleaned.toLocaleString()}`);
    console.log(`\nProperties:`);
    console.log(`  Processed: ${propertiesResult.processed.toLocaleString()}`);
    console.log(`  Cleaned: ${propertiesResult.cleaned.toLocaleString()}`);
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { cleanText, patterns };
