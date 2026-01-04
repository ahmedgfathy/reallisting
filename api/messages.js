module.exports = async (context) => {
  const { req, res, log, error } = context;
  const { getMessages, getUserBySession, isConfigured, getConfigError } = require('./lib_appwrite');

  // Handle CORS (though Appwrite Functions handle this via settings, we keep it for safety)
  if (req.method === 'OPTIONS') {
    return res.text('', 200, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    });
  }

  // Check if database is configured
  if (!isConfigured()) {
    return res.json(getConfigError(), 500);
  }

  if (req.method !== 'GET') {
    return res.json({ error: 'Method not allowed' }, 405);
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
      page: pageNum,
      limit: limitNum,
      search,
      category,
      propertyType,
      region,
      purpose
    });

    if (!result.success) {
      return res.json({ error: result.error }, 500);
    }

    const MOBILE_REGEX = /(?:\+20|0)?1[0-9]{9}/g;

    // Format response - mask sensitive data for unapproved users
    const messages = result.data.map(msg => {
      let messageContent = msg.message || '';

      // Mask mobile numbers in message content if user is not approved
      if (!isApprovedUser && messageContent) {
        messageContent = messageContent.replace(MOBILE_REGEX, '***********');
      }

      const formatted = {
        id: msg.$id,
        message: messageContent,
        dateOfCreation: msg.dateOfCreation || msg.$createdAt,
        sourceFile: msg.sourceFile || '',
        imageUrl: msg.imageUrl || '',
        category: msg.category || 'أخرى',
        propertyType: msg.propertyType || 'أخرى',
        region: msg.region || 'أخرى',
        purpose: msg.purpose || 'أخرى'
      };

      // Only show contact info for approved users
      if (isApprovedUser) {
        formatted.name = msg.senderName || '';
        formatted.mobile = msg.senderMobile || '';
      } else {
        formatted.name = '';
        formatted.mobile = 'N/A';
      }

      return formatted;
    });

    return res.json({
      total: result.total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(result.total / limitNum),
      data: messages
    }, 200, {
      'Access-Control-Allow-Origin': '*'
    });

  } catch (err) {
    error('Messages endpoint error: ' + err.message);
    return res.json({ error: err.message }, 500);
  }
};
