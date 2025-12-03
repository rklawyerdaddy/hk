const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
const { addMonths, startOfDay, endOfDay, isBefore, parseISO } = require('date-fns');

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3000;
const SECRET_KEY = process.env.JWT_SECRET || 'hk-loans-secret-key-change-this';

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
        const existingUser = await prisma.user.findUnique({ where: { username } });
        if (existingUser) return res.status(400).json({ error: 'Usuário já existe' });

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await prisma.user.create({
            data: { username, password: hashedPassword, name }
        });
        res.json({ id: user.id, username: user.username });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao criar usuário' });
    }
});

// --- ROTAS DE CLIENTES (SaaS) ---

app.get('/clients', authenticateToken, async (req, res) => {
    try {
        const clients = await prisma.client.findMany({
            where: { userId: req.user.id },
            include: { loans: true },
            orderBy: { name: 'asc' }
        });
        res.json(clients);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar clientes' });
    }
});

app.post('/clients', authenticateToken, async (req, res) => {
    try {
        const { name, whatsapp, cpf, rg, address, motherName, pix, bank, observation, rating } = req.body;

        const client = await prisma.client.create({
            data: {
                userId: req.user.id,
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
        if (error.code === 'P2002') {
            return res.status(400).json({ error: 'CPF já cadastrado.' });
        }
        res.status(500).json({ error: 'Erro ao criar cliente.' });
    }
});

app.put('/clients/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, whatsapp, cpf, rg, address, motherName, pix, bank, observation, rating } = req.body;

        // Garante que o cliente pertence ao usuário logado
        const existing = await prisma.client.findFirst({ where: { id, userId: req.user.id } });
        if (!existing) return res.status(404).json({ error: 'Cliente não encontrado' });

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

app.delete('/clients/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    try {
        // Garante que o cliente pertence ao usuário logado
        const existing = await prisma.client.findFirst({ where: { id, userId: req.user.id } });
        if (!existing) return res.status(404).json({ error: 'Cliente não encontrado' });

        // A exclusão agora é em cascata pelo banco de dados (onDelete: Cascade no schema)
        // Mas por segurança, o Prisma lida com isso se configurado corretamente.
        // Se não, precisaríamos deletar loans manualmente. Como configuramos onDelete: Cascade no schema,
        // o delete do client deve levar tudo.

        await prisma.client.delete({ where: { id } });
        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao excluir cliente' });
    }
});

app.get('/clients/:id/stats', authenticateToken, async (req, res) => {
    const { id } = req.params;
    try {
        const existing = await prisma.client.findFirst({ where: { id, userId: req.user.id } });
        if (!existing) return res.status(404).json({ error: 'Cliente não encontrado' });

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

app.get('/loans', authenticateToken, async (req, res) => {
    try {
        // Busca empréstimos apenas dos clientes do usuário
        const loans = await prisma.loan.findMany({
            where: {
                client: {
                    userId: req.user.id
                }
            },
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

app.post('/loans', authenticateToken, async (req, res) => {
    const { clientId, amount, totalAmount, installmentsCount, startDate } = req.body;

    try {
        // Verifica se o cliente pertence ao usuário
        const client = await prisma.client.findFirst({ where: { id: clientId, userId: req.user.id } });
        if (!client) return res.status(403).json({ error: 'Cliente inválido' });

        const principal = parseFloat(amount);
        const total = parseFloat(totalAmount);
        const totalInterest = total - principal;
        const interestRate = principal > 0 ? (totalInterest / principal) * 100 : 0;
        const installmentValue = total / installmentsCount;

        const loan = await prisma.loan.create({
            data: {
                clientId,
                amount: principal,
                interestRate: interestRate,
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
                userId: req.user.id,
                type: 'OUT',
                description: `Empréstimo para Cliente: ${client.name}`,
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

app.post('/installments/:id/pay', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const { amountPaid, paymentDate, type, nextDueDate } = req.body;

    try {
        const installment = await prisma.installment.findUnique({
            where: { id },
            include: { loan: { include: { client: true } } }
        });

        if (!installment) return res.status(404).json({ error: 'Parcela não encontrada' });
        if (installment.loan.client.userId !== req.user.id) return res.status(403).json({ error: 'Acesso negado' });

        let status = 'PAID';
        let description = `Pagamento Parcela ${installment.number} - ${installment.loan.client.name}`;

        await prisma.$transaction(async (tx) => {
            if (type === 'INTEREST_ONLY') {
                status = 'INTEREST_PAID';
                description += ' (Apenas Juros)';

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
                        amount: installment.amount,
                        dueDate: newDate,
                        status: 'PENDING'
                    }
                });
            }

            await tx.installment.update({
                where: { id },
                data: {
                    status: status,
                    paidAmount: parseFloat(amountPaid),
                    paidDate: new Date(paymentDate || new Date())
                }
            });

            await tx.transaction.create({
                data: {
                    userId: req.user.id,
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

app.put('/installments/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const { status, paidAmount, paidDate, dueDate, amount } = req.body;

    try {
        const installment = await prisma.installment.findUnique({
            where: { id },
            include: { loan: { include: { client: true } } }
        });

        if (!installment) return res.status(404).json({ error: 'Parcela não encontrada' });
        if (installment.loan.client.userId !== req.user.id) return res.status(403).json({ error: 'Acesso negado' });

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

app.post('/installments/:id/duplicate', authenticateToken, async (req, res) => {
    const { id } = req.params;

    try {
        const installment = await prisma.installment.findUnique({
            where: { id },
            include: { loan: { include: { client: true } } }
        });

        if (!installment) return res.status(404).json({ error: 'Parcela não encontrada' });
        if (installment.loan.client.userId !== req.user.id) return res.status(403).json({ error: 'Acesso negado' });

        const result = await prisma.$transaction(async (tx) => {
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

app.delete('/installments/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    try {
        const installment = await prisma.installment.findUnique({
            where: { id },
            include: { loan: { include: { client: true } } }
        });

        if (!installment) return res.status(404).json({ error: 'Parcela não encontrada' });
        if (installment.loan.client.userId !== req.user.id) return res.status(403).json({ error: 'Acesso negado' });

        await prisma.installment.delete({ where: { id } });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao excluir parcela' });
    }
});

// --- DASHBOARD ---

app.get('/dashboard/summary', authenticateToken, async (req, res) => {
    try {
        // Agrega apenas dados do usuário
        const totalInvested = await prisma.loan.aggregate({
            where: { client: { userId: req.user.id } },
            _sum: { amount: true }
        });

        const totalReceivable = await prisma.loan.aggregate({
            where: { client: { userId: req.user.id } },
            _sum: { totalAmount: true }
        });

        const today = startOfDay(new Date());
        const lateInstallments = await prisma.installment.aggregate({
            where: {
                loan: { client: { userId: req.user.id } },
                status: 'PENDING',
                dueDate: { lt: today }
            },
            _sum: { amount: true }
        });

        const totalReceived = await prisma.installment.aggregate({
            where: {
                loan: { client: { userId: req.user.id } },
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

app.get('/dashboard/alerts', authenticateToken, async (req, res) => {
    try {
        const today = new Date();
        const startOfToday = startOfDay(today);
        const endOfToday = endOfDay(today);

        const dueToday = await prisma.installment.findMany({
            where: {
                loan: { client: { userId: req.user.id } },
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

        const late = await prisma.installment.findMany({
            where: {
                loan: { client: { userId: req.user.id } },
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

app.get('/transactions', authenticateToken, async (req, res) => {
    try {
        const transactions = await prisma.transaction.findMany({
            where: { userId: req.user.id },
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
