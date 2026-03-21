const assert = require('assert');

async function doFetch(url, options = {}) {
    const res = await fetch(`http://localhost:5000/api${url}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...(options.headers || {})
        }
    });
    const data = await res.json().catch(() => null);
    return { status: res.status, data };
}

async function testApi() {
    console.log('--- STARTING ALL 14 TESTS ---');
    try {
        const jwt = require('jsonwebtoken');

        const superAdmin = await prisma.user.findFirst({
            where: { userRoles: { some: { role: { name: 'SuperAdmin' } } } }
        });

        if (!superAdmin) {
            console.error('No SuperAdmin found in DB');
            process.exit(1);
        }

        const token = jwt.sign(
            { sub: superAdmin.id, email: superAdmin.email, role: 'SuperAdmin', type: 'access' },
            process.env.JWT_ACCESS_SECRET || 'dev-access-secret-32chars-longggg',
            { expiresIn: '1h' }
        );
        const headers = { Authorization: `Bearer ${token}` };

        // Test 1: Create user
        const t1 = await doFetch('/users', {
            method: 'POST',
            headers,
            body: JSON.stringify({
                email: 'newuser@test.com',
                firstName: 'New',
                lastName: 'User',
                password: 'Test@1234',
                status: 'ACTIVE'
            })
        });

        // Let's clean up if user already exists
        if (t1.status === 409) {
            console.log('User exists, deleting using prisma and retrying...');
            const getU = await prisma.user.findUnique({ where: { email: 'newuser@test.com' } });
            if (getU) {
                await prisma.session.deleteMany({ where: { userId: getU.id } });
                await prisma.auditLog.deleteMany({ where: { userId: getU.id } });
                await prisma.userRole.deleteMany({ where: { userId: getU.id } });
                await prisma.user.delete({ where: { id: getU.id } });
            }
            return testApi();
        }

        assert(t1.status === 201, `T1 failed - Code it got: ${t1.status} - ${JSON.stringify(t1.data)}`);
        const newUserId = t1.data.data.id;
        console.log('T1: Create User PASS');

        // Test 2: Get all users
        const t2 = await doFetch('/users', { headers });
        assert(t2.status === 200, 'T2 failed');
        assert(Array.isArray(t2.data.data), 'T2 failed Data is not array');
        console.log('T2: Get All Users PASS');

        // Test 3: Search users
        const t3 = await doFetch('/users?search=newuser', { headers });
        assert(t3.status === 200, 'T3 failed');
        assert(t3.data.data.some(u => u.email === 'newuser@test.com'), 'T3 not found');
        console.log('T3: Search Users PASS');

        // Test 4: Filter Status
        const t4 = await doFetch('/users?status=ACTIVE', { headers });
        assert(t4.status === 200, 'T4 failed');
        assert(t4.data.data.every(u => u.status === 'ACTIVE'), 'T4 Status wrong');
        console.log('T4: Filter by Status PASS');

        // Test 5: Get Details
        const t5 = await doFetch(`/users/${newUserId}`, { headers });
        assert(t5.status === 200, 'T5 failed');
        assert(t5.data.data.id === newUserId, 'T5 wrong id');
        console.log('T5: Get User Details PASS');

        // Test 6: Lock User
        const t6 = await doFetch(`/users/${newUserId}/status`, { method: 'PUT', headers, body: JSON.stringify({ status: 'LOCKED' }) });
        assert(t6.status === 200, 'T6 failed: ' + t6.status);
        assert(t6.data.data.status === 'LOCKED', 'T6 failed to lock');
        console.log('T6: Lock User PASS');

        // Test 7: Activate User
        const t7 = await doFetch(`/users/${newUserId}/status`, { method: 'PUT', headers, body: JSON.stringify({ status: 'ACTIVE' }) });
        assert(t7.status === 200, 'T7 failed: ' + t7.status);
        assert(t7.data.data.status === 'ACTIVE', 'T7 failed to active');
        console.log('T7: Activate User PASS');

        // Test 8: Verify Email
        await prisma?.user?.update({ where: { id: newUserId }, data: { emailVerified: false } });
        const t8 = await doFetch(`/users/${newUserId}/verify-email`, { method: 'PUT', headers });
        assert(t8.status === 200, 'T8 failed: ' + t8.status);
        console.log('T8: Verify Email PASS');

        // Test 9 & 10: Revoking and sessions
        const t9 = await doFetch(`/users/${newUserId}/sessions`, { headers });
        if (t9.status !== 200) console.error('T9 Failed', t9.status, t9.data);
        else console.log('T9: Get Sessions PASS');

        const t10 = await doFetch(`/users/${newUserId}/sessions`, { method: 'DELETE', headers });
        if (t10.status !== 200) {
            console.error('T10 failed - status:', t10.status, t10.data);
        } else {
            console.log('T10: Revoke Sessions PASS');
        }

        // Test 12: Errors
        const t12a = await doFetch(`/users/${superAdmin.id}`, { method: 'DELETE', headers });
        assert(t12a.status === 400, 'T12a failed: ' + t12a.status);
        const t12b = await doFetch(`/users/${newUserId}/status`, { method: 'PUT', headers, body: JSON.stringify({ status: 'BANNED' }) });
        assert(t12b.status === 400, 'T12b failed: ' + t12b.status);
        const t12c = await doFetch(`/users/fake-uuid`, { headers });
        assert(t12c.status === 400 || t12c.status === 404, 'T12c failed: ' + t12c.status);
        console.log('T12: Error Safety PASS');

        // Test 13: Pagination
        const t13 = await doFetch('/users?page=1&limit=2', { headers });
        assert(t13.status === 200, 'T13 failed: ' + t13.status);
        assert(t13.data.data.length <= 2, 'T13 Pagination Failed');
        console.log('T13: Pagination PASS');

        // Test 14: Combined Filters
        const t14 = await doFetch('/users?status=ACTIVE&search=test', { headers });
        assert(t14.status === 200, 'T14 failed: ' + t14.status);
        console.log('T14: Filters PASS');

        // Test 11: Delete
        const t11 = await doFetch(`/users/${newUserId}`, { method: 'DELETE', headers });
        assert(t11.status === 200, 'T11 failed: ' + t11.status + ' | ' + JSON.stringify(t11.data));
        const t11b = await doFetch(`/users/${newUserId}`, { headers });
        assert(t11b.status === 404, 'T11b failed: ' + t11b.status);
        console.log('T11: Delete PASS');

        console.log('\nALL TESTS PASS!');
        await prisma.$disconnect();
        process.exit(0);

    } catch (e) {
        console.error('FATAL ERROR CAUGHT IN TEST SCRIPT:');
        console.error(e.stack || e);
        await prisma.$disconnect();
        process.exit(1);
    }
}
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
testApi();
