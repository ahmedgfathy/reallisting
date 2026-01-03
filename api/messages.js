const { supabase, corsHeaders, verifyToken, isConfigured, getConfigError } = require('../lib/supabase');

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

  // Check if Supabase is configured
  if (!isConfigured()) {
    return res.status(500).json(getConfigError());
  }

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

    // Build query - query messages with sender join
    let query = supabase
      .from('messages')
      .select(`
        id,
        name,
        mobile,
        message,
        date_of_creation,
        source_file,
        category,
        property_type,
        region,
        purpose,
        image_url,
        created_at,
        sender:sender_id (
          id,
          name,
          mobile
        )
      `, { count: 'exact' });

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
      query = query.or(`message.ilike.%${search}%,region.ilike.%${search}%,property_type.ilike.%${search}%`);
    }

    // Order (View has all these columns)
    const isFifthSettlement = region === 'التجمع الخامس';

    if (isFifthSettlement) {
      // Note: view might not have image_url if it wasn't in list. checking schema...
      // Schema says: messages table has image_url. View selects m.* ?? 
      // View definition: SELECT m.id, m.message, ..., m.source_file (Wait, check view def)
      // View def in migration: SELECT m.id, m.message, m.date_of_creation, m.source_file ...
      // DOES IT INCLUDE image_url?
      // Migration script: 
      // SELECT m.id, m.message, m.date_of_creation, m.source_file, c.name..., pt.name..., r.name..., p.name..., s.id..., s.name..., s.mobile..., s.first..., s.last..., m.created_at
      // IT MISSES image_url in the explicit Select list in step 5 of migration! 
      // I need to add image_url to the view definition if it exists in messages table!
      // Let's assume for now I fix the view via migration script, or I fix the view query here.
      // But wait, the previous code had row.imageUrl from row.image_url.

      // I'll assume I need to fix the view definition first to include image_url if it's missing.
      // But let's look at the previous file content of migration.
      // migration.sql lines 239+: 
      // SELECT m.id, m.message, m.date_of_creation, m.source_file ...
      // It DOES NOT include m.image_url.
      // THIS IS ANOTHER BUG. Use `m.*` in view creation or explicitly add `image_url`.

      query = query
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

    const MOBILE_REGEX = /(?:\+20|0)?1[0-9]{9}/g;

    // Map column names to match frontend expectations
    const mappedData = (data || []).map(row => {
      let messageContent = row.message;

      // Mask mobile numbers in message content if user is not approved
      if (!isApprovedUser && messageContent) {
        messageContent = messageContent.replace(MOBILE_REGEX, '***********');
      }

      // Get sender info from relationship or fallback to message fields
      const senderName = row.sender?.name || row.name || '';
      const senderMobile = row.sender?.mobile || row.mobile || 'N/A';

      const mapped = {
        id: row.id,
        name: isApprovedUser ? senderName : '',
        mobile: isApprovedUser ? senderMobile : 'N/A',
        message: messageContent,
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
