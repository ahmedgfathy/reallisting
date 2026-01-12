const { regions, users, initDatabase } = require('./lib/supabase');

async function initializeDatabase() {
  console.log('🔧 Initializing database with sample data...\n');

  try {
    // Initialize database tables
    console.log('📦 Creating database tables...');
    await initDatabase();
    console.log('  ✅ Tables created successfully\n');

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
    for (const regionName of sampleRegions) {
      const result = await regions.create(regionName);
      if (result.success) {
        console.log(`  ✅ Added region: ${regionName}`);
      }
    }

    // Create admin user
    console.log('\n👤 Creating admin user...');
    const adminResult = await users.create({
      mobile: '0500000000',
      password: 'admin123',
      name: 'Admin User',
      role: 'admin',
      isActive: 1
    });
    
    if (adminResult.success) {
      console.log('  ✅ Admin user created successfully');
      console.log('     Mobile: 0500000000');
      console.log('     Password: admin123');
    } else {
      console.log('  ℹ️  Admin user already exists');
    }

    // Create a test broker user
    console.log('\n👤 Creating test broker user...');
    const brokerResult = await users.create({
      mobile: '0500000001',
      password: 'broker123',
      name: 'Test Broker',
      role: 'broker',
      isActive: 0
    });
    
    if (brokerResult.success) {
      console.log('  ✅ Broker user created successfully');
      console.log('     Mobile: 0500000001');
      console.log('     Password: broker123');
      console.log('     Note: This user needs admin approval to be activated');
    } else {
      console.log('  ℹ️  Broker user already exists');
    }

    console.log('\n✅ Database initialization complete!');
    console.log('\n📝 You can now start the server with: npm run server');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error during initialization:', error.message);
    process.exit(1);
  }
}

initializeDatabase().catch(err => {
  console.error('❌ Error initializing database:', err);
  process.exit(1);
});
