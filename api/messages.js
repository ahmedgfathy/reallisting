const { supabase, corsHeaders, verifyToken } = require('./_lib/supabase');

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
    const { 
      page = 1, 
      limit = 50, 
      search = '', 
      category = '', 
      propertyType = '', 
      region = '', 
      purpose = '' 
    } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;

    // Check if user is authenticated and approved
    const authHeader = req.headers.authorization;
    let isApprovedUser = false;
    let userMobile = null;
    
    console.log('🔐 Auth header:', authHeader ? 'Present' : 'Missing');
    
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const payload = verifyToken(token);
      
      console.log('🎫 Token payload:', payload);
      
      if (payload && payload.username) {
        userMobile = payload.username;
        
        // Check if user is active
        const { data: userData } = await supabase
          .from('users')
          .select('is_active, role')
          .eq('mobile', userMobile)
          .single();
        
        console.log('👤 User data:', userData);
        
        if (userData) {
          // Admin is always approved, or check is_active for regular users
          isApprovedUser = userData.role === 'admin' || userData.is_active === true;
          console.log('✅ User approved:', isApprovedUser, '(role:', userData.role, ', is_active:', userData.is_active, ')');
        }
      }
    }
    
    console.log('🔑 Final isApprovedUser:', isApprovedUser);

    // Build query - join with sender table if user is approved
    let query;
    if (isApprovedUser) {
      // Approved users get sender info
      query = supabase
        .from('messages')
        .select(`
          *,
          sender:sender_id (
            id,
            name,
            mobile
          )
        `, { count: 'exact' });
    } else {
      // Non-approved users: no sender info
      query = supabase
        .from('messages')
        .select('*', { count: 'exact' });
    }

    // Apply filters
    if (category && category !== 'الكل') {
      query = query.eq('category', category);
    }
    if (propertyType && propertyType !== 'الكل') {
      query = query.eq('property_type', propertyType);
    }
    if (region && region !== 'الكل') {
      query = query.eq('region', region);
    }
    if (purpose && purpose !== 'الكل') {
      query = query.eq('purpose', purpose);
    }
    if (search) {
      if (isApprovedUser) {
        // Approved users can search sender info too
        query = query.or(`message.ilike.%${search}%,region.ilike.%${search}%,property_type.ilike.%${search}%`);
      } else {
        // Non-approved users: search only message content
        query = query.or(`message.ilike.%${search}%,region.ilike.%${search}%,property_type.ilike.%${search}%`);
      }
    }

    // Order and paginate
    // For 5th settlement (التجمع الخامس), prioritize properties with images
    const isFifthSettlement = region === 'التجمع الخامس';
    
    if (isFifthSettlement) {
      // Sort by: 1) has image first (non-null values last when descending), 2) created_at (DESC)
      // Using nullsLast: true ensures properties with images (non-null) come before nulls
      query = query
        .order('image_url', { nullsLast: true })
        .order('created_at', { ascending: false });
    } else {
      query = query
        .order('created_at', { ascending: false });
    }
    
    query = query.range(offset, offset + limitNum - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('❌ Supabase error:', error);
      return res.status(500).json({ error: error.message });
    }
    
    console.log('📦 Sample raw data (first item):', data?.[0]);
    console.log('📊 Sender info in first item:', data?.[0]?.sender);

    // Map column names to match frontend expectations
    const mappedData = (data || []).map(row => {
      const mapped = {
        id: row.id,
        name: isApprovedUser && row.sender ? row.sender.name : null,
        mobile: isApprovedUser && row.sender ? row.sender.mobile : 'N/A',
        message: row.message,
        dateOfCreation: row.date_of_creation,
        sourceFile: row.source_file,
        category: row.category,
        propertyType: row.property_type,
        region: row.region,
        purpose: row.purpose,
        imageUrl: row.image_url
      };
      return mapped;
    });
    
    console.log('📤 Sample mapped data (first item):', mappedData[0]);

    res.status(200).json({
      total: count || 0,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil((count || 0) / limitNum),
      data: mappedData
    });
  } catch (error) {
    console.error('API error:', error);
    res.status(500).json({ error: error.message });
  }
};
