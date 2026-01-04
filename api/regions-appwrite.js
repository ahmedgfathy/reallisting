const { getRegions, corsHeaders, isConfigured, getConfigError } = require('../lib/appwrite');

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
    const result = await getRegions();
    
    if (!result.success) {
      return res.status(500).json({ error: result.error });
    }

    // Format regions data
    const regions = result.data.map(r => ({
      region: r.name || r.nameAr,
      count: r.count || 0
    }));

    return res.status(200).json({ data: regions });
  } catch (error) {
    console.error('Regions endpoint error:', error);
    return res.status(500).json({ error: error.message });
  }
};
