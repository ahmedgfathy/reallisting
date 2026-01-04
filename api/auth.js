const { createUser, loginUser, getUserBySession, corsHeaders, isConfigured, getConfigError } = require('../lib/appwrite');
require('dotenv').config();

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

  const path = req.query.path || req.url.split('?')[0].replace('/api/auth', '');

  // LOGIN
  if ((path === 'login' || path === '/login') && req.method === 'POST') {
    const body = await parseBody(req);
    const { username, mobile, password } = body || {};
    const loginIdentifier = username || mobile;

    if (!loginIdentifier || !password) {
      return res.status(400).json({ error: 'Mobile and password required' });
    }

    const result = await loginUser(loginIdentifier, password);

    if (!result.success) {
      console.log('Login failed:', result.error);
      return res.status(401).json({ error: 'بيانات تسجيل الدخول غير صحيحة' });
    }

    return res.status(200).json({
      success: true,
      token: result.session.secret,
      user: {
        username: result.user.mobile,
        role: result.user.role,
        isActive: result.user.isActive
      }
    });
  }

  // REGISTER
  if ((path === 'register' || path === '/register') && req.method === 'POST') {
    const body = await parseBody(req);
    const { mobile, password, name = '' } = body || {};
    if (!mobile || !password) {
      return res.status(400).json({ error: 'Mobile and password required' });
    }

    const result = await createUser(mobile, password, name);

    if (!result.success) {
      if (result.error.includes('user') || result.error.includes('exists')) {
        return res.status(409).json({ error: 'هذا الرقم مسجل بالفعل' });
      }
      return res.status(500).json({ error: 'فشل التسجيل' });
    }

    return res.status(201).json({
      success: true,
      message: 'تم التسجيل بنجاح. في انتظار موافقة المشرف.',
      user: { mobile, role: 'broker', isActive: false }
    });
  }

  // VERIFY
  if ((path === 'verify' || path === '/verify') && req.method === 'GET') {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ authenticated: false });

    const result = await getUserBySession(token);

    if (!result.success) {
      return res.status(401).json({ authenticated: false });
    }

    return res.status(200).json({
      authenticated: true,
      user: {
        username: result.user.mobile,
        role: result.user.role,
        isActive: result.user.isActive,
        subscriptionEndDate: result.user.subscriptionEndDate || null
      }
    });
  }

  // RESET PASSWORD
  if ((path === 'reset-password' || path === '/reset-password') && req.method === 'POST') {
    return res.status(200).json({
      message: 'يرجى الاتصال بالمشرف لإعادة تعيين كلمة المرور'
    });
  }

  return res.status(404).json({ error: 'Not found' });
};
