const { supabase, corsHeaders } = require('./_lib/supabase');

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

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Use the PostgreSQL function for efficient distinct regions
    const { data, error } = await supabase.rpc('get_distinct_regions');

    if (error) {
      console.error('Supabase RPC error:', error);
      // Fallback: try direct query if RPC fails
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('messages')
        .select('region');
      
      if (fallbackError) {
        return res.status(500).json({ error: fallbackError.message });
      }
      
      const uniqueRegions = [...new Set((fallbackData || []).map(r => r.region).filter(Boolean))];
      return res.status(200).json(uniqueRegions);
    }

    const regions = (data || []).map(r => r.region).filter(Boolean);

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
