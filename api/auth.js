module.exports = async (context) => {
  const { req, res, log } = context;
  const { createUser, loginUser, getUserBySession, isConfigured, getConfigError } = require('./lib_appwrite');

  // Handle CORS
  if (req.method === 'OPTIONS') {
    return res.text('', 200, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    });
  }

  // Check if database is configured
  if (!isConfigured()) {
    return res.json(getConfigError(), 500);
  }

  const path = req.query.path || (req.path ? req.path.replace('/api/auth', '').replace(/^\//, '') : '');

  // LOGIN
  if ((path === 'login' || path === '/login' || req.path === '/login') && req.method === 'POST') {
    const { username, mobile, password } = req.body || {};
    const loginIdentifier = username || mobile;

    if (!loginIdentifier || !password) {
      return res.json({ error: 'Mobile and password required' }, 400);
    }

    const result = await loginUser(loginIdentifier, password);

    if (!result.success) {
      log('Login failed: ' + result.error);
      return res.json({ error: 'بيانات تسجيل الدخول غير صحيحة' }, 401);
    }

    return res.json({
      success: true,
      token: result.session.secret,
      user: {
        username: result.user.mobile,
        role: result.user.role,
        isActive: result.user.isActive
      }
    }, 200, { 'Access-Control-Allow-Origin': '*' });
  }

  // REGISTER
  if ((path === 'register' || path === '/register' || req.path === '/register') && req.method === 'POST') {
    const { mobile, password, name = '' } = req.body || {};
    if (!mobile || !password) {
      return res.json({ error: 'Mobile and password required' }, 400);
    }

    const result = await createUser(mobile, password, name);

    if (!result.success) {
      if (result.error.includes('user') || result.error.includes('exists')) {
        return res.json({ error: 'هذا الرقم مسجل بالفعل' }, 409);
      }
      return res.json({ error: 'فشل التسجيل' }, 500);
    }

    return res.json({
      success: true,
      message: 'تم التسجيل بنجاح. في انتظار موافقة المشرف.',
      user: { mobile, role: 'broker', isActive: false }
    }, 201, { 'Access-Control-Allow-Origin': '*' });
  }

  // VERIFY
  if ((path === 'verify' || path === '/verify' || req.path === '/verify') && req.method === 'GET') {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.json({ authenticated: false }, 401);

    const result = await getUserBySession(token);

    if (!result.success) {
      return res.json({ authenticated: false }, 401);
    }

    return res.json({
      authenticated: true,
      user: {
        username: result.user.mobile,
        role: result.user.role,
        isActive: result.user.isActive,
        subscriptionEndDate: result.user.subscriptionEndDate || null
      }
    }, 200, { 'Access-Control-Allow-Origin': '*' });
  }

  return res.json({ error: 'Not found' }, 404);
};
