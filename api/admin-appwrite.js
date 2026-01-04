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

    // Format user data
    const users = result.data.map(user => ({
      id: user.$id,
      mobile: user.mobile,
      role: user.role,
      is_active: user.isActive,
      subscription_end_date: user.subscriptionEndDate || null,
      created_at: user.$createdAt
    }));

    return res.status(200).json({ data: users });
  }

  // UPDATE USER STATUS
  if (path.startsWith('users/') && req.method === 'PUT') {
    const userId = path.replace('users/', '').replace('/approve', '').replace('/reject', '');
    const body = await parseBody(req);
    const { is_active, subscription_end_date } = body;

    if (typeof is_active !== 'boolean') {
      return res.status(400).json({ error: 'is_active must be a boolean' });
    }

    const result = await updateUserStatus(userId, is_active);
    
    if (!result.success) {
      return res.status(500).json({ error: result.error });
    }

    return res.status(200).json({ 
      success: true,
      message: 'تم تحديث حالة المستخدم بنجاح'
    });
  }

  // DELETE USER
  if (path.startsWith('users/') && req.method === 'DELETE') {
    const userId = path.replace('users/', '');
    
    const result = await deleteUser(userId);
    
    if (!result.success) {
      return res.status(500).json({ error: result.error });
    }

    return res.status(200).json({ 
      success: true,
      message: 'تم حذف المستخدم بنجاح'
    });
  }

  return res.status(404).json({ error: 'Not found' });
};
