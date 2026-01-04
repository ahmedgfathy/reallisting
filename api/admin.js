module.exports = async (context) => {
  const { req, res, log, error } = context;
  const { getAllUsers, updateUserStatus, deleteMessages, isConfigured, getConfigError } = require('./lib_appwrite');

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

  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.json({ error: 'Unauthorized' }, 401);
  }

  const userResult = await getUserBySession(token);
  if (!userResult.success || userResult.user.role !== 'admin') {
    return res.json({ error: 'Forbidden - Admin access required' }, 403);
  }

  const path = req.query.path || (req.path ? req.path.replace('/api/admin', '').replace(/^\//, '') : '');

  // GET ALL USERS
  if ((path === 'users' || path === '/users' || req.path === '/users') && req.method === 'GET') {
    const result = await getAllUsers();

    if (!result.success) {
      return res.json({ error: result.error }, 500);
    }

    const users = result.data.map(user => ({
      id: user.$id,
      mobile: user.mobile,
      role: user.role,
      isActive: user.isActive,
      subscriptionEndDate: user.subscriptionEndDate || null,
      createdAt: user.$createdAt
    }));

    return res.json(users, 200, { 'Access-Control-Allow-Origin': '*' });
  }

  // UPDATE USER STATUS
  if (path.includes('/status') && req.method === 'POST') {
    const userId = path.split('/')[0]; // Assuming path is "userId/status"
    const { isActive } = req.body || {};

    const result = await updateUserStatus(userId, isActive);

    if (!result.success) {
      return res.json({ error: result.error }, 500);
    }

    return res.json({
      success: true,
      user: {
        id: result.data.$id,
        mobile: result.data.mobile,
        role: result.data.role,
        isActive: result.data.isActive,
        subscriptionEndDate: result.data.subscriptionEndDate
      }
    }, 200, { 'Access-Control-Allow-Origin': '*' });
  }

  return res.json({ error: 'Not found' }, 404);
};
