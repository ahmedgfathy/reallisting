const { users, messages, verifyToken, corsHeaders } = require('../lib/database');

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

  // Check authentication
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const payload = verifyToken(token);
  if (!payload || payload.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden - Admin access required' });
  }

  const path = req.query.path || req.url.split('?')[0].replace('/api/admin', '');

  // GET ALL USERS
  if ((path === 'users' || path === '/users') && req.method === 'GET') {
    try {
      const allUsers = await users.getAll();

      const formattedUsers = allUsers.map(user => ({
        id: user.id,
        mobile: user.mobile,
        name: user.name,
        role: user.role,
        isActive: !!user.is_active,
        subscriptionEndDate: user.subscription_end_date || null,
        createdAt: user.created_at
      }));

      return res.status(200).json(formattedUsers);
    } catch (error) {
      console.error('Get users error:', error);
      return res.status(500).json({ error: 'Failed to fetch users' });
    }
  }

  // UPDATE USER STATUS
  if (path.includes('/status') && req.method === 'POST') {
    try {
      const userId = path.split('/')[0];
      const body = await parseBody(req);
      const { isActive } = body || {};

      await users.update(userId, { is_active: isActive });

      const user = await users.findById(userId);

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      return res.status(200).json({
        success: true,
        user: {
          id: user.id,
          mobile: user.mobile,
          role: user.role,
          isActive: !!user.is_active,
          subscriptionEndDate: user.subscription_end_date
        }
      });
    } catch (error) {
      console.error('Update status error:', error);
      return res.status(500).json({ error: 'Failed to update user status' });
    }
  }

  // DELETE MESSAGES
  if (path.includes('messages') && (req.method === 'DELETE' || req.method === 'POST')) {
    try {
      const body = await parseBody(req);
      const { messageIds, ids } = body || {};
      const targetIds = messageIds || ids;

      if (!targetIds || !Array.isArray(targetIds) || targetIds.length === 0) {
        return res.status(400).json({ error: 'Invalid message IDs' });
      }

      const result = await messages.deleteMultiple(targetIds);

      return res.status(200).json({
        success: true,
        deletedCount: result.deletedCount || targetIds.length
      });
    } catch (error) {
      console.error('Delete messages error:', error);
      return res.status(500).json({ error: 'Failed to delete messages' });
    }
  }

  // UPDATE SUBSCRIPTION
  if (path.includes('subscription') && req.method === 'POST') {
    try {
      const body = await parseBody(req);
      const { userId, mobile, days } = body || {};
      const targetMobile = mobile || (userId ? (await users.findById(userId))?.mobile : null);

      if (!targetMobile) {
        return res.status(400).json({ error: 'User ID or Mobile required' });
      }

      const endDate = new Date();
      endDate.setDate(endDate.getDate() + parseInt(days || 30));

      await users.updateSubscription(targetMobile, endDate, true);

      return res.status(200).json({
        success: true,
        mobile: targetMobile,
        subscriptionEndDate: endDate.toISOString()
      });
    } catch (error) {
      console.error('Subscription update error:', error);
      return res.status(500).json({ error: 'Failed to update subscription' });
    }
  }

  return res.status(404).json({ error: 'Not found' });
};
