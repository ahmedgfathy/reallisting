const { query, corsHeaders, isConfigured, getConfigError } = require('../lib/database');

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

  // Check if database is configured
  if (!isConfigured()) {
    return res.status(500).json(getConfigError());
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get total count
    const [{ data: messageCountRows, error: messageError }, { data: senderCountRows, error: senderError }, { data: subscriberCountRows, error: subscriberError }] = await Promise.all([
      query('SELECT COUNT(*)::int AS cnt FROM messages'),
      query('SELECT COUNT(*)::int AS cnt FROM sender'),
      query("SELECT COUNT(*)::int AS cnt FROM users WHERE is_active = true")
    ]);

    if (messageError || senderError || subscriberError) {
      console.error('Database error:', messageError || senderError || subscriberError);
      return res.status(500).json({ error: messageError || senderError || subscriberError });
    }

    res.status(200).json({
      totalMessages: messageCountRows?.[0]?.cnt || 0,
      totalFiles: senderCountRows?.[0]?.cnt || 0,
      totalSubscribers: subscriberCountRows?.[0]?.cnt || 0,
      files: []
    });
  } catch (error) {
    console.error('API error:', error);
    res.status(500).json({ error: error.message });
  }
};
