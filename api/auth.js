const { users, messages, generateToken, corsHeaders } = require('../lib/mariadb');

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
      const loginIdentifier = username || mobile;

      if (!loginIdentifier || !password) {
        return res.status(400).json({ error: 'Mobile and password required' });
      }

      const user = await users.verifyPassword(loginIdentifier, password);

      if (!user) {
        return res.status(401).json({ error: 'بيانات تسجيل الدخول غير صحيحة' });
      }

      const token = generateToken(user.mobile, user.role, user.is_active === 1);

      return res.status(200).json({
        success: true,
        token,
        user: {
          username: user.mobile,
          role: user.role,
          isActive: user.is_active === 1
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      return res.status(500).json({ error: 'Login failed' });
    }
  }

  // REGISTER
  if ((path === 'register' || path === '/register') && req.method === 'POST') {
    try {
      const body = await parseBody(req);
      const { mobile, password, name = '' } = body || {};

      if (!mobile || !password) {
        return res.status(400).json({ error: 'Mobile and password required' });
      }

      const result = await users.create(mobile, password, name);

      if (!result.success) {
        if (result.error.includes('exists')) {
          return res.status(409).json({ error: 'هذا الرقم مسجل بالفعل' });
        }
        return res.status(500).json({ error: 'فشل التسجيل' });
      }

      return res.status(201).json({ message: 'تم التسجيل بنجاح. في انتظار موافقة المشرف.' });
    } catch (error) {
      console.error('Register error:', error);
      return res.status(500).json({ error: 'Registration failed' });
    }
  }

  // VERIFY
  if ((path === 'verify' || path === '/verify') && req.method === 'GET') {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');
      
      if (!token) {
        return res.status(401).json({ authenticated: false });
      }

      const { verifyToken } = require('../lib/sqlite');
      const payload = verifyToken(token);

      if (!payload) {
        return res.status(401).json({ authenticated: false });
      }

      const user = await users.findByMobile(payload.mobile);

      if (!user) {
        return res.status(401).json({ authenticated: false });
      }

      return res.status(200).json({
        authenticated: true,
        user: {
          username: user.mobile,
          role: user.role,
          isActive: user.is_active === 1,
          subscriptionEndDate: user.subscription_end_date || null
        }
      });
    } catch (error) {
      console.error('Verify error:', error);
      return res.status(401).json({ authenticated: false });
    }
  }

  return res.status(404).json({ error: 'Not found' });
};
