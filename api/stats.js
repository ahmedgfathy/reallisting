const { supabase, corsHeaders } = require('./_lib/supabase');

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

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get total count
    const { count, error } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true });

    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({ error: error.message });
    }

    // Get unique senders (mobile)
    let uniqueMobiles = new Set();
    let offset = 0;
    const pageSize = 10000;
    let hasMore = true;
    while (hasMore) {
      const { data: batch, error: batchError } = await supabase
        .from('messages')
        .select('mobile')
        .range(offset, offset + pageSize - 1);
      if (batchError) {
        console.error('Supabase error:', batchError);
        return res.status(500).json({ error: batchError.message });
      }
      if (!batch || batch.length === 0) break;
      for (const row of batch) {
        if (row.mobile) uniqueMobiles.add(row.mobile.trim());
      }
      if (batch.length < pageSize) hasMore = false;
      offset += pageSize;
    }

    // Get active subscribers count
    const { count: subscribersCount, error: subError } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    res.status(200).json({
      totalMessages: count || 0,
      totalFiles: uniqueMobiles.size,
      totalSubscribers: subscribersCount || 0,
      files: []
    });
  } catch (error) {
    console.error('API error:', error);
    res.status(500).json({ error: error.message });
  }
};
