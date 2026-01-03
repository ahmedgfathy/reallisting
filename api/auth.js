const { query, verifyToken, hashPassword, generateToken, corsHeaders, isConfigured, getConfigError } = require('../lib/database');

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

    const hashedPassword = hashPassword(password);
    
    // DEBUG: Log the hash
    console.log('Login attempt:', { loginIdentifier, hashedPassword: hashedPassword.substring(0, 20) + '...' });
    
    const { data: users, error } = await query(
      'SELECT * FROM users WHERE mobile = $1 AND password = $2 LIMIT 1',
      [loginIdentifier, hashedPassword]
    );

    if (error || !users || users.length === 0) {
      console.log('Login failed:', { error, usersFound: users?.length || 0 });
      return res.status(401).json({ error: 'بيانات تسجيل الدخول غير صحيحة' });
    }

    const user = users[0];
    const token = generateToken(user.mobile, user.role);
    return res.status(200).json({ 
      success: true,
      token, 
      user: { username: user.mobile, role: user.role, isActive: !!user.is_active } 
    });
  }

  // REGISTER
  if ((path === 'register' || path === '/register') && req.method === 'POST') {
    const body = await parseBody(req);
    const { mobile, password } = body || {};
    if (!mobile || !password) {
      return res.status(400).json({ error: 'Mobile and password required' });
    }

    const { data: existing } = await query(
      'SELECT mobile FROM users WHERE mobile = $1 LIMIT 1',
      [mobile]
    );

    if (existing && existing.length > 0) {
      return res.status(409).json({ error: 'هذا الرقم مسجل بالفعل' });
    }

    const hashedPassword = hashPassword(password);
    const { error } = await query(
      'INSERT INTO users (mobile, password, role, is_active) VALUES ($1, $2, $3, $4)',
      [mobile, hashedPassword, 'broker', false]
    );

    if (error) {
      return res.status(500).json({ error: 'فشل التسجيل' });
    }

    return res.status(201).json({ message: 'تم التسجيل بنجاح. في انتظار موافقة المشرف.' });
  }

  // VERIFY
  if ((path === 'verify' || path === '/verify') && req.method === 'GET') {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ authenticated: false });

    const payload = verifyToken(token);
    if (!payload) return res.status(401).json({ authenticated: false });

    if (payload.role !== 'admin') {
      const { data: users, error } = await query(
        'SELECT * FROM users WHERE mobile = $1 LIMIT 1',
        [payload.username]
      );

      if (!error && users && users.length > 0) {
        const user = users[0];
        let isActive = !!user.is_active;

        if (isActive && user.subscription_end_date) {
          const now = new Date();
          const endDate = new Date(user.subscription_end_date);
          if (endDate < now) {
            await query('UPDATE users SET is_active = false WHERE mobile = $1', [user.mobile]);
            isActive = false;
          }
        }

        return res.status(200).json({
          authenticated: true,
          user: {
            username: user.mobile,
            role: user.role,
            isActive,
            subscriptionEndDate: user.subscription_end_date
          }
        });
      }
    }

    return res.status(200).json({
      authenticated: true,
      user: { username: payload.username, role: payload.role || 'admin', isActive: true }
    });
  }

  // RESET PASSWORD
  if ((path === 'reset-password' || path === '/reset-password') && req.method === 'POST') {
    const body = await parseBody(req);
    const { mobile } = body || {};
    if (!mobile) return res.status(400).json({ error: 'رقم الموبايل مطلوب' });

    const { data: users } = await query('SELECT mobile FROM users WHERE mobile = $1 LIMIT 1', [mobile]);
    if (!users || users.length === 0) {
      return res.status(404).json({ error: 'رقم الموبايل غير مسجل' });
    }

    const { data: existing } = await query(
      'SELECT * FROM password_reset_requests WHERE mobile = $1 AND status = $2 LIMIT 1',
      [mobile, 'pending']
    );

    if (existing && existing.length > 0) {
      return res.status(400).json({ error: 'يوجد طلب قيد المراجعة بالفعل' });
    }

    const { error } = await query(
      'INSERT INTO password_reset_requests (mobile, status) VALUES ($1, $2)',
      [mobile, 'pending']
    );

    if (error) return res.status(500).json({ error: 'فشل في إرسال الطلب' });

    return res.status(200).json({ 
      success: true, 
      message: 'تم إرسال طلب إعادة التعيين. سيتم مراجعته من قبل المسؤول.' 
    });
  }

  return res.status(404).json({ error: 'Not found' });
};
