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

    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const payload = verifyToken(token);
      if (payload?.username) {
        userMobile = payload.username;
        const { data: userRows } = await query(
          'SELECT is_active, role FROM users WHERE mobile = $1 LIMIT 1',
          [userMobile]
        );
        const userData = userRows && userRows[0];
        if (userData) {
          isApprovedUser = userData.role === 'admin' || userData.is_active === true;
        }
      }
    }
    // Build SQL filters
    const conditions = [];
    const params = [];

    if (category && category !== 'الكل') {
      params.push(category);
      conditions.push(`category = $${params.length}`);
    }
    if (propertyType && propertyType !== 'الكل') {
      params.push(propertyType);
      conditions.push(`property_type = $${params.length}`);
    }
    if (region && region !== 'الكل') {
      params.push(region);
      conditions.push(`region = $${params.length}`);
    }
    if (purpose && purpose !== 'الكل') {
      params.push(purpose);
      conditions.push(`purpose = $${params.length}`);
    }
    if (search) {
      params.push(`%${search}%`);
      params.push(`%${search}%`);
      params.push(`%${search}%`);
      conditions.push(`(message ILIKE $${params.length - 2} OR region ILIKE $${params.length - 1} OR property_type ILIKE $${params.length})`);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    // Count
    const { data: countRows, error: countErr } = await query(
      `SELECT COUNT(*)::int as total FROM messages_with_sender ${whereClause}`,
      params
    );
    if (countErr) throw new Error(countErr);
    const total = countRows?.[0]?.total || 0;

    // Data with pagination
    params.push(limitNum, offset);
    const { data, error } = await query(
      `SELECT id, message, date_of_creation, source_file, image_url, category, property_type, region, purpose,
              sender_id, sender_name, sender_mobile, created_at
         FROM messages_with_sender
         ${whereClause}
         ORDER BY created_at DESC
         LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );
    if (error) throw new Error(error);

    const MOBILE_REGEX = /(?:\+20|0)?1[0-9]{9}/g;

    // Map column names to match frontend expectations
    const mappedData = (data || []).map(row => {
      let messageContent = row.message;

      // Mask mobile numbers in message content if user is not approved
      if (!isApprovedUser && messageContent) {
        messageContent = messageContent.replace(MOBILE_REGEX, '***********');
      }

      // Use sender fields from the view
      const senderName = row.sender_name || '';
      const senderMobile = row.sender_mobile || 'N/A';

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
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
      data: mappedData
    });
  } catch (error) {
    console.error('API error:', error);
    res.status(500).json({ error: error.message });
  }
};
