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
  // Delete all admin users
  await supabase.from('users').delete().eq('role', 'admin');
  
  // Create fresh admin with simple password
  const adminPassword = 'admin';
  const hash = hashPassword(adminPassword);
  
  const { error } = await supabase.from('users').insert([{
    mobile: 'admin',
    password: hash,
    role: 'admin',
    is_active: true
  }]);
  
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('✓ Fresh admin created');
    console.log('Username: admin');
    console.log('Password: admin');
    console.log('Hash:', hash);
    
    // Test the query that the API uses
    console.log('\nTesting API query...');
    const { data: users } = await supabase
      .from('users')
      .select('*')
      .eq('mobile', 'admin')
      .eq('password', hash)
      .limit(1);
    
    if (users && users.length > 0) {
      console.log('✓ Query works! User found:', users[0].mobile, users[0].role);
    } else {
      console.log('❌ Query failed - no user found');
    }
  }
})();
