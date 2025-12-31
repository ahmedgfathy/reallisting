const crypto = require('crypto');

const targetHash = 'fdb8f38ad0581d93a552f55bc4562d43d5c9ea2b4b57619511969275252a81c2';
const passwords = ['admin123', 'Admin123', '123456', 'password', 'test123'];

console.log('Target hash:', targetHash);
console.log('\nTesting with NO JWT_SECRET:');
passwords.forEach(pwd => {
  const hash = crypto.createHash('sha256').update(pwd).digest('hex');
  console.log(`  ${pwd}: ${hash}`);
  if (hash === targetHash) {
    console.log(`  ✓✓✓ MATCH!`);
  }
});
