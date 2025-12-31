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
  const adminPassword = hashPassword('ZeroCall20!@H');
  
  const { data: existing } = await supabase.from('users').select('*').eq('mobile', 'admin');
  
  if (existing && existing.length > 0) {
    const { error } = await supabase
      .from('users')
      .update({ password: adminPassword, role: 'admin', is_active: true })
      .eq('mobile', 'admin');
    
    if (error) console.error('Error:', error);
    else console.log('✓ Admin password updated successfully!');
  } else {
    const { error } = await supabase
      .from('users')
      .insert([{
        mobile: 'admin',
        password: adminPassword,
        role: 'admin',
        is_active: true
      }]);
    
    if (error) console.error('Error:', error);
    else console.log('✓ Admin user created successfully!');
  }
  
  console.log('\nLogin with:');
  console.log('Username: admin');
  console.log('Password: ZeroCall20!@H');
})();
