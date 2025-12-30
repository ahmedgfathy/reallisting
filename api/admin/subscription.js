const { supabase, verifyToken, corsHeaders } = require('../_lib/supabase');

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

  // POST: Set subscription for a user
  if (req.method === 'POST') {
    const { mobile, days } = req.body;

    if (!mobile || !days) {
      return res.status(400).json({ error: 'Mobile and days are required' });
    }

    const daysNum = parseInt(days);
    if (isNaN(daysNum) || daysNum < 0) {
      return res.status(400).json({ error: 'Invalid days value' });
    }

    // Calculate subscription end date
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + daysNum);

    // Update user with subscription end date and activate
    const { data, error } = await supabase
      .from('users')
      .update({
        subscription_end_date: endDate.toISOString(),
        is_active: true
      })
      .eq('mobile', mobile)
      .select('mobile, subscription_end_date, is_active');

    if (error) return res.status(500).json({ error: error.message });
    if (!data || data.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.status(200).json({ 
      success: true, 
      user: data[0],
      message: `Subscription set for ${days} days`
    });
  }

  // PUT: Check and deactivate expired subscriptions
  if (req.method === 'PUT') {
    const now = new Date().toISOString();

    // Find and deactivate expired subscriptions
    const { data, error } = await supabase
      .from('users')
      .update({ is_active: false })
      .lt('subscription_end_date', now)
      .eq('is_active', true)
      .select('mobile');

    if (error) return res.status(500).json({ error: error.message });

    return res.status(200).json({
      success: true,
      deactivated: data?.length || 0,
      users: data || []
    });
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
