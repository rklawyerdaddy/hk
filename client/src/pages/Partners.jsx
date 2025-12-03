import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import api from '../services/api';
import { Plus, Trash2, Users } from 'lucide-react';

const Partners = () => {
    const [partners, setPartners] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({ name: '', pixKey: '', commissionRate: '' });

    useEffect(() => {
        loadPartners();
    }, []);

    const loadPartners = async () => {
        try {
            const response = await api.get('/partners');
            setPartners(response.data);
        } catch (error) {
            console.error(error);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await api.post('/partners', formData);
            setShowForm(false);
            setFormData({ name: '', pixKey: '', commissionRate: '' });
            loadPartners();
        } catch (error) {
            alert('Erro ao criar parceiro');
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Tem certeza que deseja excluir este parceiro?')) return;
        try {
            await api.delete(`/partners/${id}`);
            loadPartners();
        } catch (error) {
            alert('Erro ao excluir parceiro');
        }
    };

    return (
        <Layout>
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-slate-800">Parceiros & Indicações</h2>
                    <button
                        onClick={() => setShowForm(!showForm)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium transition-colors shadow-lg shadow-blue-600/20"
                    >
                        <Plus size={20} />
                        Novo Parceiro
                    </button>
                </div>

                {showForm && (
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 animate-in fade-in slide-in-from-top-4">
                        <h3 className="font-bold mb-4 text-slate-800">Novo Parceiro</h3>
                        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <input
                                type="text"
                                placeholder="Nome do Parceiro"
                                className="border p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                required
                            />
                            <input
                                type="text"
                                placeholder="Chave Pix"
                                className="border p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                value={formData.pixKey}
                                onChange={e => setFormData({ ...formData, pixKey: e.target.value })}
                            />
                            <div className="relative">
                                <input
                                    type="number"
                                    placeholder="Comissão (%)"
                                    className="border p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none w-full"
                                    value={formData.commissionRate}
                                    onChange={e => setFormData({ ...formData, commissionRate: e.target.value })}
                                />
                                <span className="absolute right-3 top-3 text-slate-400">%</span>
                            </div>

                            <div className="md:col-span-3 flex justify-end gap-2 mt-2">
                                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors">Cancelar</button>
                                <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-md">Salvar</button>
                            </div>
                        </form>
                    </div>
                )}

                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-500 font-medium">
                            <tr>
                                <th className="px-6 py-4">Nome</th>
                                <th className="px-6 py-4">Chave Pix</th>
                                <th className="px-6 py-4">Comissão Padrão</th>
                                <th className="px-6 py-4 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {partners.map((partner) => (
                                <tr key={partner.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4 font-medium text-slate-900 flex items-center gap-2">
                                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                                            <Users size={16} />
                                        </div>
                                        {partner.name}
                                    </td>
                                    <td className="px-6 py-4 text-slate-600">{partner.pixKey || '-'}</td>
                                    <td className="px-6 py-4 text-slate-600">
                                        {partner.commissionRate ? `${partner.commissionRate}%` : '-'}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button
                                            onClick={() => handleDelete(partner.id)}
                                            className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors"
                                            title="Excluir"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {partners.length === 0 && (
                                <tr>
                                    <td colSpan="4" className="px-6 py-8 text-center text-slate-400">
                                        Nenhum parceiro cadastrado.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </Layout>
    );
};

export default Partners;
