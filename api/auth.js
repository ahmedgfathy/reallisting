const { users, createResetRequest, generateToken, corsHeaders } = require('../lib/db');

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

  const path = req.query.path || req.url.split('?')[0].replace('/api/auth', '');

  // LOGIN
  if ((path === 'login' || path === '/login') && req.method === 'POST') {
    try {
      const body = await parseBody(req);
      const { username, mobile, password } = body || {};
      const loginIdentifier = (username || mobile || '').toString().trim();

      if (!loginIdentifier || !password) {
        return res.status(400).json({ error: 'Mobile and password required' });
      }

      const user = await users.verifyPassword(loginIdentifier, password);

      if (!user) {
        return res.status(401).json({ error: 'بيانات تسجيل الدخول غير صحيحة' });
      }

      const token = generateToken(user.mobile, user.role, !!user.is_active);

      return res.status(200).json({
        success: true,
        token,
        user: {
          username: user.mobile,
          role: user.role,
          isActive: !!user.is_active
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      return res.status(500).json({ error: 'Login failed' });
    }
  }

  // REGISTER (disabled - access is restricted to existing users only)
  if ((path === 'register' || path === '/register') && req.method === 'POST') {
    return res.status(403).json({ error: 'تم إيقاف إنشاء الحسابات الجديدة' });
  }

  // VERIFY
  if ((path === 'verify' || path === '/verify') && req.method === 'GET') {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');

      if (!token) {
        return res.status(401).json({ authenticated: false });
      }

      const { verifyToken } = require('../lib/db');
      const payload = verifyToken(token);

      if (!payload) {
        return res.status(401).json({ authenticated: false });
      }

      const user = await users.getByMobile(payload.mobile);

      if (!user) {
        return res.status(401).json({ authenticated: false });
      }

      return res.status(200).json({
        authenticated: true,
        user: {
          username: user.mobile,
          role: user.role,
          isActive: !!user.is_active,
          subscriptionEndDate: user.subscription_end_date || null
        }
      });
    } catch (error) {
      console.error('Verify error:', error);
      return res.status(401).json({ authenticated: false });
    }
  }

  // RESET PASSWORD REQUEST
  if ((path === 'reset-password' || path === '/reset-password') && req.method === 'POST') {
    try {
      const body = await parseBody(req);
      const mobile = (body?.mobile || '').toString().trim();

      if (!mobile) {
        return res.status(400).json({ error: 'رقم الموبايل مطلوب' });
      }

      await createResetRequest(mobile);

      return res.status(200).json({
        success: true,
        message: 'تم استلام الطلب وسيظهر في لوحة المشرف المحلية.'
      });
    } catch (error) {
      console.error('Reset password request error:', error);
      return res.status(500).json({ error: 'Failed to submit reset request' });
    }
  }

  return res.status(404).json({ error: 'Not found' });
};
