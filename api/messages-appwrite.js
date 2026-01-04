const { getMessages, corsHeaders, isConfigured, getConfigError, getUserBySession } = require('../lib/appwrite');

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

    // Check if user is authenticated and approved
    const authHeader = req.headers.authorization;
    let isApprovedUser = false;

    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const userResult = await getUserBySession(token);
      if (userResult.success) {
        isApprovedUser = userResult.user.role === 'admin' || userResult.user.isActive === true;
      }
    }

    // Get messages from Appwrite
    const result = await getMessages({
      page: parseInt(page),
      limit: parseInt(limit),
      search,
      category,
      propertyType,
      region,
      purpose
    });

    if (!result.success) {
      return res.status(500).json({ error: result.error });
    }

    // Format response - mask sensitive data for unapproved users
    const messages = result.data.map(msg => {
      const formatted = {
        id: msg.$id,
        message: msg.message || '',
        date_of_creation: msg.dateOfCreation || msg.$createdAt,
        source_file: msg.sourceFile || '',
        image_url: msg.imageUrl || '',
        category: msg.category || 'أخرى',
        property_type: msg.propertyType || 'أخرى',
        region: msg.region || 'أخرى',
        purpose: msg.purpose || 'أخرى'
      };

      // Only show contact info for approved users
      if (isApprovedUser) {
        formatted.sender_name = msg.senderName || '';
        formatted.sender_mobile = msg.senderMobile || '';
      } else {
        formatted.sender_name = '';
        formatted.sender_mobile = '';
      }

      return formatted;
    });

    return res.status(200).json({
      data: messages,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: result.total,
        totalPages: Math.ceil(result.total / parseInt(limit))
      },
      hasMore: messages.length === parseInt(limit)
    });

  } catch (error) {
    console.error('Messages endpoint error:', error);
    return res.status(500).json({ error: error.message });
  }
};
