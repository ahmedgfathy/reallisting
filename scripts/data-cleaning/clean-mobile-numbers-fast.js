const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://gxyrpboyubpycejlkxue.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd4eXJwYm95dWJweWNlamxreHVlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzEwNjU5OSwiZXhwIjoyMDgyNjgyNTk5fQ.jaQO9OmympAlJqrClhxQ-NFkmp74tB-IpRPqRf0eXvk'
);

async function cleanMobileNumbersFast() {
  console.log('Cleaning mobile numbers using SQL regex...\n');
  
  // First, check how many messages contain mobile numbers
  const { data: sampleData } = await supabase
    .from('messages')
    .select('id, message')
    .limit(5);
  
  console.log('Sample messages before cleaning:');
  sampleData?.forEach(m => {
    console.log(`  ID ${m.id}: ${m.message?.substring(0, 100)}...`);
  });
  
  // Use SQL to remove mobile numbers (01xxxxxxxxx pattern) from all messages at once
  const { data, error } = await supabase.rpc('exec_sql', {
    query: `
      UPDATE messages 
      SET message = REGEXP_REPLACE(message, '\\m01[0-9]{9}\\M', '', 'g')
      WHERE message ~ '\\m01[0-9]{9}\\M'
    `
  });
  
  if (error) {
    console.error('\nDirect SQL update not available. Using batch update...\n');
    await cleanWithBatchUpdate();
  } else {
    console.log('\n✓ Mobile numbers cleaned successfully!');
    
    // Show sample after
    const { data: afterData } = await supabase
      .from('messages')
      .select('id, message')
      .limit(5);
    
    console.log('\nSample messages after cleaning:');
    afterData?.forEach(m => {
      console.log(`  ID ${m.id}: ${m.message?.substring(0, 100)}...`);
    });
  }
}

async function cleanWithBatchUpdate() {
  console.log('Using optimized batch update method...\n');
  
  const BATCH_SIZE = 500;
  let offset = 0;
  let totalUpdated = 0;
  
  while (true) {
    const { data: messages, error } = await supabase
      .from('messages')
      .select('id, message')
      .range(offset, offset + BATCH_SIZE - 1);
    
    if (error || !messages || messages.length === 0) break;
    
    const updates = messages
      .filter(m => m.message && /\b01[0-9]{9}\b/.test(m.message))
      .map(m => ({
        id: m.id,
        message: m.message.replace(/\b01[0-9]{9}\b/g, '').replace(/\s+/g, ' ').trim()
      }));
    
    if (updates.length > 0) {
      for (const update of updates) {
        await supabase
          .from('messages')
          .update({ message: update.message })
          .eq('id', update.id);
      }
      totalUpdated += updates.length;
      console.log(`Processed ${offset + messages.length} messages, updated ${totalUpdated} so far...`);
    } else {
      console.log(`Processed ${offset + messages.length} messages (no updates needed)...`);
    }
    
    if (messages.length < BATCH_SIZE) break;
    offset += BATCH_SIZE;
  }
  
  console.log(`\n✓ Completed! Updated ${totalUpdated} messages`);
}

cleanMobileNumbersFast().catch(console.error);
