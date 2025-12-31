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
  const username = 'admin';
  const password = 'ZeroCall20!@H';
  const loginIdentifier = username;
  const hashedPassword = hashPassword(password);
  
  console.log('Testing login query:');
  console.log('  username:', username);
  console.log('  password hash:', hashedPassword);
  
  const { data: users, error } = await supabase
    .from('users')
    .select('*')
    .eq('mobile', loginIdentifier)
    .eq('password', hashedPassword)
    .limit(1);

  if (error) {
    console.error('❌ Database error:', error);
  } else if (!users || users.length === 0) {
    console.log('❌ No user found - LOGIN FAILED');
  } else {
    console.log('✓ Login successful!');
    console.log('User:', users[0]);
  }
})();
