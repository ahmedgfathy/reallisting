const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://gxyrpboyubpycejlkxue.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd4eXJwYm95dWJweWNlamxreHVlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzEwNjU5OSwiZXhwIjoyMDgyNjgyNTk5fQ.jaQO9OmympAlJqrClhxQ-NFkmp74tB-IpRPqRf0eXvk'
);

async function cleanAllMobileNumbers() {
  console.log('🚀 Ultra-fast mobile number cleanup starting...\n');
  
  const BATCH_SIZE = 1000;
  const PARALLEL_UPDATES = 50; // Update 50 messages at once
  let offset = 0;
  let totalCleaned = 0;
  let totalProcessed = 0;
  const startTime = Date.now();

  while (true) {
    // Fetch batch
    const { data: messages, error } = await supabase
      .from('messages')
      .select('id, message')
      .range(offset, offset + BATCH_SIZE - 1);

    if (error || !messages || messages.length === 0) break;

    // Filter messages with mobile numbers
    const mobileRegex = /\b01[0-9]{9}\b/g;
    const toUpdate = messages
      .filter(m => m.message && mobileRegex.test(m.message))
      .map(m => ({
        id: m.id,
        message: m.message.replace(mobileRegex, '').replace(/\s+/g, ' ').trim()
      }));

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
    const remaining = 70000 - totalProcessed; // Estimate
    const eta = Math.round(remaining / rate);
    
    console.log(
      `Processed: ${totalProcessed.toLocaleString()} | ` +
      `Cleaned: ${totalCleaned.toLocaleString()} | ` +
      `Speed: ${rate}/s | ` +
      `ETA: ${eta}s`
    );

    if (messages.length < BATCH_SIZE) break;
    offset += BATCH_SIZE;
  }

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
  
  console.log('\n✅ COMPLETED!');
  console.log(`Total processed: ${totalProcessed.toLocaleString()} messages`);
  console.log(`Total cleaned: ${totalCleaned.toLocaleString()} messages`);
  console.log(`Time: ${totalTime}s`);
  console.log(`Average speed: ${Math.round(totalProcessed / totalTime)}/s`);
}

cleanAllMobileNumbers().catch(console.error);
