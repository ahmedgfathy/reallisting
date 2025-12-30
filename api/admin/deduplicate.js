const { supabase, verifyToken, corsHeaders } = require('../_lib/supabase');

module.exports = async (req, res) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.status(200).end();
  }

  Object.entries(corsHeaders).forEach(([key, value]) => {
    res.setHeader(key, value);
  });

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify admin token
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const payload = verifyToken(token);
  if (!payload || payload.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  try {
    console.log('Starting deduplication process...');

    // Step 1: Get all messages
    const { data: allMessages, error: fetchError } = await supabase
      .from('messages')
      .select('id, name, mobile, message')
      .order('created_at', { ascending: true }); // Keep oldest

    if (fetchError) {
      console.error('Error fetching messages:', fetchError);
      return res.status(500).json({ error: fetchError.message });
    }

    console.log(`Total messages: ${allMessages.length}`);

    // Step 2: Find duplicates (same name + mobile + message)
    const seen = new Map();
    const duplicateIds = [];

    for (const msg of allMessages) {
      // Create a unique key from name, mobile, and message
      const key = `${(msg.name || '').trim()}|${(msg.mobile || '').trim()}|${(msg.message || '').trim()}`;
      
      if (seen.has(key)) {
        // This is a duplicate - mark for deletion
        duplicateIds.push(msg.id);
      } else {
        // First occurrence - keep it
        seen.set(key, msg.id);
      }
    }

    console.log(`Found ${duplicateIds.length} duplicates to remove`);

    // Step 3: Delete duplicates in batches
    let deletedCount = 0;
    const batchSize = 100;

    for (let i = 0; i < duplicateIds.length; i += batchSize) {
      const batch = duplicateIds.slice(i, i + batchSize);
      
      const { error: deleteError } = await supabase
        .from('messages')
        .delete()
        .in('id', batch);

      if (deleteError) {
        console.error('Error deleting batch:', deleteError);
        return res.status(500).json({ 
          error: deleteError.message,
          deletedSoFar: deletedCount
        });
      }

      deletedCount += batch.length;
      console.log(`Deleted ${deletedCount} of ${duplicateIds.length} duplicates`);
    }

    // Step 4: Get new total count
    const { count: newTotal, error: countError } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true });

    const report = {
      success: true,
      originalCount: allMessages.length,
      duplicatesFound: duplicateIds.length,
      duplicatesRemoved: deletedCount,
      newTotalCount: newTotal || (allMessages.length - deletedCount),
      message: `تم حذف ${deletedCount} رسالة مكررة بنجاح`
    };

    console.log('Deduplication complete:', report);
    return res.status(200).json(report);

  } catch (error) {
    console.error('Deduplication error:', error);
    return res.status(500).json({ error: error.message });
  }
};
