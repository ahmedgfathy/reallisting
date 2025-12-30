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

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ authenticated: false });
    }
    
    const payload = verifyToken(token);
    if (!payload) {
      return res.status(401).json({ authenticated: false });
    }

    // Get latest user info from database for brokers
    if (payload.role !== 'admin') {
      const { data: users, error } = await supabase
        .from('users')
        .select('*')
        .eq('mobile', payload.username)
        .limit(1);

      if (!error && users && users.length > 0) {
        const user = users[0];
        
        // Auto-deactivate if subscription expired
        let isActive = !!user.is_active;
        if (isActive && user.subscription_end_date) {
          const now = new Date();
          const endDate = new Date(user.subscription_end_date);
          if (endDate < now) {
            // Subscription expired, deactivate user
            await supabase
              .from('users')
              .update({ is_active: false })
              .eq('mobile', user.mobile);
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

    res.status(200).json({
      authenticated: true,
      user: { username: payload.username, role: payload.role || 'admin', isActive: true }
    });
  } catch (error) {
    console.error('Verify error:', error);
    res.status(401).json({ authenticated: false });
  }
};
