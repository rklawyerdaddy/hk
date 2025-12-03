import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import { Lock, User, ArrowRight } from 'lucide-react';

const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        try {
            const response = await api.post('/login', { username, password });
            localStorage.setItem('token', response.data.token);
            localStorage.setItem('user', response.data.name);
            api.defaults.headers.Authorization = `Bearer ${response.data.token}`;
            navigate('/');
        } catch (err) {
            setError('Usuário ou senha incorretos');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>

            <div className="bg-white/10 backdrop-blur-lg p-8 rounded-2xl shadow-2xl w-full max-w-md border border-white/20 relative z-10 animate-in fade-in zoom-in duration-500">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-white mb-2">Bem-vindo</h1>
                    <p className="text-blue-200">Entre para gerenciar seus empréstimos</p>
                </div>

                {error && (
                    <div className="bg-red-500/20 border border-red-500/50 text-red-200 p-3 rounded-lg mb-6 text-sm text-center">
                        {error}
                    </div>
                )}

                <form onSubmit={handleLogin} className="space-y-6">
                    <div>
                        <label className="block text-blue-200 text-sm font-medium mb-2">Usuário</label>
                        <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-300" size={20} />
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="w-full bg-slate-800/50 border border-blue-500/30 rounded-lg py-3 pl-10 pr-4 text-white placeholder-blue-400/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                placeholder="Seu usuário"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-blue-200 text-sm font-medium mb-2">Senha</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-300" size={20} />
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-slate-800/50 border border-blue-500/30 rounded-lg py-3 pl-10 pr-4 text-white placeholder-blue-400/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                placeholder="Sua senha"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-bold py-3 rounded-lg shadow-lg transform transition-all hover:scale-[1.02] flex items-center justify-center gap-2"
                    >
                        Entrar
                        <ArrowRight size={20} />
                    </button>
                </form>

                <div className="mt-6 text-center">
                    <p className="text-blue-200 text-sm">
                        Não tem uma conta?{' '}
                        <Link to="/register" className="text-white font-bold hover:underline">
                            Criar Conta
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Login;
