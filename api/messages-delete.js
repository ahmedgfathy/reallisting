const { deleteMessages, getStats, corsHeaders, isConfigured, getConfigError } = require('../lib/appwrite');

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') {
    Object.entries(corsHeaders).forEach(([k, v]) => res.setHeader(k, v));
    return res.status(200).end();
  }
  Object.entries(corsHeaders).forEach(([k, v]) => res.setHeader(k, v));

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

    const result = await deleteMessages(ids);

    if (!result.success) {
      return res.status(500).json({ error: result.error });
    }

    // Get remaining count
    const statsResult = await getStats();
    const remaining = statsResult.success ? statsResult.data.totalMessages : 0;

    res.status(200).json({
      success: true,
      deletedCount: ids.length,
      remainingMessages: remaining
    });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ error: error.message });
  }
};
