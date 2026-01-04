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
      return res.status(500).json({ error: result.error });
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

    // Match exactly the frontend expectation from legacy API
    return res.status(200).json({
      total: result.total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(result.total / limitNum),
      data: messages
    });

  } catch (error) {
    console.error('Messages endpoint error:', error);
    return res.status(500).json({ error: error.message });
  }
};
