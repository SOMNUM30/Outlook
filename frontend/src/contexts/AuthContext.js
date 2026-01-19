import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem('outlook_token'));
    const [isLoading, setIsLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    const checkAuth = useCallback(async () => {
        const storedToken = localStorage.getItem('outlook_token');
        if (!storedToken) {
            setIsLoading(false);
            return;
        }

        try {
            const response = await axios.get(`${API}/auth/me?token=${storedToken}`);
            setUser(response.data);
            setToken(storedToken);
            setIsAuthenticated(true);
        } catch (error) {
            console.error('Auth check failed:', error);
            localStorage.removeItem('outlook_token');
            localStorage.removeItem('outlook_user');
            setToken(null);
            setUser(null);
            setIsAuthenticated(false);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        // Check for token in URL (OAuth callback)
        const params = new URLSearchParams(window.location.search);
        const urlToken = params.get('token');
        const urlUser = params.get('user');

        if (urlToken) {
            localStorage.setItem('outlook_token', urlToken);
            if (urlUser) {
                localStorage.setItem('outlook_user', urlUser);
                setUser({ display_name: decodeURIComponent(urlUser) });
            }
            setToken(urlToken);
            setIsAuthenticated(true);
            setIsLoading(false);
            // Clean URL
            window.history.replaceState({}, document.title, window.location.pathname);
        } else {
            checkAuth();
        }
    }, [checkAuth]);

    const login = async () => {
        try {
            const response = await axios.get(`${API}/auth/login`);
            const { auth_url } = response.data;
            window.location.href = auth_url;
        } catch (error) {
            console.error('Login failed:', error);
            throw error;
        }
    };

    const logout = async () => {
        try {
            if (token) {
                await axios.post(`${API}/auth/logout?token=${token}`);
            }
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            localStorage.removeItem('outlook_token');
            localStorage.removeItem('outlook_user');
            setToken(null);
            setUser(null);
            setIsAuthenticated(false);
        }
    };

    const value = {
        user,
        token,
        isLoading,
        isAuthenticated,
        login,
        logout
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export default AuthContext;
