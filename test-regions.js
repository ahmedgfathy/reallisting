const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://gxyrpboyubpycejlkxue.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd4eXJwYm95dWJweWNlamxreHVlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzEwNjU5OSwiZXhwIjoyMDgyNjgyNTk5fQ.jaQO9OmympAlJqrClhxQ-NFkmp74tB-IpRPqRf0eXvk');

(async () => {
  const allRegions = new Set();
  let offset = 0;
  const batchSize = 1000;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from('messages')
      .select('region')
      .not('region', 'is', null)
      .range(offset, offset + batchSize - 1);

    if (error) {
      console.log('Error:', error.message);
      return;
    }

    if (data === null || data.length === 0) {
      hasMore = false;
    } else {
      data.forEach(row => allRegions.add(row.region));
      offset += batchSize;
      if (data.length < batchSize) hasMore = false;
    }
  }

  console.log('Total unique regions:', allRegions.size);
  const sorted = [...allRegions].sort((a, b) => a.localeCompare(b, 'ar'));
  console.log('Regions:', sorted.slice(0, 30));
})();
