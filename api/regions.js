const { supabase, corsHeaders } = require('./_lib/supabase');

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

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get unique regions
    const { data, error } = await supabase
      .from('messages')
      .select('region')
      .not('region', 'is', null);

    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({ error: error.message });
    }

    // Get unique regions
    const regions = [...new Set((data || []).map(row => row.region))];
    
    // Sort regions - put الحي numbers first, then مجاورة, then named areas, then أخرى at the end
    const sortedRegions = regions.sort((a, b) => {
      if (a === 'أخرى') return 1;
      if (b === 'أخرى') return -1;
      
      const aIsHayy = a.startsWith('الحي');
      const bIsHayy = b.startsWith('الحي');
      const aIsMug = a.startsWith('مجاورة');
      const bIsMug = b.startsWith('مجاورة');
      
      if (aIsHayy && !bIsHayy) return -1;
      if (!aIsHayy && bIsHayy) return 1;
      if (aIsMug && !bIsMug) return -1;
      if (!aIsMug && bIsMug) return 1;
      
      // Extract numbers for numeric sorting
      const aNum = parseInt(a.match(/\d+/)?.[0] || '999');
      const bNum = parseInt(b.match(/\d+/)?.[0] || '999');
      
      if (aIsHayy && bIsHayy) return aNum - bNum;
      if (aIsMug && bIsMug) return aNum - bNum;
      
      return a.localeCompare(b, 'ar');
    });

    res.status(200).json(sortedRegions);
  } catch (error) {
    console.error('API error:', error);
    res.status(500).json({ error: error.message });
  }
};
