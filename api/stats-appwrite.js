const { getStats, corsHeaders, isConfigured, getConfigError } = require('../lib/appwrite');

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

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const result = await getStats();
    
    if (!result.success) {
      return res.status(500).json({ error: result.error });
    }

    return res.status(200).json(result.data);
  } catch (error) {
    console.error('Stats endpoint error:', error);
    return res.status(500).json({ error: error.message });
  }
};
