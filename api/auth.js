const { supabase, verifyToken, hashPassword, generateToken, corsHeaders } = require('./_lib/supabase');

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
    const { data: users, error } = await supabase
      .from('users')
      .select('*')
      .eq('mobile', loginIdentifier)
      .eq('password', hashedPassword)
      .limit(1);

    if (error || !users || users.length === 0) {
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

    const { data: existing } = await supabase
      .from('users')
      .select('mobile')
      .eq('mobile', mobile)
      .limit(1);

    if (existing && existing.length > 0) {
      return res.status(409).json({ error: 'هذا الرقم مسجل بالفعل' });
    }

    const hashedPassword = hashPassword(password);
    const { error } = await supabase
      .from('users')
      .insert([{ mobile, password: hashedPassword, role: 'broker', is_active: false }]);

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
      const { data: users, error } = await supabase
        .from('users')
        .select('*')
        .eq('mobile', payload.username)
        .limit(1);

      if (!error && users && users.length > 0) {
        const user = users[0];
        let isActive = !!user.is_active;
        
        if (isActive && user.subscription_end_date) {
          const now = new Date();
          const endDate = new Date(user.subscription_end_date);
          if (endDate < now) {
            await supabase.from('users').update({ is_active: false }).eq('mobile', user.mobile);
            isActive = false;
          }
        }
        
        return res.status(200).json({
          authenticated: true,
          user: { 
            username: user.mobile, 
            role: user.role, 
            isActive: isActive,
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

    const { data: users } = await supabase.from('users').select('mobile').eq('mobile', mobile).limit(1);
    if (!users || users.length === 0) {
      return res.status(404).json({ error: 'رقم الموبايل غير مسجل' });
    }

    const { data: existing } = await supabase
      .from('password_reset_requests')
      .select('*')
      .eq('mobile', mobile)
      .eq('status', 'pending')
      .limit(1);

    if (existing && existing.length > 0) {
      return res.status(400).json({ error: 'يوجد طلب قيد المراجعة بالفعل' });
    }

    const { error } = await supabase
      .from('password_reset_requests')
      .insert([{ mobile, status: 'pending' }]);

    if (error) return res.status(500).json({ error: 'فشل في إرسال الطلب' });

    return res.status(200).json({ 
      success: true, 
      message: 'تم إرسال طلب إعادة التعيين. سيتم مراجعته من قبل المسؤول.' 
    });
  }

  return res.status(404).json({ error: 'Not found' });
};
