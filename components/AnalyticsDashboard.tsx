import React, { useEffect, useState, useCallback } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, Legend } from 'recharts';
import { Activity, Globe, Shield, RefreshCw, Clock, FileDown, Trophy, AlertTriangle } from 'lucide-react';
import { API_BASE } from '../services/config';

interface TopAttacker {
    ip: string;
    count: number;
    rank: number;
}

interface Stats {
    total_attacks: number;
    country_stats: Record<string, number>;
    type_stats: Record<string, number>;
    attacks_over_time: { time: string; count: number }[];
    top_attackers?: TopAttacker[];
    severity_stats?: { critical: number; high: number; medium: number; low: number };
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#ef4444', '#f43f5e', '#06b6d4', '#d946ef', '#14b8a6'];
const SEVERITY_COLORS: Record<string, string> = { critical: '#ef4444', high: '#f97316', medium: '#eab308', low: '#22c55e' };
const REFRESH_INTERVAL = 30000;

const AnalyticsDashboard: React.FC = () => {
    const [stats, setStats] = useState<Stats | null>(null);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isExporting, setIsExporting] = useState(false);

    const fetchStats = useCallback(async () => {
        setIsRefreshing(true);
        try {
            const res = await fetch(`${API_BASE}/api/stats`);
            const data = await res.json();
            setStats(data);
            setLastUpdated(new Date());
        } catch (err) {
            console.error("Failed to fetch stats", err);
        } finally {
            setIsRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchStats();
        const interval = setInterval(fetchStats, REFRESH_INTERVAL);
        return () => clearInterval(interval);
    }, [fetchStats]);

    if (!stats) return (
        <div className="w-full h-64 flex items-center justify-center text-white/50 font-mono animate-pulse">
            INITIALIZING ANALYTICS MODULE...
        </div>
    );

    const typeData = Object.entries(stats.type_stats).map(([name, value]) => ({ name, value: value as number }));
    const countryData = Object.entries(stats.country_stats)
        .map(([name, value]) => ({ name, value: value as number }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5);

    return (
        <div className="w-full text-white">
            {/* Header with refresh controls */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <h2 className="text-3xl md:text-4xl font-heading font-bold">
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#4fb7b3] to-[#a8fbd3]">Analytics</span> Dashboard
                </h2>
                <div className="flex items-center gap-4">
                    {lastUpdated && (
                        <span className="text-xs text-gray-400 font-mono flex items-center gap-2">
                            <Clock className="w-3 h-3" />
                            Updated: {lastUpdated.toLocaleTimeString()}
                        </span>
                    )}
                    <button
                        onClick={fetchStats}
                        disabled={isRefreshing}
                        className="flex items-center gap-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded text-xs font-mono transition-colors disabled:opacity-50"
                    >
                        <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>
                    <button
                        onClick={async () => {
                            setIsExporting(true);
                            try {
                                const response = await fetch(`${API_BASE}/api/reports/generate`, { method: 'POST' });
                                if (response.ok) {
                                    const blob = await response.blob();
                                    const url = window.URL.createObjectURL(blob);
                                    const a = document.createElement('a');
                                    a.href = url;
                                    a.download = `honeypot-report-${new Date().toISOString().split('T')[0]}.pdf`;
                                    document.body.appendChild(a);
                                    a.click();
                                    a.remove();
                                    window.URL.revokeObjectURL(url);
                                }
                            } catch (err) {
                                console.error('Failed to export PDF', err);
                            } finally {
                                setIsExporting(false);
                            }
                        }}
                        disabled={isExporting}
                        className="flex items-center gap-2 px-3 py-1.5 bg-red-600/80 hover:bg-red-500 rounded text-xs font-mono transition-colors disabled:opacity-50 text-white"
                    >
                        <FileDown className={`w-3 h-3 ${isExporting ? 'animate-bounce' : ''}`} />
                        {isExporting ? 'Generating...' : 'Export PDF'}
                    </button>
                </div>
            </div>

            {/* Stats Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white/10 p-6 rounded-xl border border-white/10">
                    <div className="flex items-center gap-4 mb-2">
                        <Shield className="text-[#4fb7b3]" />
                        <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400">Total Intrusions</h3>
                    </div>
                    <p className="text-4xl font-mono font-bold text-white">{stats.total_attacks.toLocaleString()}</p>
                </div>
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Attacks Over Time */}
                <div className="bg-black/60 p-6 rounded-xl border border-white/10">
                    <h3 className="text-xl font-heading font-bold mb-6 flex items-center gap-2">
                        <Activity className="text-red-500" /> Attack Volume (24h)
                    </h3>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={stats.attacks_over_time}>
                                <defs>
                                    <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                                <XAxis dataKey="time" stroke="#666" tick={{ fill: '#666', fontSize: 12 }} />
                                <YAxis stroke="#666" tick={{ fill: '#666', fontSize: 12 }} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#000', border: '1px solid #333', borderRadius: '8px' }}
                                    itemStyle={{ color: '#fff', fontFamily: 'monospace' }}
                                />
                                <Area isAnimationActive={false} type="monotone" dataKey="count" stroke="#ef4444" fillOpacity={1} fill="url(#colorCount)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Attack Types */}
                <div className="bg-black/60 p-6 rounded-xl border border-white/10">
                    <h3 className="text-xl font-heading font-bold mb-6 flex items-center gap-2">
                        <Shield className="text-orange-500" /> Attack Vectors
                    </h3>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie isAnimationActive={false}
                                    data={typeData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={100}
                                    fill="#8884d8"
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {typeData.map((_, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#000', border: '1px solid #333', borderRadius: '8px' }}
                                    itemStyle={{ color: '#fff', fontFamily: 'monospace' }}
                                />
                                <Legend wrapperStyle={{ fontSize: '12px', fontFamily: 'monospace' }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Top Countries */}
                <div className="bg-black/60 p-6 rounded-xl border border-white/10 lg:col-span-2">
                    <h3 className="text-xl font-heading font-bold mb-6 flex items-center gap-2">
                        <Globe className="text-blue-500" /> Top Attacking Countries
                    </h3>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={countryData} layout="vertical" margin={{ left: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#333" horizontal={false} />
                                <XAxis type="number" stroke="#666" tick={{ fill: '#666', fontSize: 12 }} />
                                <YAxis dataKey="name" type="category" stroke="#fff" width={120} tick={{ fill: '#fff', fontSize: 12, fontFamily: 'monospace' }} />
                                <Tooltip
                                    cursor={{ fill: 'transparent' }}
                                    contentStyle={{ backgroundColor: '#000', border: '1px solid #333', borderRadius: '8px' }}
                                    itemStyle={{ color: '#fff', fontFamily: 'monospace' }}
                                />
                                <Bar isAnimationActive={false} dataKey="value" fill="#4fb7b3" radius={[0, 4, 4, 0]} barSize={20} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Top Attackers Leaderboard */}
                <div className="bg-black/60 p-6 rounded-xl border border-white/10">
                    <h3 className="text-xl font-heading font-bold mb-6 flex items-center gap-2">
                        <Trophy className="text-yellow-500" /> Top Attackers
                    </h3>
                    <div className="space-y-3">
                        {stats.top_attackers && stats.top_attackers.length > 0 ? (
                            stats.top_attackers.slice(0, 5).map((attacker, index) => (
                                <div
                                    key={attacker.ip}
                                    className="flex items-center gap-4 p-3 bg-white/5 rounded-lg border border-white/5 hover:bg-white/10 transition-colors"
                                >
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${index === 0 ? 'bg-yellow-500 text-black' :
                                        index === 1 ? 'bg-gray-300 text-black' :
                                            index === 2 ? 'bg-orange-600 text-white' : 'bg-white/10 text-white'
                                        }`}>
                                        #{attacker.rank}
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-mono text-sm text-white">{attacker.ip}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-mono text-lg font-bold text-red-400">{attacker.count}</p>
                                        <p className="text-xs text-gray-500">attacks</p>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-8 text-gray-500 font-mono">
                                No attacker data yet
                            </div>
                        )}
                    </div>
                </div>

                {/* Severity Distribution */}
                <div className="bg-black/60 p-6 rounded-xl border border-white/10">
                    <h3 className="text-xl font-heading font-bold mb-6 flex items-center gap-2">
                        <AlertTriangle className="text-red-500" /> Threat Severity
                    </h3>
                    {stats.severity_stats ? (
                        <div className="space-y-4">
                            {(['critical', 'high', 'medium', 'low'] as const).map((severity) => {
                                const count = stats.severity_stats![severity];
                                const values = Object.values(stats.severity_stats!) as number[];
                                const total = values.reduce((a, b) => a + b, 0);
                                const percentage = total > 0 ? (count / total * 100) : 0;

                                return (
                                    <div key={severity}>
                                        <div className="flex justify-between mb-1">
                                            <span className="text-sm font-mono uppercase" style={{ color: SEVERITY_COLORS[severity] }}>
                                                {severity}
                                            </span>
                                            <span className="text-sm font-mono text-gray-400">
                                                {count} ({percentage.toFixed(0)}%)
                                            </span>
                                        </div>
                                        <div className="h-3 bg-white/10 rounded-full overflow-hidden">
                                            <div
                                                className="h-full rounded-full transition-all duration-500"
                                                style={{
                                                    width: `${percentage}%`,
                                                    backgroundColor: SEVERITY_COLORS[severity]
                                                }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="text-center py-8 text-gray-500 font-mono">
                            No severity data yet
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AnalyticsDashboard;
