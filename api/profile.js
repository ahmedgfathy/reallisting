const { query, verifyToken, hashPassword, corsHeaders, isConfigured, getConfigError } = require('../lib/database');

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

  // Verify user token
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'No token provided' });

  const payload = verifyToken(token);
  if (!payload) return res.status(401).json({ error: 'Invalid token' });

  const userMobile = payload.username;

  // GET: Get user profile
  if (req.method === 'GET') {
    const { data, error } = await query(
      'SELECT mobile, role, is_active, created_at FROM users WHERE mobile = $1 LIMIT 1',
      [userMobile]
    );

    if (error) return res.status(500).json({ error });
    return res.status(200).json({ user: data?.[0] });
  }

  // PUT: Update user profile (password only)
  if (req.method === 'PUT') {
    const { currentPassword, newPassword } = req.body || {};

    const updates = {};

    // Update password if provided
    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({ error: 'يجب إدخال كلمة المرور الحالية' });
      }

      // Verify current password
      const { data: user, error } = await query(
        'SELECT password FROM users WHERE mobile = $1 LIMIT 1',
        [userMobile]
      );

      if (error) return res.status(500).json({ error: 'Database error' });

      const hashedCurrent = hashPassword(currentPassword);
      if (user?.[0]?.password !== hashedCurrent) {
        return res.status(401).json({ error: 'كلمة المرور الحالية غير صحيحة' });
      }

      // Hash new password
      updates.password = hashPassword(newPassword);
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'لا توجد تحديثات' });
    }

    // Update user
    const { error: updateError } = await query(
      'UPDATE users SET password = $1 WHERE mobile = $2',
      [updates.password, userMobile]
    );

    if (updateError) return res.status(500).json({ error: 'فشل التحديث' });

    return res.status(200).json({ success: true, message: 'تم التحديث بنجاح' });
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
