module.exports = async (context) => {
  const { req, res, error } = context;
  const { deleteMessages, isConfigured, getConfigError } = require('./lib_appwrite');

  if (req.method === 'OPTIONS') {
    return res.text('', 200, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    });
  }

  if (!isConfigured()) {
    return res.json(getConfigError(), 500);
  }

  if (req.method !== 'POST') {
    return res.json({ error: 'Method not allowed' }, 405);
  }

  try {
    const { ids } = req.body || {};

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.json({ error: 'Invalid request. Expected array of message IDs.' }, 400);
    }

    const result = await deleteMessages(ids);

    if (!result.success) {
      return res.json({ error: result.error }, 500);
    }

    const statsResult = await getStats();
    const remaining = statsResult.success ? statsResult.data.totalMessages : 0;

    return res.json({
      success: true,
      deletedCount: ids.length,
      remainingMessages: remaining
    }, 200, { 'Access-Control-Allow-Origin': '*' });
  } catch (err) {
    error('Delete error: ' + err.message);
    return res.json({ error: err.message }, 500);
  }
};
