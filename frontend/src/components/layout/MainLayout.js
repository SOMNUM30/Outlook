import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import {
    Mail,
    FolderCog,
    History,
    LogOut,
    User,
    ChevronLeft,
    ChevronRight,
    LayoutDashboard
} from 'lucide-react';

const MainLayout = ({ children }) => {
    const { user, logout } = useAuth();
    const location = useLocation();
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

    const navItems = [
        { path: '/', label: 'Tableau de bord', icon: LayoutDashboard },
        { path: '/rules', label: 'Règles', icon: FolderCog },
        { path: '/history', label: 'Historique', icon: History },
    ];

    const isActive = (path) => location.pathname === path;

    return (
        <div className="min-h-screen flex bg-[#FAFAFA]" data-testid="main-layout">
            {/* Sidebar */}
            <aside 
                className={`${sidebarCollapsed ? 'w-16' : 'w-64'} bg-[#F4F4F5] border-r border-[#E4E4E7] flex flex-col transition-all duration-300`}
                data-testid="sidebar"
            >
                {/* Logo */}
                <div className="h-16 flex items-center justify-between px-4 border-b border-[#E4E4E7]">
                    {!sidebarCollapsed && (
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-[#18181B] rounded-lg flex items-center justify-center">
                                <Mail className="w-4 h-4 text-white" />
                            </div>
                            <span className="font-semibold text-[#09090B] tracking-tight">
                                AI Classifier
                            </span>
                        </div>
                    )}
                    {sidebarCollapsed && (
                        <div className="w-8 h-8 bg-[#18181B] rounded-lg flex items-center justify-center mx-auto">
                            <Mail className="w-4 h-4 text-white" />
                        </div>
                    )}
                </div>

                {/* Navigation */}
                <nav className="flex-1 p-3 space-y-1">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                                    isActive(item.path)
                                        ? 'bg-[#18181B] text-white'
                                        : 'text-[#71717A] hover:bg-[#E4E4E7] hover:text-[#09090B]'
                                }`}
                                data-testid={`nav-${item.path === '/' ? 'dashboard' : item.path.slice(1)}`}
                            >
                                <Icon className="w-5 h-5 flex-shrink-0" />
                                {!sidebarCollapsed && (
                                    <span className="font-medium">{item.label}</span>
                                )}
                            </Link>
                        );
                    })}
                </nav>

                {/* Collapse Button */}
                <button
                    onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                    className="p-3 border-t border-[#E4E4E7] flex items-center justify-center text-[#71717A] hover:text-[#09090B] hover:bg-[#E4E4E7] transition-colors"
                    data-testid="toggle-sidebar"
                >
                    {sidebarCollapsed ? (
                        <ChevronRight className="w-5 h-5" />
                    ) : (
                        <ChevronLeft className="w-5 h-5" />
                    )}
                </button>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-h-screen">
                {/* Header */}
                <header className="h-16 bg-white border-b border-[#E4E4E7] flex items-center justify-between px-6">
                    <h1 className="text-lg font-semibold text-[#09090B] tracking-tight">
                        {navItems.find(item => isActive(item.path))?.label || 'Dashboard'}
                    </h1>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button 
                                variant="ghost" 
                                className="flex items-center gap-2 h-10"
                                data-testid="user-menu-trigger"
                            >
                                <div className="w-8 h-8 bg-[#18181B] rounded-full flex items-center justify-center">
                                    <User className="w-4 h-4 text-white" />
                                </div>
                                <span className="text-sm font-medium text-[#09090B]">
                                    {user?.display_name || 'Utilisateur'}
                                </span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                            <div className="px-2 py-1.5">
                                <p className="text-sm font-medium text-[#09090B]">
                                    {user?.display_name}
                                </p>
                                <p className="text-xs text-[#71717A]">
                                    {user?.email}
                                </p>
                            </div>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                                onClick={logout}
                                className="text-red-600 cursor-pointer"
                                data-testid="logout-button"
                            >
                                <LogOut className="w-4 h-4 mr-2" />
                                Se déconnecter
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </header>

                {/* Page Content */}
                <main className="flex-1 overflow-auto">
                    {children}
                </main>
            </div>
        </div>
    );
};

export default MainLayout;
