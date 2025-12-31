const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://gxyrpboyubpycejlkxue.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd4eXJwYm95dWJweWNlamxreHVlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzEwNjU5OSwiZXhwIjoyMDgyNjgyNTk5fQ.jaQO9OmympAlJqrClhxQ-NFkmp74tB-IpRPqRf0eXvk'
);

(async () => {
  // Use the SAME password hash as the broker users (which you said was working)
  const workingPasswordHash = 'fdb8f38ad0581d93a552f55bc4562d43d5c9ea2b4b57619511969275252a81c2';
  
  console.log('Setting admin password to same as broker users (which was working)...');
  
  const { error } = await supabase
    .from('users')
    .update({ password: workingPasswordHash })
    .eq('mobile', 'admin');
  
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('✓ Admin password updated!');
    console.log('Now try: username=admin, password=admin123');
  }
})();
