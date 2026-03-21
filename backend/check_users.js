const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const count = await prisma.user.count();
    const users = await prisma.user.findMany({
        select: { email: true, createdAt: true }
    });
    console.log(`Total users: ${count}`);
    console.log('Users:', JSON.stringify(users, null, 2));
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
