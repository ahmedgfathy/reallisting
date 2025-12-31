const { supabase, corsHeaders } = require('./_lib/supabase');

// This endpoint runs automatically via Vercel Cron (every hour)
// Or you can call it manually: GET /api/clean-mobiles-cron

module.exports = async (req, res) => {
  // Verify cron secret for security
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  Object.entries(corsHeaders).forEach(([k, v]) => res.setHeader(k, v));

  const startTime = Date.now();
  
  try {
    console.log('Starting mobile number cleanup...');
    
    // Get recent messages (last 2 hours) that might contain mobile numbers
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    
    const { data: messages, error: fetchError } = await supabase
      .from('messages')
      .select('id, message')
      .gte('created_at', twoHoursAgo)
      .order('created_at', { ascending: false })
      .limit(1000);

    if (fetchError) {
      console.error('Fetch error:', fetchError);
      return res.status(500).json({ error: 'Failed to fetch messages' });
    }

    // Filter messages containing mobile numbers and clean them
    const mobileRegex = /\b01[0-9]{9}\b/g;
    const updates = [];
    
    for (const msg of messages || []) {
      if (msg.message && mobileRegex.test(msg.message)) {
        const cleaned = msg.message.replace(mobileRegex, '').replace(/\s+/g, ' ').trim();
        updates.push({ id: msg.id, message: cleaned });
      }
    }

    // Update in parallel batches of 10
    let updated = 0;
    for (let i = 0; i < updates.length; i += 10) {
      const batch = updates.slice(i, i + 10);
      await Promise.all(
        batch.map(u => 
          supabase.from('messages').update({ message: u.message }).eq('id', u.id)
        )
      );
      updated += batch.length;
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log(`✓ Cleaned ${updated} messages in ${duration}s`);
    
    return res.status(200).json({
      success: true,
      cleaned: updated,
      checked: messages?.length || 0,
      duration: `${duration}s`
    });

  } catch (error) {
    console.error('Cron error:', error);
    return res.status(500).json({ error: error.message });
  }
};
