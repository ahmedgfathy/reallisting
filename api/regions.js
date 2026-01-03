const { query, corsHeaders, isConfigured, getConfigError } = require('../lib/database');

// Regions API - Returns all distinct regions from Supabase
module.exports = async (req, res) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.status(200).end();
  }

  // Set CORS headers
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
    // Query the normalized regions table directly
    const { data: regionsData, error } = await query('SELECT name FROM regions ORDER BY name');

    if (error) {
      console.error('Database error:', error);
      return res.status(500).json({ error });
    }

    const regions = (regionsData || []).map(r => r.name).filter(Boolean);

    // Sort regions - put الحي numbers first, then مجاورة, then named areas, then أخرى at the end
    const sortedRegions = regions.sort((a, b) => {
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
    console.error('API error:', error);
    res.status(500).json({ error: error.message });
  }
};
