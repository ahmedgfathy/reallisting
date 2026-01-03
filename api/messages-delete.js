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

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { ids } = req.body || {};

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'Invalid request. Expected array of message IDs.' });
    }

    // Delete messages
    const { error } = await query(
      'DELETE FROM messages WHERE id = ANY($1::text[])',
      [ids]
    );

    if (error) {
      console.error('Delete error:', error);
      return res.status(500).json({ error });
    }

    // Get remaining count
    const { data: countRows, error: countError } = await query('SELECT COUNT(*)::int AS cnt FROM messages');
    if (countError) return res.status(500).json({ error: countError });

    res.status(200).json({
      success: true,
      deletedCount: ids.length,
      remainingMessages: countRows?.[0]?.cnt || 0
    });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ error: error.message });
  }
};
