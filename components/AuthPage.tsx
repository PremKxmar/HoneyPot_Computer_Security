import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Lock, User, Mail, AlertCircle, Eye, EyeOff, CheckCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const AuthPage: React.FC = () => {
    const { login, signup } = useAuth();
    const [isLoginMode, setIsLoginMode] = useState(true);
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const resetForm = () => {
        setUsername('');
        setEmail('');
        setPassword('');
        setConfirmPassword('');
        setError('');
        setSuccess('');
    };

    const toggleMode = () => {
        setIsLoginMode(!isLoginMode);
        resetForm();
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setIsLoading(true);

        if (isLoginMode) {
            // Login
            const result = await login(email, password);
            if (!result.success) {
                setError(result.message);
            }
        } else {
            // Signup validation
            if (password !== confirmPassword) {
                setError('Passwords do not match');
                setIsLoading(false);
                return;
            }
            if (password.length < 6) {
                setError('Password must be at least 6 characters');
                setIsLoading(false);
                return;
            }
            if (username.length < 3) {
                setError('Username must be at least 3 characters');
                setIsLoading(false);
                return;
            }

            const result = await signup(username, email, password);
            if (!result.success) {
                setError(result.message);
            } else {
                setSuccess('Account created! Redirecting...');
            }
        }
        setIsLoading(false);
    };

    return (
        <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4 relative overflow-hidden">
            {/* Animated background */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#4fb7b3]/10 rounded-full blur-[100px] animate-pulse" />
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#a8fbd3]/10 rounded-full blur-[100px] animate-pulse" />
            </div>

            {/* Grid pattern */}
            <div
                className="absolute inset-0 opacity-5"
                style={{
                    backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
                    backgroundSize: '50px 50px'
                }}
            />

            <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.5 }}
                className="relative z-10 w-full max-w-md"
            >
                <div className="bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 0.2, type: "spring" }}
                            className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-[#4fb7b3]/20 to-[#a8fbd3]/20 flex items-center justify-center border border-[#4fb7b3]/30"
                        >
                            <Shield className="w-10 h-10 text-[#4fb7b3]" />
                        </motion.div>
                        <h1 className="text-3xl font-heading font-bold text-white mb-2">
                            HONEYPOT<span className="text-[#4fb7b3]">.</span>
                        </h1>
                        <p className="text-gray-400 font-mono text-sm">Security Dashboard</p>
                    </div>

                    {/* Mode Toggle */}
                    <div className="flex mb-6 bg-white/5 rounded-lg p-1">
                        <button
                            type="button"
                            onClick={() => !isLoginMode && toggleMode()}
                            className={`flex-1 py-2 px-4 rounded-md text-sm font-mono transition-all ${isLoginMode
                                    ? 'bg-[#4fb7b3] text-black font-bold'
                                    : 'text-gray-400 hover:text-white'
                                }`}
                        >
                            Login
                        </button>
                        <button
                            type="button"
                            onClick={() => isLoginMode && toggleMode()}
                            className={`flex-1 py-2 px-4 rounded-md text-sm font-mono transition-all ${!isLoginMode
                                    ? 'bg-[#4fb7b3] text-black font-bold'
                                    : 'text-gray-400 hover:text-white'
                                }`}
                        >
                            Sign Up
                        </button>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Error message */}
                        <AnimatePresence>
                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm font-mono"
                                >
                                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                    {error}
                                </motion.div>
                            )}
                            {success && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/30 rounded-lg text-green-400 text-sm font-mono"
                                >
                                    <CheckCircle className="w-4 h-4 flex-shrink-0" />
                                    {success}
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Username (Signup only) */}
                        <AnimatePresence>
                            {!isLoginMode && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="space-y-2 overflow-hidden"
                                >
                                    <label className="text-xs text-gray-400 uppercase tracking-wider font-mono">Username</label>
                                    <div className="relative">
                                        <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                                        <input
                                            type="text"
                                            value={username}
                                            onChange={(e) => setUsername(e.target.value)}
                                            placeholder="Choose a username"
                                            className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#4fb7b3] focus:ring-1 focus:ring-[#4fb7b3] font-mono text-sm transition-all"
                                            required={!isLoginMode}
                                        />
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Email */}
                        <div className="space-y-2">
                            <label className="text-xs text-gray-400 uppercase tracking-wider font-mono">Email</label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="Enter your email"
                                    className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#4fb7b3] focus:ring-1 focus:ring-[#4fb7b3] font-mono text-sm transition-all"
                                    required
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div className="space-y-2">
                            <label className="text-xs text-gray-400 uppercase tracking-wider font-mono">Password</label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Enter password"
                                    className="w-full pl-12 pr-12 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#4fb7b3] focus:ring-1 focus:ring-[#4fb7b3] font-mono text-sm transition-all"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
                                >
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>

                        {/* Confirm Password (Signup only) */}
                        <AnimatePresence>
                            {!isLoginMode && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="space-y-2 overflow-hidden"
                                >
                                    <label className="text-xs text-gray-400 uppercase tracking-wider font-mono">Confirm Password</label>
                                    <div className="relative">
                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            placeholder="Confirm password"
                                            className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#4fb7b3] focus:ring-1 focus:ring-[#4fb7b3] font-mono text-sm transition-all"
                                            required={!isLoginMode}
                                        />
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Submit button */}
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-3 bg-gradient-to-r from-[#4fb7b3] to-[#a8fbd3] hover:from-[#3da09c] hover:to-[#8ee0b8] text-black font-bold uppercase tracking-widest text-sm rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isLoading ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                                    {isLoginMode ? 'Logging in...' : 'Creating account...'}
                                </>
                            ) : (
                                <>
                                    {isLoginMode ? <Lock className="w-4 h-4" /> : <User className="w-4 h-4" />}
                                    {isLoginMode ? 'Access Dashboard' : 'Create Account'}
                                </>
                            )}
                        </button>
                    </form>

                    {/* Footer */}
                    <div className="mt-8 pt-6 border-t border-white/10 text-center">
                        <p className="text-gray-600 text-xs">
                            Honeypot Security Dashboard v2.0
                        </p>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default AuthPage;
