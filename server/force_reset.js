const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
    try {
        console.log('--- INICIANDO RESET DE SENHA ---');

        // 1. Tenta encontrar o usuário
        const existingUser = await prisma.user.findUnique({ where: { username: 'admin' } });

        if (existingUser) {
            console.log('Usuario admin encontrado. Atualizando senha...');
            const hash = await bcrypt.hash('hkemprestimos1', 10);
            await prisma.user.update({
                where: { username: 'admin' },
                data: { password: hash }
            });
        } else {
            console.log('Usuario admin NAO encontrado. Criando novo...');
            const hash = await bcrypt.hash('hkemprestimos1', 10);
            await prisma.user.create({
                data: {
                    username: 'admin',
                    password: hash,
                    name: 'Administrador'
                }
            });
        }

        console.log('--- SUCESSO! ---');
        console.log('Usuario: admin');
        console.log('Senha:   hkemprestimos1');
        console.log('----------------');

    } catch (e) {
        console.error('ERRO FATAL:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
