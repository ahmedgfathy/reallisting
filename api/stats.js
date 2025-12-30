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

    res.status(200).json({
      totalMessages: count || 0,
      totalFiles: 0,
      files: []
    });
  } catch (error) {
    console.error('API error:', error);
    res.status(500).json({ error: error.message });
  }
};
