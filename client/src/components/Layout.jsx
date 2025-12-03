import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, Banknote, ArrowRightLeft, LogOut, Menu, X } from 'lucide-react';
import clsx from 'clsx';

const SidebarItem = ({ to, icon: Icon, label }) => {
    const location = useLocation();
    const isActive = location.pathname === to;

    return (
        <Link
            to={to}
            className={clsx(
                'flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group',
                isActive
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20 translate-x-1'
                    : 'text-blue-100 hover:bg-white/10 hover:text-white hover:translate-x-1'
            )}
        >
            <Icon size={20} className={clsx(isActive ? 'text-white' : 'text-blue-300 group-hover:text-white')} />
            <span className="font-medium">{label}</span>
        </Link>
    );
};

const Layout = ({ children }) => {
    const navigate = useNavigate();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
    const userName = localStorage.getItem('user') || 'Usuário';

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
    };

    return (
        <div className="flex h-screen bg-slate-50 overflow-hidden">
            {/* Mobile Menu Button */}
            <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="md:hidden fixed top-4 right-4 z-50 p-2 bg-blue-600 text-white rounded-lg shadow-lg"
            >
                {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>

            {/* Overlay for Mobile */}
            {isMobileMenuOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-30 md:hidden backdrop-blur-sm"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}

            {/* Sidebar com Gradiente Premium */}
            <aside className={clsx(
                "fixed md:static inset-y-0 left-0 z-40 w-72 bg-gradient-to-b from-slate-900 via-blue-900 to-slate-900 text-white flex flex-col shadow-2xl transition-transform duration-300 ease-in-out",
                isMobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
            )}>
                <div className="p-8">
                    <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                        <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/50">
                            <span className="text-white font-bold text-lg">H</span>
                        </div>
                        <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-blue-200">
                            CONTROLE HK
                        </span>
                    </h1>
                </div>

                <div className="px-4 mb-6">
                    <div className="bg-white/5 rounded-xl p-4 border border-white/10 backdrop-blur-sm">
                        <p className="text-xs text-blue-300 uppercase font-bold tracking-wider mb-1">Bem-vindo</p>
                        <p className="font-medium text-white truncate">{userName}</p>
                    </div>
                </div>

                <nav className="flex-1 px-4 space-y-2 overflow-y-auto custom-scrollbar">
                    <SidebarItem to="/" icon={LayoutDashboard} label="Dashboard" />
                    <SidebarItem to="/clients" icon={Users} label="Clientes" />
                    <SidebarItem to="/loans" icon={Banknote} label="Empréstimos" />
                    <SidebarItem to="/transactions" icon={ArrowRightLeft} label="Fluxo de Caixa" />
                    <SidebarItem to="/partners" icon={Users} label="Parceiros" />
                </nav>

                <div className="p-4 border-t border-white/10">
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 px-4 py-3 rounded-xl text-red-300 hover:bg-red-500/10 hover:text-red-200 w-full transition-colors"
                    >
                        <LogOut size={20} />
                        <span className="font-medium">Sair do Sistema</span>
                    </button>
                    <p className="text-center text-xs text-blue-400/50 mt-4">v1.1.0 Premium</p>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-auto bg-slate-50 relative w-full">
                {/* Background Pattern opcional */}
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-5 pointer-events-none"></div>

                {/* Header Mobile (se necessário no futuro) ou apenas espaçamento */}
                <div className="p-4 md:p-8 max-w-7xl mx-auto pt-16 md:pt-8">
                    {children}
                </div>
            </main>
        </div>
    );
};

export default Layout;
