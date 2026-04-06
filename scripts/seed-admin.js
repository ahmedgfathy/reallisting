/**
 * Seed Admin Users into Supabase
 *
 * Usage:
 *   SUPABASE_URL=https://xxx.supabase.co \
 *   SUPABASE_SERVICE_ROLE_KEY=your-key \
 *   node scripts/seed-admin.js
 *
 * This script upserts two admin accounts that are needed to start the app:
 *   - admin    / Admin@2025
 *   - xinreal  / zerocall
 *
 * It is safe to run multiple times (uses ON CONFLICT upsert).
 */

require('dotenv').config();
const crypto = require('crypto');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.log(
    'ℹ️  Skipping admin seed: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY/SUPABASE_ANON_KEY not set.'
  );
  process.exit(0);
}

// Use the same priority as lib/supabase.js so the hash matches at login time
const JWT_SECRET =
  process.env.SUPABASE_JWT_SECRET ||
  process.env.JWT_SECRET ||
  'reallisting_secret_key_2025_secure';

// NOTE: SHA-256 is used here for consistency with the existing hashing scheme
// already established across lib/database.js, lib/supabase.js, and
// lib/supabase-adapter.js. Changing the algorithm would invalidate all
// existing stored passwords and is outside the scope of this seed script.
function hashPassword(password) {
  return crypto
    .createHash('sha256')
    .update(String(password) + JWT_SECRET)
    .digest('hex');
}

const adminUsers = [
  {
    id: 'c1f6e1ad5f7d65ec2ae6fdcf375839e8',
    mobile: 'admin',
    password: 'Admin@2025',
    name: 'Super Admin',
    role: 'admin',
    is_active: true
  },
  {
    id: '0faf85ee1c377fa2e23d099536d2870d',
    mobile: 'xinreal',
    password: 'zerocall',
    name: 'XinReal Admin',
    role: 'admin',
    is_active: true
  }
];

async function seedAdmins() {
  // Dynamically import to avoid issues in environments without the package
  let createClient;
  try {
    ({ createClient } = require('@supabase/supabase-js'));
  } catch {
    console.error('❌  @supabase/supabase-js not installed. Run: npm install @supabase/supabase-js');
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  for (const user of adminUsers) {
    const record = {
      id: user.id,
      mobile: user.mobile,
      password: hashPassword(user.password),
      name: user.name,
      role: user.role,
      is_active: user.is_active
    };

    const { error } = await supabase
      .from('users')
      .upsert(record, { onConflict: 'mobile' });

    if (error) {
      console.error(`❌  Failed to upsert user "${user.mobile}":`, error.message);
    } else {
      console.log(`✅  Upserted admin user: ${user.mobile} (role: ${user.role})`);
    }
  }
}

seedAdmins().catch((err) => {
  console.error('Unexpected error:', err.message);
  process.exit(1);
});
