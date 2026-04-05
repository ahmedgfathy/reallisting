const fs = require('fs');
const path = require('path');

const dbFile = path.join(__dirname, '..', 'data', 'reallisting.json');

if (!fs.existsSync(dbFile)) {
  console.log(`Database file not found: ${dbFile}`);
  process.exit(0);
}

const db = JSON.parse(fs.readFileSync(dbFile, 'utf8'));

console.log(`DB file: ${dbFile}`);
console.log(`Users: ${db.users?.length || 0}`);
console.log(`Messages: ${db.messages?.length || 0}`);
console.log(`Regions: ${db.regions?.length || 0}`);
console.log('');

if (Array.isArray(db.users) && db.users.length > 0) {
  console.log('Users sample:');
  db.users.slice(0, 5).forEach((user) => {
    console.log(`- ${user.mobile} | ${user.role} | active=${!!user.is_active}`);
  });
  console.log('');
}

if (Array.isArray(db.messages) && db.messages.length > 0) {
  console.log('Messages sample:');
  db.messages.slice(0, 5).forEach((message) => {
    console.log(`- ${message.region} | ${message.property_type} | ${String(message.message || '').slice(0, 80)}`);
  });
}
