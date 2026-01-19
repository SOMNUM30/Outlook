import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Mail, Shield, Zap, FolderOpen } from 'lucide-react';

const LoginPage = () => {
    const { login } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleLogin = async () => {
        setIsLoading(true);
        setError(null);
        try {
            await login();
        } catch (err) {
            setError("Impossible de se connecter. Veuillez réessayer.");
            setIsLoading(false);
        }
    };

    const features = [
        {
            icon: <Mail className="w-5 h-5" />,
            title: "Connexion Outlook",
            description: "Connectez votre compte Outlook 365"
        },
        {
            icon: <Zap className="w-5 h-5" />,
            title: "Classification IA",
            description: "GPT-5.2 analyse le contenu de vos emails"
        },
        {
            icon: <FolderOpen className="w-5 h-5" />,
            title: "Classement Auto",
            description: "Vos emails sont classés automatiquement"
        }
    ];

    return (
        <div className="min-h-screen bg-[#FAFAFA] flex" data-testid="login-page">
            {/* Left Panel - Hero */}
            <div className="hidden lg:flex lg:w-1/2 bg-[#18181B] p-12 flex-col justify-between">
                <div>
                    <div className="flex items-center gap-3 mb-16">
                        <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
                            <Mail className="w-5 h-5 text-[#18181B]" />
                        </div>
                        <span className="text-white text-xl font-semibold tracking-tight">
                            Outlook AI Classifier
                        </span>
                    </div>

                    <h1 className="text-4xl lg:text-5xl font-bold text-white leading-tight tracking-tight mb-6">
                        Classez vos emails<br />
                        <span className="text-zinc-400">automatiquement</span>
                    </h1>

                    <p className="text-zinc-400 text-lg max-w-md">
                        Utilisez l'intelligence artificielle pour organiser automatiquement
                        vos emails Outlook dans les bons dossiers.
                    </p>
                </div>

                <div className="space-y-6">
                    {features.map((feature, index) => (
                        <div 
                            key={index} 
                            className="flex items-start gap-4 opacity-0 animate-fade-in"
                            style={{ animationDelay: `${index * 0.1}s`, animationFillMode: 'forwards' }}
                        >
                            <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-400">
                                {feature.icon}
                            </div>
                            <div>
                                <h3 className="text-white font-medium">{feature.title}</h3>
                                <p className="text-zinc-500 text-sm">{feature.description}</p>
                            </div>
                        </div>
                    ))}
                </div>

                <p className="text-zinc-600 text-sm">
                    Compatible Outlook 365 • Données sécurisées
                </p>
            </div>

            {/* Right Panel - Login */}
            <div className="flex-1 flex items-center justify-center p-8">
                <div className="w-full max-w-md">
                    {/* Mobile Logo */}
                    <div className="lg:hidden flex items-center gap-3 mb-12 justify-center">
                        <div className="w-10 h-10 bg-[#18181B] rounded-lg flex items-center justify-center">
                            <Mail className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-[#18181B] text-xl font-semibold tracking-tight">
                            Outlook AI Classifier
                        </span>
                    </div>

                    <div className="bg-white border border-[#E4E4E7] rounded-xl p-8">
                        <h2 className="text-2xl font-bold text-[#09090B] tracking-tight mb-2">
                            Bienvenue
                        </h2>
                        <p className="text-[#71717A] mb-8">
                            Connectez-vous avec votre compte Microsoft pour commencer
                        </p>

                        {error && (
                            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                                <p className="text-red-700 text-sm">{error}</p>
                            </div>
                        )}

                        <Button
                            onClick={handleLogin}
                            disabled={isLoading}
                            className="w-full h-12 bg-[#18181B] hover:bg-[#27272A] text-white font-medium rounded-lg transition-all active:scale-95"
                            data-testid="login-button"
                        >
                            {isLoading ? (
                                <div className="flex items-center gap-2">
                                    <div className="spinner w-4 h-4"></div>
                                    <span>Connexion...</span>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <svg className="w-5 h-5" viewBox="0 0 23 23" fill="none">
                                        <path d="M11 0H0V11H11V0Z" fill="#F25022"/>
                                        <path d="M23 0H12V11H23V0Z" fill="#7FBA00"/>
                                        <path d="M11 12H0V23H11V12Z" fill="#00A4EF"/>
                                        <path d="M23 12H12V23H23V12Z" fill="#FFB900"/>
                                    </svg>
                                    <span>Se connecter avec Microsoft</span>
                                </div>
                            )}
                        </Button>

                        <div className="mt-8 pt-6 border-t border-[#E4E4E7]">
                            <div className="flex items-center gap-2 text-[#71717A] text-sm">
                                <Shield className="w-4 h-4" />
                                <span>Connexion sécurisée via Microsoft OAuth</span>
                            </div>
                        </div>
                    </div>

                    <p className="text-center text-[#A1A1AA] text-xs mt-6">
                        En vous connectant, vous acceptez que l'application accède à vos emails
                        pour les classifier. Vos données restent privées.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
