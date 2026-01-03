const { supabase, corsHeaders, isConfigured, getConfigError } = require('../lib/supabase');

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

  // Check if Supabase is configured
  if (!isConfigured()) {
    return res.status(500).json(getConfigError());
  }

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

    // Get unique senders count from sender table
    const { count: sendersCount, error: sendersError } = await supabase
      .from('sender')
      .select('*', { count: 'exact', head: true });
    
    if (sendersError) {
      console.error('Supabase error:', sendersError);
      return res.status(500).json({ error: sendersError.message });
    }

    // Get active subscribers count
    const { count: subscribersCount, error: subError } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    res.status(200).json({
      totalMessages: count || 0,
      totalFiles: sendersCount || 0,
      totalSubscribers: subscribersCount || 0,
      files: []
    });
  } catch (error) {
    console.error('API error:', error);
    res.status(500).json({ error: error.message });
  }
};
