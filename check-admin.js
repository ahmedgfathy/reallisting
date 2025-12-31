const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const supabase = createClient(
  'https://gxyrpboyubpycejlkxue.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd4eXJwYm95dWJweWNlamxreHVlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzEwNjU5OSwiZXhwIjoyMDgyNjgyNTk5fQ.jaQO9OmympAlJqrClhxQ-NFkmp74tB-IpRPqRf0eXvk'
);

const JWT_SECRET = 'reallisting_secret_key_2025_secure';
function hashPassword(password) {
  return crypto.createHash('sha256').update(password + JWT_SECRET).digest('hex');
}

(async () => {
  const passwordHash = hashPassword('ZeroCall20!@H');
  console.log('Looking for admin with password hash:', passwordHash);
  
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('mobile', 'admin')
    .eq('password', passwordHash);
  
  if (error) {
    console.error('Error:', error);
  } else if (!data || data.length === 0) {
    console.log('❌ No admin user found with this password');
    
    // Check if admin exists with different password
    const { data: adminCheck } = await supabase
      .from('users')
      .select('mobile, role, password')
      .eq('mobile', 'admin');
    
    if (adminCheck && adminCheck.length > 0) {
      console.log('Admin exists but password hash does not match:');
      console.log('  DB hash:', adminCheck[0].password);
      console.log('  Expected:', passwordHash);
    } else {
      console.log('❌ No admin user found at all!');
    }
  } else {
    console.log('✓ Admin found:', data[0]);
  }
})();
