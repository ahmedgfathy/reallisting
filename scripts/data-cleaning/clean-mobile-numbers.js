const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://gxyrpboyubpycejlkxue.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd4eXJwYm95dWJweWNlamxreHVlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzEwNjU5OSwiZXhwIjoyMDgyNjgyNTk5fQ.jaQO9OmympAlJqrClhxQ-NFkmp74tB-IpRPqRf0eXvk'
);

// Regex to match Egyptian mobile numbers (01xxxxxxxxx format)
const MOBILE_REGEX = /\b(01[0-9]{9})\b/g;

async function cleanMobileNumbers() {
  console.log('Fetching all messages...');
  
  let allMessages = [];
  let page = 0;
  const pageSize = 1000;
  
  while (true) {
    const { data, error } = await supabase
      .from('messages')
      .select('id, message, mobile')
      .range(page * pageSize, (page + 1) * pageSize - 1);
    
    if (error) {
      console.error('Error fetching messages:', error);
      break;
    }
    
    if (!data || data.length === 0) break;
    
    allMessages = allMessages.concat(data);
    console.log(`Fetched ${allMessages.length} messages...`);
    
    if (data.length < pageSize) break;
    page++;
  }
  
  console.log(`\nTotal messages: ${allMessages.length}`);
  console.log('Cleaning mobile numbers from content...\n');
  
  let updatedCount = 0;
  let batchUpdates = [];
  
  for (const msg of allMessages) {
    if (!msg.message) continue;
    
    const originalMessage = msg.message;
    let cleanedMessage = originalMessage;
    
    // Find all mobile numbers in message
    const mobileMatches = originalMessage.match(MOBILE_REGEX);
    
    if (mobileMatches && mobileMatches.length > 0) {
      // Remove all mobile numbers from message
      cleanedMessage = originalMessage.replace(MOBILE_REGEX, '').trim();
      
      // Clean up multiple spaces
      cleanedMessage = cleanedMessage.replace(/\s+/g, ' ').trim();
      
      if (cleanedMessage !== originalMessage) {
        batchUpdates.push({
          id: msg.id,
          message: cleanedMessage
        });
        
        updatedCount++;
        
        if (updatedCount <= 5) {
          console.log(`Message ${msg.id}:`);
          console.log(`  Sender: ${msg.mobile}`);
          console.log(`  Found mobile numbers: ${mobileMatches.join(', ')}`);
          console.log(`  Before: ${originalMessage.substring(0, 100)}...`);
          console.log(`  After: ${cleanedMessage.substring(0, 100)}...`);
          console.log('');
        }
      }
    }
    
    // Update in batches of 100
    if (batchUpdates.length >= 100) {
      await updateBatch(batchUpdates);
      batchUpdates = [];
    }
  }
  
  // Update remaining
  if (batchUpdates.length > 0) {
    await updateBatch(batchUpdates);
  }
  
  console.log(`\n✓ Completed! Updated ${updatedCount} messages`);
}

async function updateBatch(updates) {
  for (const update of updates) {
    const { error } = await supabase
      .from('messages')
      .update({ message: update.message })
      .eq('id', update.id);
    
    if (error) {
      console.error(`Error updating message ${update.id}:`, error);
    }
  }
  console.log(`Updated batch of ${updates.length} messages...`);
}

cleanMobileNumbers().catch(console.error);
