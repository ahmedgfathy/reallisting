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

    // Legacy frontend expects a flat array of strings, sorted specifically
    const regionNames = result.data.map(r => r.name || r.nameAr).filter(Boolean);

    // Sort regions - put الحي numbers first, then مجاورة, then named areas, then أخرى at the end
    const sortedRegions = regionNames.sort((a, b) => {
      if (a === 'أخرى') return 1;
      if (b === 'أخرى') return -1;

      const aIsHayy = a && a.startsWith('الحي');
      const bIsHayy = b && b.startsWith('الحي');
      const aIsMug = a && a.startsWith('مجاورة');
      const bIsMug = b && b.startsWith('مجاورة');

      if (aIsHayy && !bIsHayy) return -1;
      if (!aIsHayy && bIsHayy) return 1;
      if (aIsMug && !bIsMug) return -1;
      if (!aIsMug && bIsMug) return 1;

      // Extract numbers for numeric sorting
      const aNum = parseInt((a || '').match(/\d+/)?.[0] || '999');
      const bNum = parseInt((b || '').match(/\d+/)?.[0] || '999');

      if (aIsHayy && bIsHayy) return aNum - bNum;
      if (aIsMug && bIsMug) return aNum - bNum;

      return (a || '').localeCompare(b || '', 'ar');
    });

    res.status(200).json(sortedRegions);
  } catch (error) {
    console.error('Regions endpoint error:', error);
    return res.status(500).json({ error: error.message });
  }
};
