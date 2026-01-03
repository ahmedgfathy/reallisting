const { supabase, verifyToken, corsHeaders } = require('./_lib/supabase');

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

  try {
    const { ids } = req.body || {};

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'Invalid request. Expected array of message IDs.' });
    }

    // Delete messages
    const { error } = await supabase
      .from('messages')
      .delete()
      .in('id', ids);

    if (error) {
      console.error('Delete error:', error);
      return res.status(500).json({ error: error.message });
    }

    // Get remaining count
    const { count } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true });

    res.status(200).json({
      success: true,
      deletedCount: ids.length,
      remainingMessages: count || 0
    });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ error: error.message });
  }
};
