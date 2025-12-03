const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
    const hashedPassword = await bcrypt.hash('Hkemprestimos1!', 10);

    const user = await prisma.user.upsert({
        where: { username: 'admin' },
        update: {
            password: hashedPassword, // Atualiza a senha se o usuário já existir
        },
        create: {
            username: 'admin',
            password: hashedPassword,
            name: 'Administrador',
        },
    });

    console.log({ user });
}

main()
    .then(async () => {
        await prisma.$disconnect();
    })
    .catch(async (e) => {
        console.error(e);
        await prisma.$disconnect();
        process.exit(1);
    });
