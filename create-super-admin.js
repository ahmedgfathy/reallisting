require('dotenv').config();
const { users } = require('./lib/supabase');

async function createSuperAdmin() {
  console.log('🔧 Creating super admin user...\n');

  try {
    const result = await users.create({
      mobile: '01002778090',
      password: 'zerocall',
      name: 'Super Admin',
      role: 'admin',
      isActive: true
    });

    if (result.success) {
      console.log('✅ Super admin user created successfully!');
      console.log('   Mobile: 01002778090');
      console.log('   Password: zerocall');
      console.log('   Role: admin');
      console.log('   Status: Active');
    } else {
      if (result.error === 'User already exists') {
        console.log('ℹ️  User already exists. Updating to admin...');
        
        // Find and update existing user
        const existingUser = await users.findByMobile('01002778090');
        if (existingUser) {
          await users.updateActive(existingUser.id, true);
          console.log('✅ User updated to active admin status');
        }
      } else {
        console.error('❌ Error:', result.error);
      }
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating super admin:', error.message);
    process.exit(1);
  }
}

createSuperAdmin();
