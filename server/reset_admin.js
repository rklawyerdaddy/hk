const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
    try {
        console.log('Iniciando reset do usuario admin...');

        // Remove usuário existente para evitar conflitos
        const deleted = await prisma.user.deleteMany({
            where: { username: 'admin' }
        });
        console.log(`Usuarios removidos: ${deleted.count}`);

        // Cria novo usuário com a senha 'semnada'
        const hashedPassword = await bcrypt.hash('semnada', 10);

        const user = await prisma.user.create({
            data: {
                username: 'admin',
                password: hashedPassword,
                name: 'Administrador'
            }
        });

        console.log('-------------------------------------------');
        console.log('SUCESSO! Novo usuario criado.');
        console.log('Usuario: admin');
        console.log('Senha:   semnada');
        console.log('-------------------------------------------');

    } catch (e) {
        console.error('ERRO ao resetar usuario:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
