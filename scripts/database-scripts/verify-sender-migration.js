const { query } = require('../../lib/database');

/**
 * Verify the sender table migration
 */
async function verifyMigration() {
  console.log('🔍 Verifying sender table migration...\n');
  
  try {
    // Check if sender table exists
    const { data: senders, error: senderError } = await query('SELECT * FROM sender LIMIT 5');
    
    if (senderError) {
      console.error('❌ Sender table not found or error accessing it:');
      console.error(senderError);
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
    const { data: senderCountRows } = await query('SELECT COUNT(*)::int AS cnt FROM sender');
    const senderCount = senderCountRows?.[0]?.cnt || 0;
    
    console.log(`\n📊 Total senders: ${senderCount.toLocaleString()}`);
    
    // Check messages with sender_id
    const { data: messagesWithSender, error: msgError } = await query(
      'SELECT id, sender_id, mobile, message FROM messages WHERE sender_id IS NOT NULL LIMIT 5'
    );
    
    if (!msgError) {
      console.log(`\n✅ Messages linked to senders (sample):`);
      messagesWithSender?.forEach(m => {
        console.log(`   - Message ID: ${m.id}, Sender ID: ${m.sender_id}`);
      });
    }
    
    // Count messages with and without sender
    const { data: withSenderRows } = await query('SELECT COUNT(*)::int AS cnt FROM messages WHERE sender_id IS NOT NULL');
    const { data: totalMessagesRows } = await query('SELECT COUNT(*)::int AS cnt FROM messages');

    const withSender = withSenderRows?.[0]?.cnt || 0;
    const totalMessages = totalMessagesRows?.[0]?.cnt || 0;

    const withoutSender = totalMessages - withSender;
    const percentage = totalMessages ? ((withSender / totalMessages) * 100).toFixed(1) : '0.0';
    
    console.log(`\n📈 Message Statistics:`);
    console.log(`   Total messages: ${totalMessages?.toLocaleString()}`);
    console.log(`   With sender: ${withSender?.toLocaleString()} (${percentage}%)`);
    console.log(`   Without sender: ${withoutSender?.toLocaleString()}`);
    
    // Check messages_with_sender view
    const { data: viewData, error: viewError } = await query(
      'SELECT id, message, sender_name, sender_mobile FROM messages_with_sender LIMIT 3'
    );
    
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
    const { data: messages, error } = await query(
      'SELECT id, message, mobile, name, date_of_creation FROM messages WHERE sender_id IS NULL LIMIT 1000'
    );
    
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
        const { data: existingSender } = await query(
          'SELECT id FROM sender WHERE mobile = $1 LIMIT 1',
          [mobile]
        );
        let senderId = existingSender?.[0]?.id;
        
        // If not exists, create
        if (!senderId) {
          const { data: newSender, error: insertError } = await query(
            'INSERT INTO sender (mobile, name, first_seen_date, first_seen_time) VALUES ($1, $2, $3, $4) RETURNING id',
            [mobile, msg.name || null, msg.date_of_creation, msg.date_of_creation?.split(' ')[1] || null]
          );
          
          if (!insertError && newSender) {
            senderId = newSender[0].id;
            extracted++;
          }
        }
        
        // Link message to sender
        if (senderId) {
          await query('UPDATE messages SET sender_id = $1 WHERE id = $2', [senderId, msg.id]);
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
