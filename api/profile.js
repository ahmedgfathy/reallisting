const { users, verifyToken, corsHeaders } = require('../lib/sqlite');

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
  if (!payload) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // GET Profile
  if (req.method === 'GET') {
    try {
      const user = users.findByMobile(payload.mobile);

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      return res.status(200).json({
        mobile: user.mobile,
        name: user.name,
        role: user.role,
        isActive: user.is_active === 1,
        subscriptionEndDate: user.subscription_end_date || null
      });
    } catch (error) {
      console.error('Get profile error:', error);
      return res.status(500).json({ error: 'Failed to fetch profile' });
    }
  }

  // PUT: Update user profile
  if (req.method === 'PUT') {
    try {
      const body = await parseBody(req);
      const { name, currentPassword, newPassword } = body || {};

      const user = users.findByMobile(payload.mobile);

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Update name if provided
      if (name !== undefined) {
        const stmt = require('../lib/sqlite').db.prepare('UPDATE users SET name = ? WHERE mobile = ?');
        stmt.run(name, payload.mobile);
      }

      // Update password if provided
      if (newPassword) {
        if (!currentPassword) {
          return res.status(400).json({ error: 'يجب إدخال كلمة المرور الحالية' });
        }

        const verifiedUser = users.verifyPassword(payload.mobile, currentPassword);
        if (!verifiedUser) {
          return res.status(401).json({ error: 'كلمة المرور الحالية غير صحيحة' });
        }

        const { hashPassword } = require('crypto');
        const newHash = require('../lib/sqlite').db.prepare('SELECT ?').get(require('crypto').createHash('sha256').update(newPassword + (process.env.JWT_SECRET || 'reallisting_secret_key_2025_secure')).digest('hex'));
        const stmt = require('../lib/sqlite').db.prepare('UPDATE users SET password = ? WHERE mobile = ?');
        stmt.run(require('crypto').createHash('sha256').update(newPassword + (process.env.JWT_SECRET || 'reallisting_secret_key_2025_secure')).digest('hex'), payload.mobile);
      }

      const updatedUser = users.findByMobile(payload.mobile);

      return res.status(200).json({
        success: true,
        message: newPassword ? 'تم تحديث الملف الشخصي وكلمة المرور بنجاح' : 'تم تحديث الملف الشخصي بنجاح',
        user: {
          mobile: updatedUser.mobile,
          name: updatedUser.name,
          role: updatedUser.role,
          isActive: updatedUser.is_active === 1,
          subscriptionEndDate: updatedUser.subscription_end_date || null
        }
      });
    } catch (error) {
      console.error('Update profile error:', error);
      return res.status(500).json({ error: 'Failed to update profile' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
