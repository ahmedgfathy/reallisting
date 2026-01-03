const { createClient } = require('@supabase/supabase-js');

// Use environment variables if available
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://gxyrpboyubpycejlkxue.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd4eXJwYm95dWJweWNlamxreHVlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzEwNjU5OSwiZXhwIjoyMDgyNjgyNTk5fQ.jaQO9OmympAlJqrClhxQ-NFkmp74tB-IpRPqRf0eXvk';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

/**
 * Verify the sender table migration
 */
async function verifyMigration() {
  console.log('🔍 Verifying sender table migration...\n');
  
  try {
    // Check if sender table exists
    const { data: senders, error: senderError } = await supabase
      .from('sender')
      .select('*')
      .limit(5);
    
    if (senderError) {
      console.error('❌ Sender table not found or error accessing it:');
      console.error(senderError.message);
      console.log('\n💡 Run the migration SQL first:');
      console.log('   scripts/database-scripts/create-sender-table-migration.sql\n');
      return false;
    }
    
    console.log('✅ Sender table exists');
    console.log(`   Sample senders (first 5):`);
    senders?.forEach(s => {
      console.log(`   - ID: ${s.id}, Mobile: ${s.mobile}, Name: ${s.name || 'N/A'}`);
    });
    
    // Check sender count
    const { count: senderCount } = await supabase
      .from('sender')
      .select('*', { count: 'exact', head: true });
    
    console.log(`\n📊 Total senders: ${senderCount?.toLocaleString()}`);
    
    // Check messages with sender_id
    const { data: messagesWithSender, error: msgError } = await supabase
      .from('messages')
      .select('id, sender_id, mobile, message')
      .not('sender_id', 'is', null)
      .limit(5);
    
    if (!msgError) {
      console.log(`\n✅ Messages linked to senders (sample):`);
      messagesWithSender?.forEach(m => {
        console.log(`   - Message ID: ${m.id}, Sender ID: ${m.sender_id}`);
      });
    }
    
    // Count messages with and without sender
    const { count: withSender } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .not('sender_id', 'is', null);
    
    const { count: totalMessages } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true });
    
    const withoutSender = totalMessages - withSender;
    const percentage = ((withSender / totalMessages) * 100).toFixed(1);
    
    console.log(`\n📈 Message Statistics:`);
    console.log(`   Total messages: ${totalMessages?.toLocaleString()}`);
    console.log(`   With sender: ${withSender?.toLocaleString()} (${percentage}%)`);
    console.log(`   Without sender: ${withoutSender?.toLocaleString()}`);
    
    // Check messages_with_sender view
    const { data: viewData, error: viewError } = await supabase
      .from('messages_with_sender')
      .select('*')
      .limit(3);
    
    if (!viewError) {
      console.log(`\n✅ messages_with_sender view works`);
      console.log(`   Sample joined data (3 rows):`);
      viewData?.forEach(v => {
        console.log(`   - Message: "${v.message?.substring(0, 50)}..."`);
        console.log(`     Sender: ${v.sender_name || 'N/A'} (${v.sender_mobile || 'N/A'})`);
      });
    }
    
    console.log('\n═══════════════════════════════════════');
    console.log('✅ MIGRATION VERIFICATION COMPLETE');
    console.log('═══════════════════════════════════════\n');
    
    return true;
    
  } catch (error) {
    console.error('❌ Error during verification:', error);
    return false;
  }
}

/**
 * Extract phone numbers from messages that don't have sender yet
 */
async function extractMissingSenders() {
  console.log('🔍 Extracting senders from messages without sender_id...\n');
  
  try {
    // Get messages without sender
    const { data: messages, error } = await supabase
      .from('messages')
      .select('id, message, mobile, name, date_of_creation')
      .is('sender_id', null)
      .limit(1000);
    
    if (error) {
      console.error('Error fetching messages:', error);
      return;
    }
    
    console.log(`Found ${messages?.length || 0} messages without sender\n`);
    
    let extracted = 0;
    let linked = 0;
    
    for (const msg of messages || []) {
      // Try to extract Egyptian mobile from message content
      const mobileMatch = msg.message?.match(/\b01[0-9]{9}\b/);
      const mobile = mobileMatch?.[0] || msg.mobile;
      
      if (mobile && mobile !== 'N/A' && mobile.length >= 10) {
        // Check if sender exists
        let { data: sender } = await supabase
          .from('sender')
          .select('id')
          .eq('mobile', mobile)
          .single();
        
        // If not exists, create
        if (!sender) {
          const { data: newSender, error: insertError } = await supabase
            .from('sender')
            .insert({
              mobile: mobile,
              name: msg.name || null,
              first_seen_date: msg.date_of_creation,
              first_seen_time: msg.date_of_creation?.split(' ')[1]
            })
            .select('id')
            .single();
          
          if (!insertError && newSender) {
            sender = newSender;
            extracted++;
          }
        }
        
        // Link message to sender
        if (sender) {
          await supabase
            .from('messages')
            .update({ sender_id: sender.id })
            .eq('id', msg.id);
          linked++;
        }
      }
      
      if ((extracted + linked) % 100 === 0) {
        console.log(`Progress: ${extracted} new senders, ${linked} messages linked`);
      }
    }
    
    console.log(`\n✅ Extraction complete:`);
    console.log(`   New senders created: ${extracted}`);
    console.log(`   Messages linked: ${linked}\n`);
    
  } catch (error) {
    console.error('❌ Error during extraction:', error);
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('╔═══════════════════════════════════════╗');
  console.log('║  SENDER TABLE MIGRATION VERIFICATION  ║');
  console.log('╚═══════════════════════════════════════╝\n');
  
  const migrationExists = await verifyMigration();
  
  if (migrationExists) {
    console.log('🔄 Would you like to extract more senders from unlinked messages?');
    console.log('   (This will process messages without sender_id)\n');
    
    // Uncomment to run extraction automatically:
    // await extractMissingSenders();
    
    console.log('💡 To extract more senders, uncomment the line in main() function\n');
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { verifyMigration, extractMissingSenders };
