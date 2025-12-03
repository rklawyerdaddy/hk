const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
const { addMonths, startOfDay, endOfDay, isBefore, parseISO } = require('date-fns');

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3000;
const SECRET_KEY = 'hk-loans-secret-key-change-this'; // Em produção, usar .env

app.use(cors());
app.use(express.json());

// Middleware de Autenticação
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.sendStatus(401);

    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

// --- AUTENTICAÇÃO ---

app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const user = await prisma.user.findUnique({ where: { username } });
        if (!user) return res.status(400).json({ error: 'Usuário não encontrado' });

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) return res.status(400).json({ error: 'Senha incorreta' });

        const token = jwt.sign({ id: user.id, username: user.username }, SECRET_KEY, { expiresIn: '24h' });
        res.json({ token, name: user.name });
    } catch (error) {
        res.status(500).json({ error: 'Erro no login' });
    }
});

app.post('/register', async (req, res) => {
    const { username, password, name } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await prisma.user.create({
            data: { username, password: hashedPassword, name }
        });
        res.json({ id: user.id, username: user.username });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao criar usuário' });
    }
});

// --- ROTAS DE CLIENTES ---

app.get('/clients', async (req, res) => {
    try {
        const clients = await prisma.client.findMany({
            include: { loans: true },
            orderBy: { name: 'asc' }
        });
        res.json(clients);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar clientes' });
    }
});

app.post('/clients', async (req, res) => {
    try {
        const { name, whatsapp, cpf, rg, address, motherName, pix, bank, observation, rating } = req.body;

        // Converte strings vazias para null para evitar erro de unique constraint
        const client = await prisma.client.create({
            data: {
                name,
                whatsapp: whatsapp || null,
                cpf: cpf || null,
                rg: rg || null,
                address: address || null,
                motherName: motherName || null,
                pix: pix || null,
                bank: bank || null,
                observation: observation || null,
                rating: rating || 5
            }
        });
        res.json(client);
    } catch (error) {
        console.error(error);
        // Verifica se é erro de constraint (P2002)
        if (error.code === 'P2002') {
            return res.status(400).json({ error: 'CPF já cadastrado.' });
        }
        res.status(500).json({ error: 'Erro ao criar cliente.' });
    }
});

app.put('/clients/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, whatsapp, cpf, rg, address, motherName, pix, bank, observation, rating } = req.body;

        const client = await prisma.client.update({
            where: { id },
            data: {
                name,
                whatsapp: whatsapp || null,
                cpf: cpf || null,
                rg: rg || null,
                address: address || null,
                motherName: motherName || null,
                pix: pix || null,
                bank: bank || null,
                observation: observation || null,
                rating: rating
            }
        });
        res.json(client);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao atualizar cliente' });
    }
});

app.delete('/clients/:id', async (req, res) => {
    const { id } = req.params;
    try {
        // Check if client has loans
        const loans = await prisma.loan.findFirst({
            where: { clientId: id }
        });

        if (loans) {
            return res.status(400).json({ error: 'Não é possível excluir cliente com empréstimos vinculados.' });
        }

        await prisma.client.delete({ where: { id } });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao excluir cliente' });
    }
});

app.get('/clients/:id/stats', async (req, res) => {
    const { id } = req.params;
    try {
        const loans = await prisma.loan.findMany({
            where: { clientId: id },
            include: { installments: true }
        });

        let totalLoaned = 0;
        let totalDebt = 0;
        let totalPaid = 0;
        let activeLoansCount = 0;

        loans.forEach(loan => {
            totalLoaned += Number(loan.amount);

            const pendingInstallments = loan.installments.filter(i => i.status === 'PENDING');
            if (pendingInstallments.length > 0) activeLoansCount++;

            loan.installments.forEach(inst => {
                if (inst.status === 'PENDING') {
                    totalDebt += Number(inst.amount);
                } else if (inst.status === 'PAID' || inst.status === 'INTEREST_PAID') {
                    totalPaid += Number(inst.paidAmount);
                }
            });
        });

        res.json({
            totalLoaned,
            totalDebt,
            totalPaid,
            activeLoansCount
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao buscar estatísticas do cliente' });
    }
});

// --- ROTAS DE EMPRÉSTIMOS ---

app.get('/loans', async (req, res) => {
    try {
        const loans = await prisma.loan.findMany({
            include: {
                client: true,
                installments: {
                    orderBy: { dueDate: 'asc' }
                }
            }
        });
        res.json(loans);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar empréstimos' });
    }
});

app.post('/loans', async (req, res) => {
    const { clientId, amount, totalAmount, installmentsCount, startDate } = req.body;

    try {
        // Calcular totais
        const principal = parseFloat(amount);
        const total = parseFloat(totalAmount);

        // Calcular juros implícitos apenas para registro (opcional)
        const totalInterest = total - principal;
        const interestRate = principal > 0 ? (totalInterest / principal) * 100 : 0;

        const installmentValue = total / installmentsCount;

        // Criar Empréstimo e Parcelas em uma transação
        const loan = await prisma.loan.create({
            data: {
                clientId,
                amount: principal,
                interestRate: interestRate, // Mantemos salvo para histórico
                totalAmount: total,
                startDate: new Date(startDate),
                installments: {
                    create: Array.from({ length: installmentsCount }).map((_, index) => ({
                        number: index + 1,
                        amount: installmentValue,
                        dueDate: addMonths(new Date(startDate), index + 1),
                        status: 'PENDING'
                    }))
                }
            },
            include: { installments: true }
        });

        // Registrar Saída no Fluxo de Caixa
        await prisma.transaction.create({
            data: {
                type: 'OUT',
                description: `Empréstimo para Cliente ID: ${clientId}`,
                amount: principal,
                category: 'Empréstimo',
                date: new Date()
            }
        });

        res.json(loan);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao criar empréstimo' });
    }
});

// --- ROTAS DE PARCELAS E PAGAMENTOS ---

app.post('/installments/:id/pay', async (req, res) => {
    const { id } = req.params;
    const { amountPaid, paymentDate, type, nextDueDate } = req.body; // type: 'FULL', 'INTEREST_ONLY'

    try {
        const installment = await prisma.installment.findUnique({
            where: { id },
            include: { loan: true }
        });

        if (!installment) return res.status(404).json({ error: 'Parcela não encontrada' });

        let status = 'PAID';
        let description = `Pagamento Parcela ${installment.number} - ${installment.loan.clientId}`;

        // Transação para garantir consistência
        await prisma.$transaction(async (tx) => {
            if (type === 'INTEREST_ONLY') {
                status = 'INTEREST_PAID';
                description += ' (Apenas Juros)';

                // Criar nova parcela para o próximo mês
                const lastInstallment = await tx.installment.findFirst({
                    where: { loanId: installment.loanId },
                    orderBy: { number: 'desc' }
                });

                const newNumber = (lastInstallment?.number || installment.number) + 1;
                const newDate = nextDueDate ? new Date(nextDueDate) : addMonths(new Date(installment.dueDate), 1);

                await tx.installment.create({
                    data: {
                        loanId: installment.loanId,
                        number: newNumber,
                        amount: installment.amount, // Mantém o valor original (principal)
                        dueDate: newDate,
                        status: 'PENDING'
                    }
                });
            }

            // Atualizar parcela atual
            await tx.installment.update({
                where: { id },
                data: {
                    status: status,
                    paidAmount: parseFloat(amountPaid),
                    paidDate: new Date(paymentDate || new Date())
                }
            });

            // Registrar Entrada no Fluxo de Caixa
            await tx.transaction.create({
                data: {
                    type: 'IN',
                    description: description,
                    amount: parseFloat(amountPaid),
                    category: type === 'INTEREST_ONLY' ? 'Juros' : 'Pagamento Parcela',
                    date: new Date(paymentDate || new Date())
                }
            });
        });

        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao processar pagamento' });
    }
});

app.put('/installments/:id', async (req, res) => {
    const { id } = req.params;
    const { status, paidAmount, paidDate, dueDate, amount } = req.body;

    try {
        const updated = await prisma.installment.update({
            where: { id },
            data: {
                status,
                amount: amount ? parseFloat(amount) : undefined,
                paidAmount: paidAmount ? parseFloat(paidAmount) : undefined,
                paidDate: paidDate ? new Date(paidDate) : null,
                dueDate: dueDate ? new Date(dueDate) : undefined
            }
        });
        res.json(updated);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao atualizar parcela' });
    }
});

app.post('/installments/:id/duplicate', async (req, res) => {
    const { id } = req.params;

    try {
        const installment = await prisma.installment.findUnique({
            where: { id },
            include: { loan: true }
        });

        if (!installment) return res.status(404).json({ error: 'Parcela não encontrada' });

        // Transação para criar parcela e atualizar total do empréstimo
        const result = await prisma.$transaction(async (tx) => {
            // Descobrir o último número de parcela para este empréstimo
            const lastInstallment = await tx.installment.findFirst({
                where: { loanId: installment.loanId },
                orderBy: { number: 'desc' }
            });

            const newNumber = (lastInstallment?.number || installment.number) + 1;
            const newDueDate = addMonths(new Date(installment.dueDate), 1);

            const newInstallment = await tx.installment.create({
                data: {
                    loanId: installment.loanId,
                    number: newNumber,
                    amount: installment.amount,
                    dueDate: newDueDate,
                    status: 'PENDING'
                }
            });

            // Atualizar o valor total do empréstimo
            await tx.loan.update({
                where: { id: installment.loanId },
                data: {
                    totalAmount: {
                        increment: installment.amount
                    }
                }
            });

            return newInstallment;
        });

        res.json(result);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao duplicar parcela' });
    }
});

app.delete('/installments/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await prisma.installment.delete({ where: { id } });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao excluir parcela' });
    }
});

// --- DASHBOARD ---

app.get('/dashboard/summary', async (req, res) => {
    try {
        const totalInvested = await prisma.loan.aggregate({
            _sum: { amount: true }
        });

        const totalReceivable = await prisma.loan.aggregate({
            _sum: { totalAmount: true }
        });

        // Atrasado: Parcelas PENDING com dueDate < hoje
        const today = startOfDay(new Date());
        const lateInstallments = await prisma.installment.aggregate({
            where: {
                status: 'PENDING',
                dueDate: { lt: today }
            },
            _sum: { amount: true }
        });

        // Total Recebido: Soma de paidAmount apenas de parcelas pagas
        const totalReceived = await prisma.installment.aggregate({
            where: {
                status: { in: ['PAID', 'INTEREST_PAID'] }
            },
            _sum: { paidAmount: true }
        });

        res.json({
            totalInvested: totalInvested._sum.amount || 0,
            totalReceivable: totalReceivable._sum.totalAmount || 0,
            totalLate: lateInstallments._sum.amount || 0,
            totalReceived: totalReceived._sum.paidAmount || 0
        });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar resumo' });
    }
});

app.get('/dashboard/alerts', async (req, res) => {
    try {
        const today = new Date();
        const startOfToday = startOfDay(today);
        const endOfToday = endOfDay(today);

        // Vencendo Hoje
        const dueToday = await prisma.installment.findMany({
            where: {
                dueDate: {
                    gte: startOfToday,
                    lte: endOfToday
                },
                status: 'PENDING'
            },
            include: {
                loan: {
                    include: { client: true }
                }
            }
        });

        // Atrasados
        const late = await prisma.installment.findMany({
            where: {
                dueDate: { lt: startOfToday },
                status: 'PENDING'
            },
            include: {
                loan: {
                    include: { client: true }
                }
            }
        });

        res.json({
            dueToday,
            late
        });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar alertas' });
    }
});

app.get('/transactions', async (req, res) => {
    try {
        const transactions = await prisma.transaction.findMany({
            orderBy: { date: 'desc' }
        });
        res.json(transactions);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar transações' });
    }
});

app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
