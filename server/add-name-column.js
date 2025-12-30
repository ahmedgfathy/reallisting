#!/usr/bin/env node
/**
 * Add name column to users table
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://gxyrpboyubpycejlkxue.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd4eXJwYm95dWJweWNlamxreHVlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzEwNjU5OSwiZXhwIjoyMDgyNjgyNTk5fQ.jaQO9OmympAlJqrClhxQ-NFkmp74tB-IpRPqRf0eXvk';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function addNameColumn() {
  console.log('Adding name column to users table...');
  
  // Check if column exists by trying to query it
  const { data: testData, error: testError } = await supabase
    .from('users')
    .select('mobile, name')
    .limit(1);
  
  if (testError && testError.message.includes('column') && testError.message.includes('name')) {
    console.log('Column does not exist, need to add it via Supabase Dashboard');
    console.log('\nPlease run this SQL in Supabase SQL Editor:');
    console.log('https://supabase.com/dashboard/project/gxyrpboyubpycejlkxue/sql');
    console.log('\nSQL:');
    console.log('ALTER TABLE users ADD COLUMN IF NOT EXISTS name text;');
    process.exit(1);
  } else if (testError) {
    console.error('Error:', testError.message);
    process.exit(1);
  } else {
    console.log('✅ Column already exists!');
    process.exit(0);
  }
}

addNameColumn();
