const { supabase, verifyToken, hashPassword, corsHeaders } = require('../lib/supabase');

function generateTempPassword(length = 8) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

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

  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'No token provided' });

  const payload = verifyToken(token);
  if (!payload || payload.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const path = req.query.path || req.url.split('?')[0].replace('/api/admin', '');

  // GET USERS
  if ((path === 'users' || path === '/users') && req.method === 'GET') {
    const { data: users, error } = await supabase
      .from('users')
      .select('id, mobile, role, is_active, created_at, subscription_end_date')
      .order('created_at', { ascending: false });

    if (error) return res.status(500).json({ error: 'Failed to load users' });

    const mappedUsers = (users || []).map(row => ({
      id: row.id,
      mobile: row.mobile,
      role: row.role,
      isActive: !!row.is_active,
      createdAt: row.created_at,
      subscriptionEndDate: row.subscription_end_date
    }));

    return res.status(200).json(mappedUsers);
  }

  // ACTIVATE USER
  if (path.match(/^\/?(users\/\d+\/status)$/) && req.method === 'POST') {
    const match = path.match(/users\/(\d+)\/status/);
    const userId = match[1];
    
    const { error } = await supabase
      .from('users')
      .update({ is_active: true })
      .eq('id', userId);

    if (error) return res.status(500).json({ error: 'Failed to activate user' });
    return res.status(200).json({ success: true });
  }

  // DEDUPLICATE
  if ((path === 'deduplicate' || path === '/deduplicate') && req.method === 'POST') {
    const BATCH_SIZE = 10000;
    let offset = 0;
    let hasMore = true;
    const seenMessages = new Map();
    const duplicateIds = [];

    while (hasMore) {
      const { data: batch, error } = await supabase
        .from('messages')
        .select('id, message, sender_id, date_of_creation')
        .range(offset, offset + BATCH_SIZE - 1)
        .order('id', { ascending: true });

      if (error) return res.status(500).json({ error: error.message });
      if (!batch || batch.length === 0) break;

      for (const msg of batch) {
        const key = `${msg.message}|${msg.sender_id}|${msg.date_of_creation}`;
        if (seenMessages.has(key)) {
          duplicateIds.push(msg.id);
        } else {
          seenMessages.set(key, msg.id);
        }
      }

      hasMore = batch.length === BATCH_SIZE;
      offset += BATCH_SIZE;
    }

    const originalCount = seenMessages.size + duplicateIds.length;

    if (duplicateIds.length > 0) {
      const DELETE_BATCH = 1000;
      for (let i = 0; i < duplicateIds.length; i += DELETE_BATCH) {
        const batchToDelete = duplicateIds.slice(i, i + DELETE_BATCH);
        await supabase.from('messages').delete().in('id', batchToDelete);
      }
    }

    const { count: newCount } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true });

    return res.status(200).json({
      success: true,
      originalCount,
      duplicatesRemoved: duplicateIds.length,
      newTotalCount: newCount,
      message: `تم حذف ${duplicateIds.length.toLocaleString('ar-EG')} رسالة مكررة`
    });
  }

  // RESET REQUESTS - GET
  if ((path === 'reset-requests' || path === '/reset-requests') && req.method === 'GET') {
    const { data, error } = await supabase
      .from('password_reset_requests')
      .select('*')
      .eq('status', 'pending')
      .order('requested_at', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ requests: data || [] });
  }

  // RESET REQUESTS - APPROVE/REJECT
  if ((path === 'reset-requests' || path === '/reset-requests') && req.method === 'POST') {
    const body = await parseBody(req);
    const { mobile, action } = body;

    if (action === 'approve') {
      const tempPassword = generateTempPassword(8);
      const hashedPassword = hashPassword(tempPassword);

      const { error: updateError } = await supabase
        .from('users')
        .update({ password: hashedPassword })
        .eq('mobile', mobile);

      if (updateError) return res.status(500).json({ error: updateError.message });

      await supabase
        .from('password_reset_requests')
        .update({ 
          status: 'approved', 
          approved_at: new Date().toISOString(),
          temp_password: tempPassword 
        })
        .eq('mobile', mobile)
        .eq('status', 'pending');

      return res.status(200).json({ success: true, tempPassword });
    }

    if (action === 'reject') {
      await supabase
        .from('password_reset_requests')
        .update({ status: 'rejected' })
        .eq('mobile', mobile)
        .eq('status', 'pending');

      return res.status(200).json({ success: true });
    }

    return res.status(400).json({ error: 'Invalid action' });
  }

  // SUBSCRIPTION - SET
  if ((path === 'subscription' || path === '/subscription') && req.method === 'POST') {
    const body = await parseBody(req);
    const { mobile, days } = body;

    if (!mobile || !days) {
      return res.status(400).json({ error: 'Mobile and days are required' });
    }

    const daysNum = parseInt(days);
    if (isNaN(daysNum) || daysNum < 0) {
      return res.status(400).json({ error: 'Invalid days value' });
    }

    const endDate = new Date();
    endDate.setDate(endDate.getDate() + daysNum);

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

  return res.status(404).json({ error: 'Not found' });
};
