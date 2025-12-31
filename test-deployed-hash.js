const crypto = require('crypto');

// Test with different JWT secrets
const passwords = ['ZeroCall20!@H'];
const secrets = [
  'reallisting_secret_key_2025_secure',
  process.env.JWT_SECRET || 'not set'
];

console.log('Testing password hashes with different secrets:\n');

passwords.forEach(pwd => {
  console.log(`Password: ${pwd}`);
  secrets.forEach(secret => {
    const hash = crypto.createHash('sha256').update(pwd + secret).digest('hex');
    console.log(`  Secret: ${secret}`);
    console.log(`  Hash: ${hash}`);
  });
  console.log('');
});

// The hash in DB
console.log('Hash in database: 40d565747caab8dbd8feefbd00ee1318ef79ee95e888e527e1d00cb5842800b4');
