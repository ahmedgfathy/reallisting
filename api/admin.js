const { getAllUsers, updateUserStatus, deleteUser, getUserBySession, corsHeaders, isConfigured, getConfigError } = require('../lib/appwrite');

// Helper to parse request body
async function parseBody(req) {
  if (req.body) return req.body;
  return new Promise((resolve) => {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      try {
        resolve(JSON.parse(body));
      } catch {
        resolve({});
      }
    });
  });
}

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') {
    Object.entries(corsHeaders).forEach(([k, v]) => res.setHeader(k, v));
    return res.status(200).end();
  }
  Object.entries(corsHeaders).forEach(([k, v]) => res.setHeader(k, v));

  // Check if database is configured
  if (!isConfigured()) {
    return res.status(500).json(getConfigError());
  }

  // Verify admin authorization
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const userResult = await getUserBySession(token);
  if (!userResult.success || userResult.user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden - Admin access required' });
  }

  const path = req.query.path || req.url.split('?')[0].replace('/api/admin', '');

  // GET ALL USERS
  if ((path === 'users' || path === '/users') && req.method === 'GET') {
    const result = await getAllUsers();

    if (!result.success) {
      return res.status(500).json({ error: result.error });
    }

    // Format user data for AdminDashboard.js
    const users = result.data.map(user => ({
      id: user.$id,
      mobile: user.mobile,
      role: user.role,
      isActive: user.isActive,
      subscriptionEndDate: user.subscriptionEndDate || null,
      createdAt: user.$createdAt
    }));

    return res.status(200).json(users);
  }

  // UPDATE USER STATUS
  if (path.includes('/status') && req.method === 'POST') {
    const userId = path.split('/')[1];
    const body = await parseBody(req);
    const { isActive } = body;

    const result = await updateUserStatus(userId, isActive);

    if (!result.success) {
      return res.status(500).json({ error: result.error });
    }

    return res.status(200).json({
      success: true,
      user: {
        id: result.data.$id,
        mobile: result.data.mobile,
        role: result.data.role,
        isActive: result.data.isActive,
        subscriptionEndDate: result.data.subscriptionEndDate
      }
    });
  }

  return res.status(404).json({ error: 'Not found' });
};
