const { supabase, generateToken, hashPassword, corsHeaders } = require('../_lib/supabase');

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
    const { mobile, password } = req.body || {};

    // Validate mobile
    if (!mobile || !/^01[0-9]{9}$/.test(mobile)) {
      return res.status(400).json({ error: 'رقم الموبايل يجب أن يبدأ بـ 01 ويتكون من 11 رقم' });
    }

    // Validate password
    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' });
    }

    // Check if user exists
    const { data: existing, error: checkError } = await supabase
      .from('users')
      .select('id')
      .eq('mobile', mobile)
      .limit(1);

    if (checkError) {
      console.error('Supabase error:', checkError);
      return res.status(500).json({ error: 'Database error' });
    }

    if (existing && existing.length > 0) {
      return res.status(400).json({ error: 'رقم الموبايل مسجل بالفعل' });
    }

    // Create user (inactive by default - needs payment)
    const hashedPassword = hashPassword(password);
    const { error: insertError } = await supabase
      .from('users')
      .insert({
        mobile,
        password: hashedPassword,
        role: 'broker',
        is_active: false
      });

    if (insertError) {
      console.error('Insert error:', insertError);
      return res.status(500).json({ error: 'حدث خطأ أثناء التسجيل' });
    }

    // Generate token
    const token = generateToken(mobile, 'broker');

    res.status(200).json({
      success: true,
      token,
      user: { username: mobile, role: 'broker', isActive: false }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'حدث خطأ أثناء التسجيل' });
  }
};
