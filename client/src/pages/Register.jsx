import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import { UserPlus, Lock, User, CheckCircle } from 'lucide-react';

const Register = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const navigate = useNavigate();

    const handleRegister = async (e) => {
        e.preventDefault();
        try {
            await api.post('/register', { username, password, name });
            setSuccess(true);
            setTimeout(() => navigate('/login'), 2000);
        } catch (err) {
            setError('Erro ao criar conta. Tente outro usuário.');
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-900 to-slate-900 flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-md p-8 rounded-2xl shadow-2xl animate-in fade-in zoom-in duration-300">
                <div className="text-center mb-8">
                    <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-blue-600">
                        <UserPlus size={32} />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-800">Crie sua Conta</h1>
                    <p className="text-slate-500">Comece a gerenciar seus empréstimos hoje</p>
                </div>

                {success ? (
                    <div className="bg-green-50 text-green-700 p-4 rounded-xl flex items-center gap-3 mb-6 border border-green-100">
                        <CheckCircle size={24} />
                        <div>
                            <p className="font-bold">Conta criada!</p>
                            <p className="text-sm">Redirecionando para o login...</p>
                        </div>
                    </div>
                ) : (
                    <form onSubmit={handleRegister} className="space-y-4">
                        {error && (
                            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm text-center border border-red-100">
                                {error}
                            </div>
                        )}

                        <div className="relative">
                            <User className="absolute left-3 top-3.5 text-slate-400" size={20} />
                            <input
                                type="text"
                                placeholder="Nome Completo"
                                className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                            />
                        </div>

                        <div className="relative">
                            <User className="absolute left-3 top-3.5 text-slate-400" size={20} />
                            <input
                                type="text"
                                placeholder="Usuário"
                                className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required
                            />
                        </div>

                        <div className="relative">
                            <Lock className="absolute left-3 top-3.5 text-slate-400" size={20} />
                            <input
                                type="password"
                                placeholder="Senha"
                                className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-blue-900/20 active:scale-95"
                        >
                            Cadastrar
                        </button>
                    </form>
                )}

                <div className="mt-6 text-center">
                    <p className="text-slate-500 text-sm">
                        Já tem uma conta?{' '}
                        <Link to="/login" className="text-blue-600 font-bold hover:underline">
                            Fazer Login
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Register;
