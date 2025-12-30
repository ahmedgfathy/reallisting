const { supabase, hashPassword, corsHeaders } = require('../_lib/supabase');

function generateTempPassword(length = 8) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let pass = '';
  for (let i = 0; i < length; i++) {
    pass += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pass;
}

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') {
    Object.entries(corsHeaders).forEach(([k, v]) => res.setHeader(k, v));
    return res.status(200).end();
  }
  Object.entries(corsHeaders).forEach(([k, v]) => res.setHeader(k, v));
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { mobile } = req.body || {};
  if (!mobile) return res.status(400).json({ error: 'رقم الموبايل مطلوب' });

  // Check user exists
  const { data: users, error } = await supabase.from('users').select('*').eq('mobile', mobile).limit(1);
  if (error) return res.status(500).json({ error: 'Database error' });
  if (!users || users.length === 0) return res.status(404).json({ error: 'المستخدم غير موجود' });

  // Generate and hash temp password
  const tempPassword = generateTempPassword();
  const hashed = hashPassword(tempPassword);

  // Update password in DB
  const { error: updateError } = await supabase
    .from('users')
    .update({ password: hashed })
    .eq('mobile', mobile);

  if (updateError) return res.status(500).json({ error: 'خطأ أثناء تحديث كلمة المرور' });

  // Return temp password to display
  res.status(200).json({ success: true, tempPassword });
};
