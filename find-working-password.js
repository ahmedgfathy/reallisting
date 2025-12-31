const crypto = require('crypto');

// The hash in database for admin
const adminHashInDB = '40d565747caab8dbd8feefbd00ee1318ef79ee95e888e527e1d00cb5842800b4';

// Try the password with NO secret (empty string)
const testPassword = 'ZeroCall20!@H';
const hashNoSecret = crypto.createHash('sha256').update(testPassword).digest('hex');

console.log('Testing if password hash was created without JWT_SECRET:');
console.log('  Hash with no secret:', hashNoSecret);
console.log('  Hash in DB:', adminHashInDB);
console.log('  Match:', hashNoSecret === adminHashInDB);
console.log('');

// Try with default secret
const defaultSecret = 'reallisting_secret_key_2025_secure';
const hashWithDefault = crypto.createHash('sha256').update(testPassword + defaultSecret).digest('hex');
console.log('Testing with default JWT_SECRET:');
console.log('  Hash:', hashWithDefault);
console.log('  Match:', hashWithDefault === adminHashInDB);
