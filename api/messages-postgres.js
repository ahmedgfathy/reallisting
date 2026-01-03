const { query, corsHeaders, verifyToken, isConfigured, getConfigError } = require('../lib/database');

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

  // Check if database is configured
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
        const { data: userData } = await query(
          'SELECT is_active, role FROM users WHERE mobile = $1',
          [userMobile]
        );

        console.log('👤 User data:', userData?.[0]);

        if (userData && userData.length > 0) {
          const user = userData[0];
          isApprovedUser = user.role === 'admin' || user.is_active === true;
          console.log('✅ User approved:', isApprovedUser, '(role:', user.role, ', is_active:', user.is_active, ')');
        }
      }
    }

    console.log('🔑 Final isApprovedUser:', isApprovedUser);

    // Build SQL query
    let sql = `
      SELECT 
        m.id,
        m.message,
        m.date_of_creation,
        m.source_file,
        m.image_url,
        c.name as category,
        pt.name as property_type,
        r.name as region,
        p.name as purpose,
        s.id as sender_id,
        s.name as sender_name,
        s.mobile as sender_mobile,
        m.created_at
      FROM messages m
      LEFT JOIN sender s ON m.sender_id = s.id
      LEFT JOIN regions r ON m.region_id = r.id
      LEFT JOIN property_types pt ON m.property_type_id = pt.id
      LEFT JOIN categories c ON m.category_id = c.id
      LEFT JOIN purposes p ON m.purpose_id = p.id
      WHERE 1=1
    `;

    const params = [];
    let paramIndex = 1;

    // Apply filters
    if (category && category !== 'الكل') {
      sql += ` AND c.name = $${paramIndex}`;
      params.push(category);
      paramIndex++;
    }
    if (propertyType && propertyType !== 'الكل') {
      sql += ` AND pt.name = $${paramIndex}`;
      params.push(propertyType);
      paramIndex++;
    }
    if (region && region !== 'الكل') {
      sql += ` AND r.name = $${paramIndex}`;
      params.push(region);
      paramIndex++;
    }
    if (purpose && purpose !== 'الكل') {
      sql += ` AND p.name = $${paramIndex}`;
      params.push(purpose);
      paramIndex++;
    }
    if (search) {
      sql += ` AND (m.message ILIKE $${paramIndex} OR r.name ILIKE $${paramIndex} OR pt.name ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    // Order
    const isFifthSettlement = region === 'التجمع الخامس';
    if (isFifthSettlement) {
      sql += ` ORDER BY m.image_url IS NOT NULL DESC, m.created_at DESC`;
    } else {
      sql += ` ORDER BY m.created_at DESC`;
    }

    // Get total count
    const countSql = `
      SELECT COUNT(*) as count
      FROM messages m
      LEFT JOIN regions r ON m.region_id = r.id
      LEFT JOIN property_types pt ON m.property_type_id = pt.id
      LEFT JOIN categories c ON m.category_id = c.id
      LEFT JOIN purposes p ON m.purpose_id = p.id
      WHERE 1=1
      ${category && category !== 'الكل' ? `AND c.name = $${params.indexOf(category) + 1}` : ''}
      ${propertyType && propertyType !== 'الكل' ? `AND pt.name = $${params.indexOf(propertyType) + 1}` : ''}
      ${region && region !== 'الكل' ? `AND r.name = $${params.indexOf(region) + 1}` : ''}
      ${purpose && purpose !== 'الكل' ? `AND p.name = $${params.indexOf(purpose) + 1}` : ''}
      ${search ? `AND (m.message ILIKE $${params.indexOf(`%${search}%`) + 1} OR r.name ILIKE $${params.indexOf(`%${search}%`) + 1} OR pt.name ILIKE $${params.indexOf(`%${search}%`) + 1})` : ''}
    `;

    const { data: countData } = await query(countSql, params);
    const totalCount = parseInt(countData?.[0]?.count || 0);

    // Add pagination
    sql += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limitNum, offset);

    const { data, error } = await query(sql, params);

    if (error) {
      console.error('❌ Database error:', error);
      return res.status(500).json({ error });
    }

    const MOBILE_REGEX = /(?:\+20|0)?1[0-9]{9}/g;

    // Map column names to match frontend expectations
    const mappedData = (data || []).map(row => {
      let messageContent = row.message;

      // Mask mobile numbers in message content if user is not approved
      if (!isApprovedUser && messageContent) {
        messageContent = messageContent.replace(MOBILE_REGEX, '***********');
      }

      const senderName = row.sender_name || '';
      const senderMobile = row.sender_mobile || 'N/A';

      return {
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
    });

    console.log('📤 Sample mapped data (first item):', mappedData[0]);

    res.status(200).json({
      total: totalCount,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(totalCount / limitNum),
      data: mappedData
    });
  } catch (error) {
    console.error('API error:', error);
    res.status(500).json({ error: error.message });
  }
};
