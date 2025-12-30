const { supabase, verifyToken, hashPassword, corsHeaders } = require('../_lib/supabase');

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

  // Verify admin token
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'No token provided' });

  const payload = verifyToken(token);
  if (!payload || payload.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  // GET: List all pending requests
  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('password_reset_requests')
      .select('*')
      .eq('status', 'pending')
      .order('requested_at', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ requests: data || [] });
  }

  // POST: Approve request and generate temp password
  if (req.method === 'POST') {
    const { mobile, action } = req.body || {};
    if (!mobile) return res.status(400).json({ error: 'Mobile required' });

    if (action === 'approve') {
      // Generate temp password
      const tempPassword = generateTempPassword();
      const hashed = hashPassword(tempPassword);

      // Update user password
      const { error: updateError } = await supabase
        .from('users')
        .update({ password: hashed })
        .eq('mobile', mobile);

      if (updateError) return res.status(500).json({ error: 'Failed to update password' });

      // Mark request as approved
      const { error: approveError } = await supabase
        .from('password_reset_requests')
        .update({ 
          status: 'approved', 
          approved_at: new Date().toISOString(),
          temp_password: tempPassword
        })
        .eq('mobile', mobile)
        .eq('status', 'pending');

      if (approveError) return res.status(500).json({ error: 'Failed to update request' });

      return res.status(200).json({ 
        success: true, 
        tempPassword,
        message: 'تم توليد كلمة المرور المؤقتة' 
      });
    }

    if (action === 'reject') {
      // Mark request as rejected
      const { error: rejectError } = await supabase
        .from('password_reset_requests')
        .update({ 
          status: 'rejected', 
          approved_at: new Date().toISOString()
        })
        .eq('mobile', mobile)
        .eq('status', 'pending');

      if (rejectError) return res.status(500).json({ error: 'Failed to reject request' });

      return res.status(200).json({ success: true, message: 'تم رفض الطلب' });
    }

    return res.status(400).json({ error: 'Invalid action' });
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
