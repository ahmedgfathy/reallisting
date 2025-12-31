const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const supabase = createClient(
  'https://gxyrpboyubpycejlkxue.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd4eXJwYm95dWJweWNlamxreHVlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzEwNjU5OSwiZXhwIjoyMDgyNjgyNTk5fQ.jaQO9OmympAlJqrClhxQ-NFkmp74tB-IpRPqRf0eXvk'
);

(async () => {
  // Delete existing admin
  await supabase.from('users').delete().eq('mobile', 'admin');
  
  // Create with simple password that will work
  const simplePassword = 'admin123';
  const JWT_SECRET = 'reallisting_secret_key_2025_secure';
  const hash = crypto.createHash('sha256').update(simplePassword + JWT_SECRET).digest('hex');
  
  const { error } = await supabase
    .from('users')
    .insert([{
      mobile: 'admin',
      password: hash,
      role: 'admin',
      is_active: true
    }]);
  
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('✓ Admin created with password: admin123');
    console.log('Password hash:', hash);
  }
})();
