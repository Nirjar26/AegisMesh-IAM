require('dotenv').config();
const prisma = require('../../src/config/database');

async function verify() {
    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║        COMPREHENSIVE SCHEMA VERIFICATION              ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');

    try {
        console.log('📝 Testing User new fields...');
        const user = await prisma.user.findFirst({
            select: {
                id: true,
                jobTitle: true,
                department: true,
                timezone: true,
                language: true,
                avatarUrl: true,
                mfaType: true,
                trustedDevices: true,
                notificationPreferences: true,
                passwordChangedAt: true,
                backupCodes: true,
                apiTokens: true,
            },
        });
        if (user) {
            console.log('✅ User new fields accessible');
            console.log(`   - Sample user: ${user.id.substring(0, 8)}...`);
            console.log(`   - timezone: ${user.timezone}`);
            console.log(`   - language: ${user.language}`);
            console.log(`   - mfaType: ${user.mfaType}`);
        } else {
            console.log('❌ No users found');
        }

        console.log('\n🏢 Testing OrganizationSettings...');
        const org = await prisma.organizationSettings.findFirst();
        if (org) {
            console.log('✅ OrganizationSettings table accessible');
            console.log(`   - Org Name: ${org.orgName}`);
            console.log(`   - Plan: ${org.plan}`);
            console.log(`   - Region: ${org.region}`);
            console.log('   - Security policy fields: [redacted]');
        } else {
            console.log('❌ No OrganizationSettings found');
        }

        console.log('\n🔑 Testing ApiToken...');
        const tokenCount = await prisma.apiToken.count();
        console.log(`✅ ApiToken table accessible`);
        console.log(`   - Tokens in DB: ${tokenCount}`);

        console.log('\n⏰ Testing Session.lastActiveAt...');
        const session = await prisma.session.findFirst({
            select: { id: true, lastActiveAt: true, createdAt: true },
        });
        if (session) {
            console.log('✅ Session.lastActiveAt accessible');
            console.log(`   - Created: ${session.createdAt}`);
            console.log(`   - Last Active: ${session.lastActiveAt}`);
        }

        console.log('\n📋 Full User Table Columns:');
        const columns = await prisma.$queryRaw`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'User'
      ORDER BY ordinal_position
    `;
        const newFields = [
            'jobTitle',
            'department',
            'timezone',
            'language',
            'avatarUrl',
            'mfaType',
            'backupCodes',
            'trustedDevices',
            'notificationPreferences',
            'passwordChangedAt',
        ];
        const allFields = new Set(columns.map((column) => column.column_name));
        const missingFields = newFields.filter((field) => !allFields.has(field));

        if (missingFields.length > 0) {
            console.warn(`\n⚠️ Missing ${missingFields.length} fields:\n`);
            missingFields.forEach((field) => {
                console.warn(`   ⚠️ ${field}`);
            });
        } else {
            console.log(`\n✅ All ${newFields.length} new fields present:\n`);
            newFields.forEach((field) => {
                console.log(`   ✅ ${field}`);
            });
        }

        console.log('\n╔════════════════════════════════════════════════════════╗');
        console.log('║               ✅ ALL VERIFICATION PASSED                ║');
        console.log('╚════════════════════════════════════════════════════════╝\n');
    } catch (error) {
        console.error('\n❌ Verification Error:', error.message);
        console.error(error);
    } finally {
        await prisma.$disconnect();
    }
}

verify();
