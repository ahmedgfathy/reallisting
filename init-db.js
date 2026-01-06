const { regions, users, db } = require('./lib/sqlite');

console.log('🔧 Initializing database with sample data...\n');

// Create sample regions
const sampleRegions = [
  'الحي الأول',
  'الحي الثاني',
  'الحي الثالث',
  'الحي الرابع',
  'الحي الخامس',
  'العليا',
  'الملقا',
  'النسيم',
  'الرمال',
  'المروج',
  'أخرى'
];

console.log('📍 Adding sample regions...');
sampleRegions.forEach(regionName => {
  const result = regions.create(regionName);
  if (result.success) {
    console.log(`  ✅ Added region: ${regionName}`);
  }
});

// Create admin user
console.log('\n👤 Creating admin user...');
const adminResult = users.create('0500000000', 'admin123', 'Admin User');
if (adminResult.success) {
  // Update to admin role and activate
  const adminUser = users.findByMobile('0500000000');
  if (adminUser) {
    const stmt = db.prepare('UPDATE users SET role = ?, is_active = ? WHERE id = ?');
    stmt.run('admin', 1, adminUser.id);
    console.log('  ✅ Admin user created successfully');
    console.log('     Mobile: 0500000000');
    console.log('     Password: admin123');
  }
}

// Create a test broker user
console.log('\n👤 Creating test broker user...');
const brokerResult = users.create('0500000001', 'broker123', 'Test Broker');
if (brokerResult.success) {
  console.log('  ✅ Broker user created successfully');
  console.log('     Mobile: 0500000001');
  console.log('     Password: broker123');
  console.log('     Note: This user needs admin approval to be activated');
}

console.log('\n✅ Database initialization complete!');
console.log('\n📝 You can now start the server with: npm run server');
