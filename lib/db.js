/**
 * Database selector
 * Uses Supabase in production (when SUPABASE_URL is set),
 * falls back to local JSON file database for development.
 */
const SUPABASE_URL =
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (SUPABASE_URL && SUPABASE_KEY) {
  console.log('🗄️  Database: Supabase (production)');
  const adapter = require('./supabase-adapter');
  // Kick off admin seeding on every cold start (Vercel serverless).
  // Fire-and-forget; the build-time seed-admin.js script is the primary seeder.
  adapter.initDatabase().catch((err) =>
    console.error('⚠️  DB background init failed:', err)
  );
  module.exports = adapter;
} else {
  console.log('🗄️  Database: local JSON file (development)');
  module.exports = require('./database');
}
