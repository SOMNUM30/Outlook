import React from "react";
import "./App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { Toaster } from "./components/ui/sonner";

// Pages
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import RulesPage from "./pages/RulesPage";
import HistoryPage from "./pages/HistoryPage";

// Layout
import MainLayout from "./components/layout/MainLayout";

// Protected Route wrapper
const ProtectedRoute = ({ children }) => {
    const { isAuthenticated, isLoading } = useAuth();

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA]">
                <div className="flex flex-col items-center gap-4">
                    <div className="spinner"></div>
                    <p className="text-sm text-zinc-500">Chargement...</p>
                </div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    return children;
};

// Public Route wrapper (redirects to dashboard if authenticated)
const PublicRoute = ({ children }) => {
    const { isAuthenticated, isLoading } = useAuth();

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA]">
                <div className="flex flex-col items-center gap-4">
                    <div className="spinner"></div>
                    <p className="text-sm text-zinc-500">Chargement...</p>
                </div>
            </div>
        );
    }

    if (isAuthenticated) {
        return <Navigate to="/" replace />;
    }

    return children;
};

function AppRoutes() {
    return (
        <Routes>
            <Route
                path="/login"
                element={
                    <PublicRoute>
                        <LoginPage />
                    </PublicRoute>
                }
            />
            <Route
                path="/"
                element={
                    <ProtectedRoute>
                        <MainLayout>
                            <DashboardPage />
                        </MainLayout>
                    </ProtectedRoute>
                }
            />
            <Route
                path="/rules"
                element={
                    <ProtectedRoute>
                        <MainLayout>
                            <RulesPage />
                        </MainLayout>
                    </ProtectedRoute>
                }
            />
            <Route
                path="/history"
                element={
                    <ProtectedRoute>
                        <MainLayout>
                            <HistoryPage />
                        </MainLayout>
                    </ProtectedRoute>
                }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
}

function App() {
    return (
        <AuthProvider>
            <BrowserRouter>
                <AppRoutes />
                <Toaster position="bottom-right" />
            </BrowserRouter>
        </AuthProvider>
    );
}

export default App;
