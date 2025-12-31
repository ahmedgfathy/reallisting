const crypto = require('crypto');
const JWT_SECRET = 'reallisting_secret_key_2025_secure';

// The working hash
const targetHash = 'fdb8f38ad0581d93a552f55bc4562d43d5c9ea2b4b57619511969275252a81c2';

// Try various passwords
const passwords = [
  'admin123',
  'Admin123', 
  '123456',
  'password',
  '01002778090',
  'ZeroCall20!@H',
  'zerocall20',
  'admin',
  '1234',
  '12345678'
];

console.log('Searching for password that matches broker hash...\n');

passwords.forEach(pwd => {
  const hash = crypto.createHash('sha256').update(pwd + JWT_SECRET).digest('hex');
  if (hash === targetHash) {
    console.log(`✓✓✓ FOUND IT! Password is: "${pwd}"`);
  }
});

console.log('\nIf no match found, the password might be different or JWT_SECRET on Vercel is different.');
