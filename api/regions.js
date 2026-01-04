module.exports = async (context) => {
  const { req, res, error } = context;
  const { getRegions, isConfigured, getConfigError } = require('./lib_appwrite');

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
    const result = await getRegions();
    if (!result.success) {
      return res.json({ error: result.error }, 500);
    }

    const regionNames = result.data.map(r => r.name || r.nameAr).filter(Boolean);

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

    return res.json(sortedRegions, 200, { 'Access-Control-Allow-Origin': '*' });
  } catch (err) {
    error('Regions endpoint error: ' + err.message);
    return res.json({ error: err.message }, 500);
  }
};
