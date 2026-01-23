const { regions, corsHeaders } = require('../lib/database');

module.exports = async (req, res) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    Object.entries(corsHeaders).forEach(([key, value]) => {
      res.setHeader(key, value);
    });
    return res.status(200).end();
  }

  Object.entries(corsHeaders).forEach(([key, value]) => {
    res.setHeader(key, value);
  });

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const allRegions = await regions.getAll();

    const regionNames = allRegions.map(r => r.name).filter(Boolean);

    const sortedRegions = regionNames.sort((a, b) => {
      if (a === 'أخرى') return 1;
      if (b === 'أخرى') return -1;
      const aIsHayy = a && a.startsWith('الحي');
      const bIsHayy = b && b.startsWith('الحي');
      const aNum = parseInt((a || '').match(/\d+/)?.[0] || '999');
      const bNum = parseInt((b || '').match(/\d+/)?.[0] || '999');
      if (aIsHayy && bIsHayy) return aNum - bNum;
      return (a || '').localeCompare(b || '', 'ar');
    });

    return res.status(200).json(sortedRegions);
  } catch (error) {
    console.error('Regions error:', error);
    return res.status(500).json({ error: 'Failed to fetch regions' });
  }
};
