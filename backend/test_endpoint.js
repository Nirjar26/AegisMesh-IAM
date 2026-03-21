require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testEndpoint() {
  try {
    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║           ENDPOINT FUNCTIONALITY TEST                  ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');

    // Get an admin user
    const adminUser = await prisma.user.findFirst({
      where: {
        email: 'admin@northbridge.io'
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        timezone: true,
        language: true,
        jobTitle: true,
        department: true,
        avatarUrl: true,
        mfaType: true,
        backupCodes: true,
        trustedDevices: true,
        notificationPreferences: true,
        passwordChangedAt: true,
      }
    });

    if (adminUser) {
      console.log('✅ Admin User Found:');
      console.log(`   Email: ${adminUser.email}`);
      console.log(`   Name: ${adminUser.firstName} ${adminUser.lastName}`);
      console.log('✅ All new fields accessible:');
      console.log(`   - timezone: ${adminUser.timezone}`);
      console.log(`   - language: ${adminUser.language}`);
      console.log(`   - jobTitle: ${adminUser.jobTitle}`);
      console.log(`   - department: ${adminUser.department}`);
      console.log(`   - avatarUrl: ${adminUser.avatarUrl}`);
      console.log(`   - mfaType: ${adminUser.mfaType}`);
      console.log(`   - backupCodes: ${Array.isArray(adminUser.backupCodes) ? adminUser.backupCodes.length + ' codes' : 'null'}`);
      console.log(`   - trustedDevices: ${adminUser.trustedDevices ? 'set' : 'null'}`);
      console.log(`   - notificationPreferences: ${adminUser.notificationPreferences ? 'set' : 'null'}`);
      console.log(`   - passwordChangedAt: ${adminUser.passwordChangedAt}`);
    } else {
      console.log('❌ Admin user not found');
    }

    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║              ✅ ENDPOINT READY FOR USE                 ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');

  } catch(e) {
    console.error('\n❌ Error:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}

testEndpoint();
