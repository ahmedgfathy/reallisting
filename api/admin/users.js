const { supabase, verifyToken, corsHeaders } = require('../_lib/supabase');

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

  // Verify admin token
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const payload = verifyToken(token);
  if (!payload || payload.role !== 'admin') {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  if (req.method === 'GET') {
    try {
      const { data: users, error } = await supabase
        .from('users')
        .select('id, mobile, role, is_active, created_at, subscription_end_date')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Supabase error:', error);
        return res.status(500).json({ error: 'Failed to load users' });
      }

      const mappedUsers = (users || []).map(row => ({
        id: row.id,
        mobile: row.mobile,
        role: row.role,
        isActive: !!row.is_active,
        createdAt: row.created_at,
        subscriptionEndDate: row.subscription_end_date
      }));

      res.status(200).json(mappedUsers);
    } catch (error) {
      console.error('Admin list users error:', error);
      res.status(500).json({ error: 'Failed to load users' });
    }
  } else if (req.method === 'POST') {
    // Update user status
    try {
      const { userId, isActive } = req.body || {};

      if (!userId || typeof isActive !== 'boolean') {
        return res.status(400).json({ error: 'Invalid request' });
      }

      const { error: updateError } = await supabase
        .from('users')
        .update({ is_active: isActive })
        .eq('id', userId);

      if (updateError) {
        console.error('Update error:', updateError);
        return res.status(500).json({ error: 'Failed to update user status' });
      }

      const { data: updated, error: fetchError } = await supabase
        .from('users')
        .select('id, mobile, role, is_active, created_at')
        .eq('id', userId)
        .limit(1);

      if (fetchError || !updated || updated.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      const user = updated[0];
      res.status(200).json({
        success: true,
        user: {
          id: user.id,
          mobile: user.mobile,
          role: user.role,
          isActive: !!user.is_active,
          createdAt: user.created_at
        }
      });
    } catch (error) {
      console.error('Admin update user error:', error);
      res.status(500).json({ error: 'Failed to update user status' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
};
