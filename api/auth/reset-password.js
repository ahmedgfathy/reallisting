const { supabase, corsHeaders } = require('../_lib/supabase');

// This endpoint is for USERS to REQUEST password reset
// Admin will approve and generate the temp password manually
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

  // Check if there's already a pending request
  const { data: existing } = await supabase
    .from('password_reset_requests')
    .select('*')
    .eq('mobile', mobile)
    .eq('status', 'pending')
    .limit(1);

  if (existing && existing.length > 0) {
    return res.status(200).json({ 
      success: true, 
      message: 'طلب إعادة التعيين موجود بالفعل. يرجى انتظار موافقة المسؤول.' 
    });
  }

  // Create password reset request
  const { error: insertError } = await supabase
    .from('password_reset_requests')
    .insert({
      mobile,
      status: 'pending',
      requested_at: new Date().toISOString()
    });

  if (insertError) {
    console.error('Insert error:', insertError);
    return res.status(500).json({ error: 'خطأ في إنشاء الطلب' });
  }

  res.status(200).json({ 
    success: true, 
    message: 'تم إرسال طلب إعادة التعيين. سيتم مراجعته من قبل المسؤول.' 
  });
};
