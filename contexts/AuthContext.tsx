import React, { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode } from 'react';

import { API_BASE } from '../services/config';

// Inactivity timeout (10 minutes in milliseconds)
const INACTIVITY_TIMEOUT = 10 * 60 * 1000; // 10 minutes

interface User {
    id: number;
    username: string;
    email: string;
    created_at?: string;
}

interface AuthContextType {
    isAuthenticated: boolean;
    user: User | null;
    token: string | null;
    isLoading: boolean;
    login: (email: string, password: string) => Promise<{ success: boolean; message: string }>;
    signup: (username: string, email: string, password: string) => Promise<{ success: boolean; message: string }>;
    logout: () => void;
    resetInactivityTimer: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

interface AuthProviderProps {
    children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);

    // Logout function
    const logout = useCallback(() => {
        setToken(null);
        setUser(null);
        sessionStorage.removeItem('authToken');
        sessionStorage.removeItem('authUser');

        // Clear inactivity timer
        if (inactivityTimerRef.current) {
            clearTimeout(inactivityTimerRef.current);
            inactivityTimerRef.current = null;
        }
    }, []);

    // Reset inactivity timer
    const resetInactivityTimer = useCallback(() => {
        // Clear existing timer
        if (inactivityTimerRef.current) {
            clearTimeout(inactivityTimerRef.current);
        }

        // Only set timer if user is authenticated
        if (token && user) {
            inactivityTimerRef.current = setTimeout(() => {
                console.log('Session expired due to inactivity');
                alert('Your session has expired due to inactivity. Please log in again.');
                logout();
            }, INACTIVITY_TIMEOUT);
        }
    }, [token, user, logout]);

    // Set up activity listeners
    useEffect(() => {
        if (!token || !user) return;

        const activityEvents = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];

        const handleActivity = () => {
            resetInactivityTimer();
        };

        // Add event listeners
        activityEvents.forEach(event => {
            document.addEventListener(event, handleActivity);
        });

        // Start initial timer
        resetInactivityTimer();

        // Cleanup
        return () => {
            activityEvents.forEach(event => {
                document.removeEventListener(event, handleActivity);
            });
            if (inactivityTimerRef.current) {
                clearTimeout(inactivityTimerRef.current);
            }
        };
    }, [token, user, resetInactivityTimer]);

    // Check for existing token on mount
    useEffect(() => {
        const storedToken = sessionStorage.getItem('authToken');
        const storedUser = sessionStorage.getItem('authUser');

        if (storedToken && storedUser) {
            setToken(storedToken);
            setUser(JSON.parse(storedUser));

            // Verify token is still valid
            verifyToken(storedToken);
        } else {
            setIsLoading(false);
        }
    }, []);

    const verifyToken = async (authToken: string) => {
        try {
            const response = await fetch(`${API_BASE}/api/auth/verify`, {
                headers: {
                    'Authorization': `Bearer ${authToken}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                setUser(data.user);
            } else {
                // Token invalid, clear auth
                logout();
            }
        } catch (error) {
            console.error('Token verification failed:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const login = async (email: string, password: string): Promise<{ success: boolean; message: string }> => {
        try {
            const response = await fetch(`${API_BASE}/api/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (data.success) {
                setToken(data.token);
                setUser(data.user);
                sessionStorage.setItem('authToken', data.token);
                sessionStorage.setItem('authUser', JSON.stringify(data.user));
                return { success: true, message: 'Login successful' };
            } else {
                return { success: false, message: data.message || 'Login failed' };
            }
        } catch (error) {
            console.error('Login error:', error);
            return { success: false, message: 'Network error. Please try again.' };
        }
    };

    const signup = async (username: string, email: string, password: string): Promise<{ success: boolean; message: string }> => {
        try {
            const response = await fetch(`${API_BASE}/api/auth/signup`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, email, password })
            });

            const data = await response.json();

            if (data.success) {
                setToken(data.token);
                setUser(data.user);
                sessionStorage.setItem('authToken', data.token);
                sessionStorage.setItem('authUser', JSON.stringify(data.user));
                return { success: true, message: 'Account created successfully' };
            } else {
                return { success: false, message: data.message || 'Signup failed' };
            }
        } catch (error) {
            console.error('Signup error:', error);
            return { success: false, message: 'Network error. Please try again.' };
        }
    };

    return (
        <AuthContext.Provider value={{
            isAuthenticated: !!token && !!user,
            user,
            token,
            isLoading,
            login,
            signup,
            logout,
            resetInactivityTimer
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export default AuthContext;
