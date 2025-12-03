import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import api from '../services/api';
import { Plus, ChevronDown, ChevronUp, Pencil, X, Save, Copy, Trash, RefreshCw, AlertTriangle } from 'lucide-react';
import clsx from 'clsx';

const Loans = () => {
    const [loans, setLoans] = useState([]);
    const [clients, setClients] = useState([]);
    const [partners, setPartners] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [expandedLoan, setExpandedLoan] = useState(null);

    // Estados para edição
    const [editingId, setEditingId] = useState(null);
    const [editData, setEditData] = useState({});

    // Estado para Modal de Renovação (Só Juros)
    const [renewalModal, setRenewalModal] = useState({
        open: false,
        installmentId: null,
        amount: 0,
        nextDueDate: ''
    });

    // Estado para Modal de Renegociação Total
    const [renegotiateModal, setRenegotiateModal] = useState({
        open: false,
        loan: null,
        newTotalAmount: '',
        newInstallmentsCount: '',
        newStartDate: '',
        paidAmountEntry: ''
    });

    const [formData, setFormData] = useState({
        clientId: '',
        partnerId: '',
        amount: '',
        totalAmount: '',
        installmentsCount: '',
        startDate: new Date().toISOString().split('T')[0]
    });

    useEffect(() => {
        loadLoans();
        loadClients();
        loadPartners();
    }, []);

    const loadLoans = async () => {
        const response = await api.get('/loans');
        setLoans(response.data);
    };

    const loadClients = async () => {
        const response = await api.get('/clients');
        setClients(response.data);
    };

    const loadPartners = async () => {
        try {
            const response = await api.get('/partners');
            setPartners(response.data);
        } catch (error) {
            console.error("Erro ao carregar parceiros");
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await api.post('/loans', {
                ...formData,
                installmentsCount: formData.installmentsCount || 1
            });
            setShowForm(false);
            setFormData({
                clientId: '',
                partnerId: '',
                amount: '',
                totalAmount: '',
                installmentsCount: '',
                startDate: new Date().toISOString().split('T')[0]
            });
            loadLoans();
        } catch (error) {
            alert('Erro ao criar empréstimo');
        }
    };

    const handlePayment = async (installmentId, amount, type, nextDueDate = null) => {
        try {
            await api.post(`/installments/${installmentId}/pay`, {
                amountPaid: amount,
                type, // 'FULL' or 'INTEREST_ONLY'
                nextDueDate
            });
            loadLoans();
            setRenewalModal({ open: false, installmentId: null, amount: 0, nextDueDate: '' });
        } catch (error) {
            alert('Erro ao registrar pagamento');
        }
    };

    const handleDuplicate = async (installmentId) => {
        if (!confirm('Deseja duplicar esta parcela para o próximo mês?')) return;
        try {
            await api.post(`/installments/${installmentId}/duplicate`);
            loadLoans();
        } catch (error) {
            alert('Erro ao duplicar parcela');
        }
    };

    const handleDeleteInstallment = async (installmentId) => {
        if (!confirm('Tem certeza que deseja excluir esta parcela?')) return;
        try {
            await api.delete(`/installments/${installmentId}`);
            loadLoans();
        } catch (error) {
            alert('Erro ao excluir parcela');
        }
    };

    const handleDeleteLoan = async (loanId) => {
        if (!confirm('ATENÇÃO: Tem certeza que deseja excluir este empréstimo COMPLETO? Todas as parcelas e histórico serão apagados.')) return;
        try {
            await api.delete(`/loans/${loanId}`);
            loadLoans();
        } catch (error) {
            alert('Erro ao excluir empréstimo');
        }
    };

    const handleRenegotiate = async (e) => {
        e.preventDefault();
        try {
            await api.post(`/loans/${renegotiateModal.loan.id}/renegotiate`, {
                newTotalAmount: renegotiateModal.newTotalAmount,
                newInstallmentsCount: renegotiateModal.newInstallmentsCount,
                newStartDate: renegotiateModal.newStartDate,
                paidAmountEntry: renegotiateModal.paidAmountEntry
            });
            setRenegotiateModal({ open: false, loan: null, newTotalAmount: '', newInstallmentsCount: '', newStartDate: '', paidAmountEntry: '' });
            loadLoans();
            alert('Empréstimo renegociado com sucesso!');
        } catch (error) {
            alert('Erro ao renegociar empréstimo');
        }
    };

    const [paymentModal, setPaymentModal] = useState({
        open: false,
        installmentId: null,
        amount: 0
    });

    const openPaymentModal = (inst) => {
        setPaymentModal({
            open: true,
            installmentId: inst.id,
            amount: inst.amount
        });
    };

    const confirmPayment = async () => {
        await handlePayment(paymentModal.installmentId, paymentModal.amount, 'FULL');
        setPaymentModal({ open: false, installmentId: null, amount: 0 });
    };

    const openRenewalModal = (inst, loan) => {
        const currentDue = new Date(inst.dueDate);
        const nextMonth = new Date(currentDue.setMonth(currentDue.getMonth() + 1));
        const totalInterest = loan.totalAmount - loan.amount;
        const interestPerInstallment = totalInterest / loan.installments.length;

        setRenewalModal({
            open: true,
            installmentId: inst.id,
            amount: interestPerInstallment.toFixed(2),
            nextDueDate: nextMonth.toISOString().split('T')[0]
        });
    };

    const startEditing = (inst) => {
        setEditingId(inst.id);
        setEditData({
            status: inst.status,
            amount: inst.amount,
            paidDate: inst.paidDate ? inst.paidDate.split('T')[0] : '',
            dueDate: inst.dueDate ? inst.dueDate.split('T')[0] : ''
        });
    };

    const saveEdit = async () => {
        try {
            const payload = { ...editData };
            if (editData.status === 'PAID' || editData.status === 'INTEREST_PAID') {
                payload.paidAmount = editData.amount;
            }
            await api.put(`/installments/${editingId}`, payload);
            setEditingId(null);
            loadLoans();
        } catch (error) {
            alert('Erro ao atualizar parcela');
        }
    };

    return (
        <Layout>
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-slate-800">Empréstimos</h2>
                    <button
                        onClick={() => setShowForm(!showForm)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium transition-colors shadow-lg shadow-blue-600/20"
                    >
                        <Plus size={20} />
                        Novo Empréstimo
                    </button>
                </div>

                {/* Modal de Renovação (Só Juros) */}
                {renewalModal.open && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                        <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in duration-200">
                            <h3 className="font-bold text-lg mb-4 text-slate-800">Renovar Parcela (Só Juros)</h3>
                            <p className="text-sm text-slate-600 mb-4">
                                Ao pagar apenas os juros, uma nova parcela será criada para o próximo mês.
                            </p>

                            <label className="block text-sm font-medium text-slate-700 mb-1">Valor dos Juros (R$)</label>
                            <input
                                type="number"
                                className="border p-3 rounded-lg w-full mb-4 outline-none focus:ring-2 focus:ring-blue-500"
                                value={renewalModal.amount}
                                onChange={e => setRenewalModal({ ...renewalModal, amount: e.target.value })}
                            />

                            <label className="block text-sm font-medium text-slate-700 mb-1">Nova Data de Vencimento</label>
                            <input
                                type="date"
                                className="border p-3 rounded-lg w-full mb-6 outline-none focus:ring-2 focus:ring-blue-500"
                                value={renewalModal.nextDueDate}
                                onChange={e => setRenewalModal({ ...renewalModal, nextDueDate: e.target.value })}
                            />

                            <div className="flex justify-end gap-2">
                                <button
                                    onClick={() => setRenewalModal({ ...renewalModal, open: false })}
                                    className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={() => handlePayment(renewalModal.installmentId, renewalModal.amount || 0, 'INTEREST_ONLY', renewalModal.nextDueDate)}
                                    className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors"
                                >
                                    Confirmar Renovação
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Modal de Renegociação Total */}
                {renegotiateModal.open && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                        <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in duration-200">
                            <div className="flex items-center gap-3 mb-4 text-purple-600">
                                <RefreshCw size={24} />
                                <h3 className="font-bold text-lg text-slate-800">Renegociar Empréstimo</h3>
                            </div>

                            <div className="bg-purple-50 p-4 rounded-lg mb-4 text-sm text-purple-800 border border-purple-100">
                                <p className="font-bold">Atenção:</p>
                                <p>Isso encerrará o empréstimo atual e criará um novo com o saldo devedor restante.</p>
                            </div>

                            <form onSubmit={handleRenegotiate}>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Entrada (Opcional)</label>
                                        <input
                                            type="number"
                                            placeholder="Valor pago na renegociação"
                                            className="border p-3 rounded-lg w-full outline-none focus:ring-2 focus:ring-purple-500"
                                            value={renegotiateModal.paidAmountEntry}
                                            onChange={e => setRenegotiateModal({ ...renegotiateModal, paidAmountEntry: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Novo Total a Pagar</label>
                                        <input
                                            type="number"
                                            required
                                            className="border p-3 rounded-lg w-full outline-none focus:ring-2 focus:ring-purple-500"
                                            value={renegotiateModal.newTotalAmount}
                                            onChange={e => setRenegotiateModal({ ...renegotiateModal, newTotalAmount: e.target.value })}
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Parcelas</label>
                                            <input
                                                type="number"
                                                required
                                                className="border p-3 rounded-lg w-full outline-none focus:ring-2 focus:ring-purple-500"
                                                value={renegotiateModal.newInstallmentsCount}
                                                onChange={e => setRenegotiateModal({ ...renegotiateModal, newInstallmentsCount: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">1ª Parcela</label>
                                            <input
                                                type="date"
                                                required
                                                className="border p-3 rounded-lg w-full outline-none focus:ring-2 focus:ring-purple-500"
                                                value={renegotiateModal.newStartDate}
                                                onChange={e => setRenegotiateModal({ ...renegotiateModal, newStartDate: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="flex justify-end gap-2 mt-6">
                                    <button
                                        type="button"
                                        onClick={() => setRenegotiateModal({ ...renegotiateModal, open: false })}
                                        className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors shadow-lg shadow-purple-600/20"
                                    >
                                        Confirmar Renegociação
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Modal de Pagamento Total */}
                {paymentModal.open && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                        <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in duration-200">
                            <h3 className="font-bold text-lg mb-4 text-slate-800">Confirmar Pagamento</h3>
                            <p className="text-sm text-slate-600 mb-4">
                                Confirme o valor do pagamento total desta parcela.
                            </p>

                            <label className="block text-sm font-medium text-slate-700 mb-1">Valor Pago (R$)</label>
                            <input
                                type="number"
                                className="border p-3 rounded-lg w-full mb-6 outline-none focus:ring-2 focus:ring-green-500"
                                value={paymentModal.amount}
                                onChange={e => setPaymentModal({ ...paymentModal, amount: e.target.value })}
                            />

                            <div className="flex justify-end gap-2">
                                <button
                                    onClick={() => setPaymentModal({ ...paymentModal, open: false })}
                                    className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={confirmPayment}
                                    className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors shadow-lg shadow-green-600/20"
                                >
                                    Confirmar Pagamento
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {showForm && (
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 animate-in fade-in slide-in-from-top-4">
                        <h3 className="font-bold mb-4 text-slate-800">Novo Empréstimo</h3>
                        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <select
                                className="border p-3 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                                value={formData.clientId}
                                onChange={e => setFormData({ ...formData, clientId: e.target.value })}
                                required
                            >
                                <option value="">Selecione o Cliente</option>
                                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>

                            <select
                                className="border p-3 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                                value={formData.partnerId}
                                onChange={e => setFormData({ ...formData, partnerId: e.target.value })}
                            >
                                <option value="">Parceiro / Indicação (Opcional)</option>
                                {partners.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>

                            <input
                                type="number"
                                placeholder="Valor Emprestado (R$)"
                                className="border p-3 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                                value={formData.amount}
                                onChange={e => setFormData({ ...formData, amount: e.target.value })}
                                required
                            />

                            <div className="flex gap-2">
                                <input
                                    type="number"
                                    placeholder="Total a Pagar (R$)"
                                    className="border p-3 rounded-lg w-1/2 outline-none focus:ring-2 focus:ring-blue-500"
                                    value={formData.totalAmount}
                                    onChange={e => setFormData({ ...formData, totalAmount: e.target.value })}
                                    required
                                />
                                <input
                                    type="number"
                                    placeholder="(Nº Parcelas)"
                                    className="border p-3 rounded-lg w-1/2 outline-none focus:ring-2 focus:ring-blue-500"
                                    value={formData.installmentsCount}
                                    onChange={e => setFormData({ ...formData, installmentsCount: e.target.value })}
                                    required
                                />
                            </div>

                            <input
                                type="date"
                                className="border p-3 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                                value={formData.startDate}
                                onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                                required
                            />

                            {formData.totalAmount && formData.installmentsCount && (
                                <div className="md:col-span-2 bg-blue-50 p-4 rounded-lg text-sm text-blue-800 border border-blue-100">
                                    Previsão: {formData.installmentsCount}x de
                                    <strong> {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(formData.totalAmount / formData.installmentsCount)}</strong>
                                </div>
                            )}

                            <div className="md:col-span-2 flex justify-end gap-2 mt-2">
                                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors">Cancelar</button>
                                <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-md">Gerar Empréstimo</button>
                            </div>
                        </form>
                    </div>
                )}

                <div className="space-y-4">
                    {loans.map((loan) => (
                        <div key={loan.id} className={clsx(
                            "bg-white rounded-xl shadow-sm border overflow-hidden transition-all",
                            loan.status === 'RENEGOTIATED' ? "border-purple-200 opacity-75" : "border-slate-200"
                        )}>
                            <div
                                className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors"
                                onClick={() => setExpandedLoan(expandedLoan === loan.id ? null : loan.id)}
                            >
                                <div className="flex items-center gap-4">
                                    <div className={clsx(
                                        "p-2 rounded-lg",
                                        loan.status === 'RENEGOTIATED' ? "bg-purple-100 text-purple-600" : "bg-blue-100 text-blue-600"
                                    )}>
                                        {expandedLoan === loan.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-slate-800 flex items-center gap-2">
                                            {loan.client.name}
                                            {loan.status === 'RENEGOTIATED' && (
                                                <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full border border-purple-200">
                                                    Renegociado
                                                </span>
                                            )}
                                        </h4>
                                        <p className="text-sm text-slate-500">
                                            {new Date(loan.startDate).toLocaleDateString('pt-BR')} • {loan.installments.length}x
                                            {loan.partner && <span className="ml-2 text-blue-500">• Indicação: {loan.partner.name}</span>}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="font-bold text-slate-800">
                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(loan.totalAmount)}
                                    </p>
                                    <p className="text-xs text-slate-500">Total a Pagar</p>
                                </div>
                            </div>

                            {expandedLoan === loan.id && (
                                <div className="bg-slate-50 p-4 border-t border-slate-100">
                                    {loan.status === 'ACTIVE' && (
                                        <div className="flex justify-end gap-2 mb-4">
                                            <button
                                                onClick={() => setRenegotiateModal({
                                                    open: true,
                                                    loan: loan,
                                                    newTotalAmount: '',
                                                    newInstallmentsCount: '',
                                                    newStartDate: new Date().toISOString().split('T')[0],
                                                    paidAmountEntry: ''
                                                })}
                                                className="flex items-center gap-2 text-purple-600 hover:bg-purple-50 px-3 py-1.5 rounded-lg text-sm font-medium border border-purple-200 transition-colors"
                                            >
                                                <RefreshCw size={16} />
                                                Renegociar Dívida
                                            </button>
                                            <button
                                                onClick={() => handleDeleteLoan(loan.id)}
                                                className="flex items-center gap-2 text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-lg text-sm font-medium border border-red-200 transition-colors"
                                            >
                                                <Trash2 size={16} />
                                                Excluir Empréstimo
                                            </button>
                                        </div>
                                    )}

                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="text-slate-500 text-left">
                                                <th className="pb-2">Parcela</th>
                                                <th className="pb-2">Vencimento</th>
                                                <th className="pb-2">Valor</th>
                                                <th className="pb-2">Status</th>
                                                <th className="pb-2 text-right">Ações</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-200">
                                            {loan.installments.map((inst) => (
                                                <tr key={inst.id}>
                                                    <td className="py-3">{inst.number}</td>
                                                    <td className="py-3">{new Date(inst.dueDate).toLocaleDateString('pt-BR')}</td>

                                                    {editingId === inst.id ? (
                                                        <>
                                                            <td className="py-3">
                                                                <input
                                                                    type="number"
                                                                    className="border p-1 rounded w-24 mb-1 block"
                                                                    value={editData.amount}
                                                                    onChange={e => setEditData({ ...editData, amount: e.target.value })}
                                                                />
                                                                <input
                                                                    type="date"
                                                                    className="border p-1 rounded w-32 text-xs"
                                                                    value={editData.dueDate}
                                                                    onChange={e => setEditData({ ...editData, dueDate: e.target.value })}
                                                                />
                                                            </td>
                                                            <td className="py-3">
                                                                <select
                                                                    className="border p-1 rounded"
                                                                    value={editData.status}
                                                                    onChange={e => setEditData({ ...editData, status: e.target.value })}
                                                                >
                                                                    <option value="PENDING">PENDENTE</option>
                                                                    <option value="PAID">PAGO</option>
                                                                    <option value="INTEREST_PAID">SÓ JUROS</option>
                                                                </select>
                                                            </td>
                                                            <td className="py-3 text-right flex justify-end gap-2">
                                                                <button onClick={saveEdit} className="text-green-600 hover:bg-green-100 p-1 rounded"><Save size={16} /></button>
                                                                <button onClick={() => setEditingId(null)} className="text-red-600 hover:bg-red-100 p-1 rounded"><X size={16} /></button>
                                                            </td>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <td className="py-3 font-medium">
                                                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(inst.amount)}
                                                            </td>
                                                            <td className="py-3">
                                                                <span className={
                                                                    `px-2 py-1 rounded-full text-xs font-bold 
                                                                    ${inst.status === 'PAID' ? 'bg-green-100 text-green-700' :
                                                                        inst.status === 'INTEREST_PAID' ? 'bg-yellow-100 text-yellow-700' :
                                                                            new Date(inst.dueDate) < new Date() ? 'bg-red-100 text-red-700' : 'bg-slate-200 text-slate-600'}`
                                                                }>
                                                                    {inst.status === 'PAID' ? 'PAGO' :
                                                                        inst.status === 'INTEREST_PAID' ? 'SÓ JUROS' :
                                                                            new Date(inst.dueDate) < new Date() ? 'ATRASADO' : 'PENDENTE'}
                                                                </span>
                                                            </td>
                                                            <td className="py-3 text-right flex justify-end gap-2">
                                                                <button onClick={() => startEditing(inst)} className="text-slate-400 hover:text-slate-600 p-1">
                                                                    <Pencil size={16} />
                                                                </button>
                                                                {inst.status === 'PENDING' && loan.status === 'ACTIVE' && (
                                                                    <>
                                                                        <button
                                                                            onClick={() => openPaymentModal(inst)}
                                                                            className="text-green-600 hover:bg-green-50 px-2 py-1 rounded text-xs border border-green-200"
                                                                        >
                                                                            Pagar Total
                                                                        </button>
                                                                        <button
                                                                            onClick={() => openRenewalModal(inst, loan)}
                                                                            className="text-orange-600 hover:bg-orange-50 px-2 py-1 rounded text-xs border border-orange-200"
                                                                        >
                                                                            Só Juros
                                                                        </button>
                                                                        <button
                                                                            onClick={() => handleDuplicate(inst.id)}
                                                                            className="text-blue-600 hover:bg-blue-50 p-1 rounded"
                                                                            title="Duplicar Parcela"
                                                                        >
                                                                            <Copy size={16} />
                                                                        </button>
                                                                        <button
                                                                            onClick={() => handleDeleteInstallment(inst.id)}
                                                                            className="text-red-600 hover:bg-red-50 p-1 rounded"
                                                                            title="Excluir Parcela"
                                                                        >
                                                                            <Trash size={16} />
                                                                        </button>
                                                                    </>
                                                                )}
                                                            </td>
                                                        </>
                                                    )}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </Layout>
    );
};

export default Loans;
