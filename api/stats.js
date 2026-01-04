module.exports = async (context) => {
  const { req, res, error } = context;
  const { getStats, isConfigured, getConfigError } = require('./lib_appwrite');

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

  try {
    const result = await getStats();
    if (!result.success) {
      return res.json({ error: result.error }, 500);
    }
    return res.json(result.data, 200, { 'Access-Control-Allow-Origin': '*' });
  } catch (err) {
    error('Stats endpoint error: ' + err.message);
    return res.json({ error: err.message }, 500);
  }
};
