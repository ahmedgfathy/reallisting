const { supabase, generateToken, verifyToken, hashPassword, corsHeaders } = require('../_lib/supabase');

// Admin credentials
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'ZeroCall20!@H';

module.exports = async (req, res) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.status(200).end();
  }

  Object.entries(corsHeaders).forEach(([key, value]) => {
    res.setHeader(key, value);
  });

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { username, password } = req.body || {};

    // Check if admin
    if (username === 'admin' && password === ADMIN_PASSWORD) {
      const token = generateToken('admin', 'admin');
      return res.status(200).json({
        success: true,
        token,
        user: { username: 'admin', role: 'admin', isActive: true }
      });
    }

    // Check broker login
    const { data: users, error } = await supabase
      .from('users')
      .select('*')
      .eq('mobile', username)
      .limit(1);

    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({ error: 'Database error' });
    }

    if (!users || users.length === 0) {
      return res.status(401).json({ error: 'رقم الموبايل أو كلمة المرور غير صحيحة' });
    }

    const user = users[0];
    const hashedPassword = hashPassword(password);

    if (user.password !== hashedPassword) {
      return res.status(401).json({ error: 'رقم الموبايل أو كلمة المرور غير صحيحة' });
    }

    if (!user.is_active) {
      return res.status(403).json({ error: 'الحساب قيد المراجعة. يرجى التواصل مع الإدارة للتفعيل.' });
    }

    const token = generateToken(user.mobile, user.role);
    res.status(200).json({
      success: true,
      token,
      user: { username: user.mobile, role: user.role, isActive: !!user.is_active }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};
