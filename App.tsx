/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/


import React, { useRef, useState, useEffect, useCallback } from 'react';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import { Shield, Globe, Terminal, Server, MapPin, Menu, X, AlertTriangle, Play, ChevronLeft, ChevronRight, Activity, Lock, CheckCircle, XCircle, Bell, Zap, Search, Filter, LogOut } from 'lucide-react';
import FluidBackground from './components/FluidBackground';
import GradientText from './components/GlitchText';
import CustomCursor from './components/CustomCursor';
import ThreatCard from './components/ArtistCard'; // Reused component structure
import AIChat from './components/AIChat';
import AnalyticsDashboard from './components/AnalyticsDashboard';
import WorldMap from './components/WorldMap';
import AuthPage from './components/AuthPage';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Threat, NodeStatus } from './types';
import { fetchThreats, subscribeToLiveFeed, blockIP } from './services/api';


// Mock Data - Used as fallback when backend is unavailable
const MOCK_THREAT_LOGS: Threat[] = [
  {
    id: '1',
    type: 'SQL Injection',
    ip: '203.0.113.45',
    location: 'Shanghai, CN',
    confidence: 98,
    severity: 'critical',
    timestamp: '10:42:05 UTC',
    image: 'https://images.unsplash.com/photo-1558494949-efc02570fbc9?q=80&w=1000&auto=format&fit=crop',
    description: 'Payload detected: "\' OR 1=1 --". ML Model classified as malicious SQL interaction. Target: /login endpoint.'
  },
  {
    id: '2',
    type: 'XSS Attempt',
    ip: '198.51.100.23',
    location: 'St. Petersburg, RU',
    confidence: 92,
    severity: 'high',
    timestamp: '10:41:12 UTC',
    image: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?q=80&w=1000&auto=format&fit=crop',
    description: 'Reflected Cross-Site Scripting vector identified in search parameter. Script tags detected in encoded URL.'
  },
  {
    id: '3',
    type: 'SSH Brute Force',
    ip: '185.199.108.153',
    location: 'Lagos, NG',
    confidence: 89,
    severity: 'medium',
    timestamp: '10:38:55 UTC',
    image: 'https://images.unsplash.com/photo-1614064641938-3bbee52942c7?q=80&w=1000&auto=format&fit=crop',
    description: 'Rapid authentication failures detected on port 22. 50 attempts in 3 seconds. Pattern matches dictionary attack.'
  },
  {
    id: '4',
    type: 'Directory Traversal',
    ip: '45.33.22.11',
    location: 'Frankfurt, DE',
    confidence: 95,
    severity: 'high',
    timestamp: '10:35:01 UTC',
    image: 'https://images.unsplash.com/photo-1516110833967-0b5716ca1387?q=80&w=1000&auto=format&fit=crop',
    description: 'Path manipulation attempt: "../../../etc/passwd". Blocked by WAF rule set #402.'
  },
  {
    id: '5',
    type: 'Port Scanning',
    ip: '104.244.42.1',
    location: 'New York, US',
    confidence: 75,
    severity: 'low',
    timestamp: '10:30:22 UTC',
    image: 'https://images.unsplash.com/photo-1544197150-b99a580bbcbf?q=80&w=1000&auto=format&fit=crop',
    description: 'Sequential TCP SYN scan detected across ports 1000-2000. Low rate, likely reconnaissance.'
  },
  {
    id: '6',
    type: 'Command Injection',
    ip: '91.234.11.8',
    location: 'Bucharest, RO',
    confidence: 99,
    severity: 'critical',
    timestamp: '10:28:15 UTC',
    image: 'https://images.unsplash.com/photo-1555949963-aa79dcee981c?q=80&w=1000&auto=format&fit=crop',
    description: 'System call injected into image upload handler: "; cat /etc/shadow". Execution prevented in sandbox.'
  },
];

const Dashboard: React.FC = () => {
  const { logout, user } = useAuth();
  const { scrollYProgress } = useScroll();
  const y = useTransform(scrollYProgress, [0, 1], [0, -100]);
  const opacity = useTransform(scrollYProgress, [0, 0.2], [1, 0]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedThreat, setSelectedThreat] = useState<Threat | null>(null);

  // Real-time threat data
  const [liveThreats, setLiveThreats] = useState<Threat[]>([]);
  const [isBackendConnected, setIsBackendConnected] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [attackAlert, setAttackAlert] = useState<Threat | null>(null);
  const [isAlertAcknowledged, setIsAlertAcknowledged] = useState(false);
  const [isFlashingDisabled, setIsFlashingDisabled] = useState(false); // New state to completely disable flashing

  // Search and Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');

  // Simulating Node Controls
  const [rebootingIndex, setRebootingIndex] = useState<number | null>(null);
  const [nodes, setNodes] = useState<NodeStatus[]>([
    { id: 'n1', name: 'Web-Honeypot-01', region: 'US-East', status: 'active', uptime: '14d 2h', requests: 4521 },
    { id: 'n2', name: 'DB-Trap-Alpha', region: 'EU-West', status: 'under_attack', uptime: '2d 5h', requests: 12890 },
    { id: 'n3', name: 'SSH-Decoy-X', region: 'AP-South', status: 'active', uptime: '45d 1h', requests: 890 },
  ]);

  // Combined threats: live data first, then mock data as fallback
  const allThreats = isBackendConnected && liveThreats.length > 0
    ? [...liveThreats, ...MOCK_THREAT_LOGS.slice(0, Math.max(0, 6 - liveThreats.length))]
    : MOCK_THREAT_LOGS;

  // Get unique attack types for filter dropdown
  const attackTypes = ['all', ...new Set(allThreats.map(t => t.type))];

  // Filtered threats based on search and filter
  const filteredThreats = allThreats.filter(threat => {
    const matchesSearch = searchQuery === '' ||
      threat.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      threat.ip.toLowerCase().includes(searchQuery.toLowerCase()) ||
      threat.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      threat.description.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesFilter = filterType === 'all' || threat.type === filterType;

    return matchesSearch && matchesFilter;
  });

  // Fetch initial threats and subscribe to SSE
  useEffect(() => {
    // Fetch existing threats
    const loadThreats = () => {
      fetchThreats(20).then((threats) => {
        if (threats.length > 0) {
          // Check for new threats
          setLiveThreats((prev) => {
            const newThreats = threats.filter(t => !prev.some(p => p.id === t.id));
            if (newThreats.length > 0 && prev.length > 0) {
              // New attack detected! Show notification
              const latestNew = newThreats[0];
              setAttackAlert(latestNew);
              setIsAlertAcknowledged(false);

              // Play alert sound
              try {
                const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleAgAYMDr2rN3PwUAbNbjp4BZJQCC2M+TaDouAGe+xIVWRCUAgr29fVZGPC0AiLi0dVhGPi4AgbKpdldLPjEAf6ymcVhLQjIAfqahblxOQTQAf6Kdb1xQQTQAfqKcc19RQjYAfaCacF9UQzYAfZ+Yb2FWRDgAfZ6WbmJXRTgAfZ2UbmNYRjkAfJySbmRaRzoAfJuQbWVbRzsAfJmObGZcSD0AfJiMa2ddSD4AfJeKamheSkAAepaJaWlfS0IAeZWHaGpgTEMAeZSFZ2thTUQAeJODZmxiTkYAeJKBZm1jT0kAd5CAZm5kUEkAd49+ZW9lUUoAdo5+aHBnUkwAdY18ZnFoU00AdIx6ZnJpVE4Adot4ZnNqVU8Ac4p2ZXRrVlAAcolyZXVsV1EAcYhwZXZtWFIAcIdxaHdvWVMAb4ZuZnhwWlQAboVsZnlxW1UAboRqZnpyXFYAbYNqaHtyXVgAbIJoZ3xzXlkAa4FmZ31zX1oAaoBlZ350YFsAaX9jZ391YVwAaX5jant1Yl4AaH1hant2Y18AZ3xfZ3x3ZGAAZntfant3ZWEAZnpeant4ZmIAZXldaHx4Z2MAZXhcZ3x5aGQAZHdbZ3x6aWYAY3ZaZ3x7amcAY3VZZ3x8a2gAYnRYZ3x8bGkAYnNXZ3x9bWoAYXJWZ318bmwAYHFVZ319b20AYHBUaH19cG4AX29Uan1+cXAAXm5TaX1/cnEAXm1San1/c3IAXWxRan2Ac3QAXGFRAN4AXWtQan2BdHUAXGpPan2CdXcAW2lOan2DdngAW2hNan2DeHkAWmdMan2EeXsAWWZLan2Fe3wAWWVKan2GfH0AWGRJan2HfX8AWGNIan2If4AAV2JHan2JgIEAV2FGan2KgYMAVmBFan2Lg4QAVl9Ean2MhIYAVV5Dan2NhYcAVV1Ca36OhogAVFxBa36Ph4oAVFtAbH6QiYwAU1o/bH6RiY0AU1k+bX6Si48AUlg9bX6TjJAAUlc8bn6UjZIAUVY7bn6VjpMAUVU6b36WkJUAUFQ5b36XkZYAUFM4cH6YkpgAT1I3cH6ZlJoATlE2cX6alpwATlA1cX6bl50ATVB1cn6bnJ8ATU8zcn6cnqAATE4ycn6dnqIAS00xc36fn6QATE8yc36goaYAS0wxc36hoacAS0wwd36io6kASkswd36jpKoASksveH6lpawASksueH6mp60ASUoveH6nqK8ASEkteH6oqbEAR0kseX6pq7MAR0greX6rrLUARkgqeX6srrYARkgqen6tr7gARkgpen6vsLoARUcpen6wsrwARUcoe36ysr4ARUYne36ztcAAREYme36zuMIAREUle360ucQAQ0Ule361u8YAQ0Qke3+2vcgAQ0Qje3+3vsoBBkAAAA==');
                audio.volume = 0.3;
                audio.play().catch(() => { });
              } catch (e) { }

              // Update node under attack status
              setNodes((prevNodes) => {
                const updated = [...prevNodes];
                updated[0].status = 'under_attack';
                updated[0].requests += 1;
                return updated;
              });
            }
            return threats;
          });
          setIsBackendConnected(true);
        }
      });
    };

    // Initial load
    loadThreats();

    // Poll every 5 seconds (fallback for SSE not working on Render)
    const pollInterval = setInterval(loadThreats, 5000);

    // Also try SSE (works on local, might not on Render)
    const unsubscribe = subscribeToLiveFeed(
      (newThreat) => {
        setLiveThreats((prev) => {
          const exists = prev.some((t) => t.id === newThreat.id);
          if (exists) return prev;
          return [newThreat, ...prev].slice(0, 50);
        });
        setIsBackendConnected(true);

        // Show attack alert notification
        setAttackAlert(newThreat);
        setIsAlertAcknowledged(false);

        // Play alert sound
        try {
          const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleAgAYMDr2rN3PwUAbNbjp4BZJQCC2M+TaDouAGe+xIVWRCUAgr29fVZGPC0AiLi0dVhGPi4AgbKpdldLPjEAf6ymcVhLQjIAfqahblxOQTQAf6Kdb1xQQTQAfqKcc19RQjYAfaCacF9UQzYAfZ+Yb2FWRDgAfZ6WbmJXRTgAfZ2UbmNYRjkAfJySbmRaRzoAfJuQbWVbRzsAfJmObGZcSD0AfJiMa2ddSD4AfJeKamheSkAAepaJaWlfS0IAeZWHaGpgTEMAeZSFZ2thTUQAeJODZmxiTkYAeJKBZm1jT0kAd5CAZm5kUEkAd49+ZW9lUUoAdo5+aHBnUkwAdY18ZnFoU00AdIx6ZnJpVE4Adot4ZnNqVU8Ac4p2ZXRrVlAAcolyZXVsV1EAcYhwZXZtWFIAcIdxaHdvWVMAb4ZuZnhwWlQAboVsZnlxW1UAboRqZnpyXFYAbYNqaHtyXVgAbIJoZ3xzXlkAa4FmZ31zX1oAaoBlZ350YFsAaX9jZ391YVwAaX5jant1Yl4AaH1hant2Y18AZ3xfZ3x3ZGAAZntfant3ZWEAZnpeant4ZmIAZXldaHx4Z2MAZXhcZ3x5aGQAZHdbZ3x6aWYAY3ZaZ3x7amcAY3VZZ3x8a2gAYnRYZ3x8bGkAYnNXZ3x9bWoAYXJWZ318bmwAYHFVZ319b20AYHBUaH19cG4AX29Uan1+cXAAXm5TaX1/cnEAXm1San1/c3IAXWxRan2Ac3QAXGFRAN4AXWtQan2BdHUAXGpPan2CdXcAW2lOan2DdngAW2hNan2DeHkAWmdMan2EeXsAWWZLan2Fe3wAWWVKan2GfH0AWGRJan2HfX8AWGNIan2If4AAV2JHan2JgIEAV2FGan2KgYMAVmBFan2Lg4QAVl9Ean2MhIYAVV5Dan2NhYcAVV1Ca36OhogAVFxBa36Ph4oAVFtAbH6QiYwAU1o/bH6RiY0AU1k+bX6Si48AUlg9bX6TjJAAUlc8bn6UjZIAUVY7bn6VjpMAUVU6b36WkJUAUFQ5b36XkZYAUFM4cH6YkpgAT1I3cH6ZlJoATlE2cX6alpwATlA1cX6bl50ATVB1cn6bnJ8ATU8zcn6cnqAATE4ycn6dnqIAS00xc36fn6QATE8yc36goaYAS0wxc36hoacAS0wwd36io6kASkswd36jpKoASksveH6lpawASksueH6mp60ASUoveH6nqK8ASEkteH6oqbEAR0kseX6pq7MAR0greX6rrLUARkgqeX6srrYARkgqen6tr7gARkgpen6vsLoARUcpen6wsrwARUcoe36ysr4ARUYne36ztcAAREYme36zuMIAREUle360ucQAQ0Ule361u8YAQ0Qke3+2vcgAQ0Qje3+3vsoBBkAAAA==');
          audio.volume = 0.3;
          audio.play().catch(() => { });
        } catch (e) { }

        // Update node under attack status
        setNodes((prevNodes) => {
          const updated = [...prevNodes];
          updated[0].status = 'under_attack';
          updated[0].requests += 1;
          return updated;
        });
      },
      () => {
        console.log('SSE connection closed, using polling');
      }
    );

    return () => {
      clearInterval(pollInterval);
      unsubscribe();
    };
  }, []);

  // Toast auto-dismiss
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Attack alert - NO auto-dismiss, stays until user closes it

  // Block IP handler
  const handleBlockIP = useCallback(async (ip: string) => {
    const result = await blockIP(ip);
    if (result.success) {
      setToast({ message: result.message, type: 'success' });
      setSelectedThreat(null);
    } else {
      setToast({ message: result.message, type: 'error' });
    }
  }, []);

  // Handle keyboard navigation for modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedThreat) return;
      if (e.key === 'ArrowLeft') navigateThreat('prev');
      if (e.key === 'ArrowRight') navigateThreat('next');
      if (e.key === 'Escape') setSelectedThreat(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedThreat]);

  const handleNodeAction = (index: number) => {
    setRebootingIndex(index);
    setTimeout(() => {
      setRebootingIndex(null);
      // Toggle status for demo
      const newNodes = [...nodes];
      newNodes[index].status = newNodes[index].status === 'active' ? 'offline' : 'active';
      newNodes[index].uptime = '0d 0h';
      setNodes(newNodes);
    }, 2500);
  };

  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      const headerOffset = 100;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.scrollY - headerOffset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  };

  const navigateThreat = (direction: 'next' | 'prev') => {
    if (!selectedThreat) return;
    const currentIndex = allThreats.findIndex(a => a.id === selectedThreat.id);
    let nextIndex;
    if (direction === 'next') {
      nextIndex = (currentIndex + 1) % allThreats.length;
    } else {
      nextIndex = (currentIndex - 1 + allThreats.length) % allThreats.length;
    }
    setSelectedThreat(allThreats[nextIndex]);
  };

  return (
    <div className="relative min-h-screen text-white selection:bg-[#4fb7b3] selection:text-black cursor-auto md:cursor-none overflow-x-hidden font-sans">
      <CustomCursor />
      <FluidBackground />
      <AIChat />

      {/* RED ALERT - Flashing screen border when attack detected (stops when acknowledged or disabled) */}
      <AnimatePresence>
        {attackAlert && !isAlertAcknowledged && !isFlashingDisabled && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.3, 0.7, 0.3] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, repeat: Infinity }}
            className="fixed inset-0 z-[75] pointer-events-none"
            style={{
              boxShadow: 'inset 0 0 100px 20px rgba(239, 68, 68, 0.6), inset 0 0 200px 50px rgba(239, 68, 68, 0.3)',
              border: '4px solid rgba(239, 68, 68, 0.8)'
            }}
          />
        )}
      </AnimatePresence>

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-6 md:px-8 py-6 bg-black/50 backdrop-blur-md">
        <div className="flex items-center gap-2 z-50">
          <Shield className="w-6 h-6 text-[#a8fbd3]" />
          <div className="font-heading text-xl md:text-2xl font-bold tracking-tighter text-white cursor-default">HONEYPOT</div>
        </div>

        {/* Desktop Menu */}
        <div className="hidden md:flex gap-10 text-sm font-bold tracking-widest uppercase">
          {['Threats', 'Analytics', 'Nodes'].map((item) => (
            <button
              key={item}
              onClick={() => scrollToSection(item.toLowerCase())}
              className="hover:text-[#a8fbd3] transition-colors text-white cursor-pointer bg-transparent border-none flex items-center gap-2"
              data-hover="true"
            >
              {item === 'Threats' && <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />}
              {item}
            </button>
          ))}
        </div>
        <button
          onClick={() => scrollToSection('nodes')}
          className="hidden md:inline-block border border-white px-8 py-3 text-xs font-bold tracking-widest uppercase hover:bg-white hover:text-black transition-all duration-300 text-white cursor-pointer bg-transparent"
          data-hover="true"
        >
          System Status
        </button>

        {/* User info and Logout */}
        <div className="hidden md:flex items-center gap-4">
          <span className="text-xs text-white font-mono">
            {user && `👤 ${user.username}`}
          </span>
          <button
            onClick={logout}
            className="flex items-center gap-2 px-4 py-2 bg-red-600/20 border border-red-500/30 rounded text-red-400 hover:bg-red-600/40 hover:text-red-300 transition-all text-xs font-mono uppercase tracking-wider"
            data-hover="true"
          >
            <LogOut className="w-3 h-3" />
            Logout
          </button>
        </div>

        {/* Mobile Menu Toggle */}
        <button
          className="md:hidden text-white z-50 relative w-10 h-10 flex items-center justify-center"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X /> : <Menu />}
        </button>
      </nav>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed inset-0 z-30 bg-[#1f2048]/95 backdrop-blur-xl flex flex-col items-center justify-center gap-8 md:hidden"
          >
            {['Threats', 'Analytics', 'Nodes'].map((item) => (
              <button
                key={item}
                onClick={() => scrollToSection(item.toLowerCase())}
                className="text-4xl font-heading font-bold text-white hover:text-[#a8fbd3] transition-colors uppercase bg-transparent border-none"
              >
                {item}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* HERO SECTION */}
      <header className="relative h-[100svh] min-h-[600px] flex flex-col items-center justify-center overflow-hidden px-4">
        <motion.div
          style={{ y, opacity }}
          className="z-10 text-center flex flex-col items-center w-full max-w-6xl pb-24 md:pb-20"
        >
          {/* System Status Pill */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.2 }}
            className="flex items-center gap-3 md:gap-6 text-xs md:text-base font-mono text-[#a8fbd3] tracking-[0.2em] md:tracking-[0.3em] uppercase mb-4 bg-black/40 px-6 py-2 rounded-full backdrop-blur-md border border-white/10"
          >
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span>System Active</span>
            </div>
            <span className="opacity-30">|</span>
            <span>Monitoring 3 Nodes</span>
          </motion.div>

          {/* Main Title */}
          <div className="relative w-full flex justify-center items-center">
            <GradientText
              text="HONEYPOT"
              as="h1"
              className="text-[14vw] md:text-[13vw] leading-[0.9] font-black tracking-tighter text-center"
            />
            {/* Radar Animation */}
            <motion.div
              className="absolute -z-20 w-[40vw] h-[40vw] border border-[#4fb7b3]/30 rounded-full pointer-events-none"
              animate={{ scale: [0.5, 1.5], opacity: [0.5, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
            />
            <motion.div
              className="absolute -z-20 w-[40vw] h-[40vw] border border-[#a8fbd3]/20 rounded-full pointer-events-none"
              animate={{ scale: [0.5, 1.5], opacity: [0.5, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "linear", delay: 2 }}
            />
          </div>

          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 1.5, delay: 0.5, ease: "circOut" }}
            className="w-full max-w-md h-px bg-gradient-to-r from-transparent via-red-500/50 to-transparent mt-4 md:mt-8 mb-6 md:mb-8"
          />

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 1 }}
            className="text-base md:text-2xl font-light max-w-xl mx-auto text-white/90 leading-relaxed drop-shadow-lg px-4 font-mono"
          >
            Advanced deception technology & threat intelligence
          </motion.p>
        </motion.div>

        {/* MARQUEE */}
        <div className="absolute bottom-12 md:bottom-16 left-0 w-full py-4 md:py-6 bg-black text-white z-20 overflow-hidden border-y border-white/20">
          <motion.div
            className="flex w-fit will-change-transform"
            animate={{ x: "-50%" }}
            transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
          >
            {[0, 1].map((key) => (
              <div key={key} className="flex whitespace-nowrap shrink-0">
                {[...Array(4)].map((_, i) => (
                  <span key={i} className="text-2xl md:text-5xl font-mono font-bold px-8 flex items-center gap-4 text-[#4fb7b3]">
                    THREAT INTELLIGENCE <span className="text-white text-xl">●</span>
                    REAL-TIME MONITORING <span className="text-white text-xl">●</span>
                    ZERO TRUST <span className="text-white text-xl">●</span>
                  </span>
                ))}
              </div>
            ))}
          </motion.div>
        </div>
      </header>

      {/* THREATS / LINEUP SECTION */}
      <section id="threats" className="relative z-10 py-20 md:py-32">
        <div className="max-w-[1600px] mx-auto px-4 md:px-6">
          <div className="flex flex-col md:flex-row justify-between items-end mb-8 md:mb-12 px-4">
            <h2 className="text-5xl md:text-8xl font-heading font-bold uppercase leading-[0.9] drop-shadow-lg break-words w-full md:w-auto">
              Live <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-orange-500">Threats</span>
            </h2>
            <div className="flex items-center gap-2 mt-4 md:mt-0 font-mono text-[#a8fbd3]">
              <span className={`w-2 h-2 rounded-full ${isBackendConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500 animate-ping'}`} />
              {isBackendConnected ? `Live Feed (${liveThreats.length} attacks)` : 'Using Demo Data'}
            </div>
          </div>

          {/* Search and Filter Controls */}
          <div className="flex flex-col md:flex-row gap-4 mb-8 px-4">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by IP, type, location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#4fb7b3] focus:ring-1 focus:ring-[#4fb7b3] font-mono text-sm transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Filter Dropdown */}
            <div className="relative">
              <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="appearance-none pl-10 pr-10 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-[#4fb7b3] font-mono text-sm cursor-pointer min-w-[180px]"
              >
                {attackTypes.map((type) => (
                  <option key={type} value={type} className="bg-gray-900">
                    {type === 'all' ? '🎯 All Types' : type}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Results Count */}
          <div className="px-4 mb-4 font-mono text-sm text-gray-400">
            Showing {filteredThreats.slice(0, 6).length} of {filteredThreats.length} threats
            {(searchQuery || filterType !== 'all') && (
              <button
                onClick={() => { setSearchQuery(''); setFilterType('all'); }}
                className="ml-4 text-[#4fb7b3] hover:underline"
              >
                Clear filters
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 border-t border-l border-white/10 bg-black/20 backdrop-blur-sm">
            {filteredThreats.slice(0, 6).map((threat) => (
              <ThreatCard key={threat.id} threat={threat} onClick={() => setSelectedThreat(threat)} />
            ))}
            {filteredThreats.length === 0 && (
              <div className="col-span-3 py-20 text-center text-gray-500 font-mono">
                <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No threats match your search criteria</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ANALYTICS / EXPERIENCE SECTION */}
      <section id="analytics" className="relative z-10 py-20 md:py-32 bg-black/20 backdrop-blur-sm border-t border-white/10 overflow-hidden">
        {/* Decorative blurred circle */}
        <div className="absolute top-1/2 right-[-20%] w-[50vw] h-[50vw] bg-red-900/20 rounded-full blur-[40px] pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 md:px-6 relative">
          <div className="relative">
            <AnalyticsDashboard />
          </div>
        </div>
      </section>

      {/* NODES / TICKETS SECTION */}
      <section id="nodes" className="relative z-10 py-20 md:py-32 px-4 md:px-6 bg-black/30 backdrop-blur-lg">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12 md:mb-20">
            <h2 className="text-5xl md:text-9xl font-heading font-bold opacity-20 text-white">
              NETWORK
            </h2>
            <p className="text-[#a8fbd3] font-mono uppercase tracking-widest -mt-3 md:-mt-8 relative z-10 text-sm md:text-base">
              Active Honeypot Nodes
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {nodes.map((node, i) => {
              const isRebooting = rebootingIndex === i;
              const isUnderAttack = node.status === 'under_attack';

              return (
                <motion.div
                  key={node.id}
                  whileHover={{ y: -10 }}
                  className={`relative p-8 md:p-10 border backdrop-blur-md flex flex-col min-h-[400px] transition-all duration-300 ${isUnderAttack ? 'border-red-500/50 bg-red-900/10' : 'border-white/10 bg-white/5'
                    }`}
                  data-hover="true"
                >
                  <div className={`absolute top-0 left-0 w-full h-1 ${isUnderAttack ? 'bg-red-500' : 'bg-[#4fb7b3]'}`} />

                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-4">
                      <Server className={`w-8 h-8 ${isUnderAttack ? 'text-red-500' : 'text-[#4fb7b3]'}`} />
                      <div className={`px-2 py-1 rounded text-xs font-mono uppercase ${node.status === 'active' ? 'bg-green-500/20 text-green-400' :
                        node.status === 'offline' ? 'bg-gray-500/20 text-gray-400' :
                          'bg-red-500/20 text-red-400 animate-pulse'
                        }`}>
                        {node.status.replace('_', ' ')}
                      </div>
                    </div>

                    <h3 className="text-2xl font-heading font-bold mb-2 text-white">{node.name}</h3>
                    <p className="text-sm text-gray-400 mb-8">{node.region}</p>

                    <ul className="space-y-4 text-sm font-mono text-gray-300">
                      <li className="flex justify-between border-b border-white/5 pb-2">
                        <span>Uptime</span>
                        <span className="text-white">{node.uptime}</span>
                      </li>
                      <li className="flex justify-between border-b border-white/5 pb-2">
                        <span>Requests</span>
                        <span className="text-white">{node.requests.toLocaleString()}</span>
                      </li>
                      <li className="flex justify-between pb-2">
                        <span>Load</span>
                        <div className="w-20 bg-white/10 h-2 rounded-full mt-1.5 overflow-hidden">
                          <div
                            className={`h-full ${isUnderAttack ? 'bg-red-500' : 'bg-[#4fb7b3]'}`}
                            style={{ width: isUnderAttack ? '90%' : '30%' }}
                          />
                        </div>
                      </li>
                    </ul>
                  </div>

                  <button
                    onClick={() => handleNodeAction(i)}
                    disabled={isRebooting}
                    className={`w-full py-4 text-sm font-bold uppercase tracking-[0.2em] border border-white/20 transition-all duration-300 mt-8 group overflow-hidden relative 
                      ${isRebooting
                        ? 'bg-white/10 cursor-wait'
                        : 'hover:bg-white hover:text-black cursor-pointer'
                      }`}
                  >
                    <span className="relative z-10 flex items-center justify-center gap-2">
                      {isRebooting ? 'Restarting...' : <><Terminal className="w-4 h-4" /> REBOOT NODE</>}
                    </span>
                  </button>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* World Map Section */}
      <section className="relative z-10 py-16 md:py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-heading font-bold mb-8">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#4fb7b3] to-[#a8fbd3]">Attack</span> Origins
          </h2>
          <WorldMap className="h-[400px]" />
        </div>
      </section>

      <footer className="relative z-10 border-t border-white/10 py-12 md:py-16 bg-black/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-start md:items-end gap-8">
          <div>
            <div className="font-heading text-3xl md:text-4xl font-bold tracking-tighter mb-4 text-white">HONEYPOT SEC</div>
            <div className="flex gap-2 text-xs font-mono text-gray-400">
              <span>System Version 2.0.4-beta</span>
            </div>
          </div>

          <div className="flex gap-6 md:gap-8 flex-wrap">
            <span className="text-xs font-mono text-gray-500">
              AUTHORIZED PERSONNEL ONLY
            </span>
          </div>
        </div>
      </footer>

      {/* Threat Detail Modal */}
      <AnimatePresence>
        {selectedThreat && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedThreat(null)}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md cursor-auto"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-5xl bg-[#0f0f1a] border border-red-500/30 overflow-hidden flex flex-col md:flex-row shadow-2xl shadow-red-500/10 group/modal"
            >
              {/* Close Button */}
              <button
                onClick={() => setSelectedThreat(null)}
                className="absolute top-4 right-4 z-20 p-2 rounded-full bg-black/50 text-white hover:bg-white hover:text-black transition-colors"
                data-hover="true"
              >
                <X className="w-6 h-6" />
              </button>

              {/* Navigation Buttons */}
              <button
                onClick={(e) => { e.stopPropagation(); navigateThreat('prev'); }}
                className="absolute left-4 bottom-4 translate-y-0 md:top-1/2 md:bottom-auto md:-translate-y-1/2 z-20 p-3 rounded-full bg-black/50 text-white hover:bg-white hover:text-black transition-colors border border-white/10 backdrop-blur-sm"
                data-hover="true"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>

              <button
                onClick={(e) => { e.stopPropagation(); navigateThreat('next'); }}
                className="absolute right-4 bottom-4 translate-y-0 md:top-1/2 md:bottom-auto md:-translate-y-1/2 z-20 p-3 rounded-full bg-black/50 text-white hover:bg-white hover:text-black transition-colors border border-white/10 backdrop-blur-sm md:right-8"
                data-hover="true"
              >
                <ChevronRight className="w-6 h-6" />
              </button>

              {/* Image/Map Side */}
              <div className="w-full md:w-1/2 h-64 md:h-auto relative overflow-hidden">
                <AnimatePresence mode="wait">
                  <motion.img
                    key={selectedThreat.id}
                    src={selectedThreat.image}
                    alt={selectedThreat.type}
                    initial={{ opacity: 0, scale: 1.1 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.4 }}
                    className="absolute inset-0 w-full h-full object-cover grayscale invert"
                  />
                </AnimatePresence>
                <div className="absolute inset-0 bg-gradient-to-t from-[#0f0f1a] via-transparent to-transparent md:bg-gradient-to-r" />
                <div className="absolute bottom-4 left-4 font-mono text-xs text-red-500 bg-black/80 px-2 py-1">
                  EVIDENCE CAPTURE #{selectedThreat.id}
                </div>
              </div>

              {/* Content Side */}
              <div className="w-full md:w-1/2 p-8 pb-24 md:p-12 flex flex-col justify-center relative">
                <motion.div
                  key={selectedThreat.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: 0.1 }}
                >
                  <div className="flex items-center gap-3 text-red-500 mb-4">
                    <AlertTriangle className="w-5 h-5" />
                    <span className="font-mono text-sm tracking-widest uppercase">{selectedThreat.timestamp}</span>
                  </div>

                  <h3 className="text-3xl md:text-5xl font-heading font-bold uppercase leading-none mb-2 text-white">
                    {selectedThreat.type}
                  </h3>

                  <div className="flex gap-4 mt-4 mb-6">
                    <div className="flex flex-col">
                      <span className="text-xs text-gray-500 uppercase tracking-wider">Origin</span>
                      <span className="text-[#a8fbd3] font-mono">{selectedThreat.location}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs text-gray-500 uppercase tracking-wider">IP Address</span>
                      <span className="text-white font-mono">{selectedThreat.ip}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs text-gray-500 uppercase tracking-wider">Severity</span>
                      <span className={`font-mono font-bold ${selectedThreat.severity === 'critical' ? 'text-red-500' :
                        selectedThreat.severity === 'high' ? 'text-orange-500' :
                          selectedThreat.severity === 'medium' ? 'text-yellow-500' : 'text-green-500'
                        }`}>{selectedThreat.severity.toUpperCase()}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs text-gray-500 uppercase tracking-wider">Confidence</span>
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-2 bg-white/10 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-[#4fb7b3] to-[#a8fbd3]"
                            style={{ width: `${selectedThreat.confidence}%` }}
                          />
                        </div>
                        <span className="text-white font-mono text-sm">{selectedThreat.confidence}%</span>
                      </div>
                    </div>
                  </div>

                  <div className="h-px w-full bg-white/10 mb-4" />

                  {/* Enhanced Payload Viewer */}
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-gray-500 uppercase tracking-wider flex items-center gap-2">
                        <Terminal className="w-3 h-3" /> Attack Payload Analysis
                      </span>
                      <span className={`px-2 py-0.5 rounded text-xs font-mono ${selectedThreat.severity === 'critical' ? 'bg-red-500/20 text-red-400' :
                        selectedThreat.severity === 'high' ? 'bg-orange-500/20 text-orange-400' :
                          selectedThreat.severity === 'medium' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-green-500/20 text-green-400'
                        }`}>
                        {selectedThreat.type}
                      </span>
                    </div>
                    <div className="bg-[#0a0a0f] p-4 rounded-lg border border-white/10 font-mono text-sm overflow-x-auto">
                      <div className="flex items-center gap-2 mb-3 text-gray-500 text-xs border-b border-white/5 pb-2">
                        <span className="w-2 h-2 rounded-full bg-red-500" />
                        <span className="w-2 h-2 rounded-full bg-yellow-500" />
                        <span className="w-2 h-2 rounded-full bg-green-500" />
                        <span className="ml-2">payload_analysis.log</span>
                      </div>
                      <div className="space-y-1">
                        <div><span className="text-purple-400">$ </span><span className="text-gray-400">cat</span> <span className="text-green-400">intercepted_payload.txt</span></div>
                        <div className="pl-4 text-red-400 break-all">{selectedThreat.description}</div>
                        <div className="mt-3"><span className="text-purple-400">$ </span><span className="text-gray-400">classify</span> <span className="text-yellow-400">--model ml_attack_classifier</span></div>
                        <div className="pl-4"><span className="text-gray-500">[</span><span className="text-green-400">✓</span><span className="text-gray-500">]</span> Classified as: <span className="text-red-400 font-bold">{selectedThreat.type}</span></div>
                        <div className="pl-4"><span className="text-gray-500">[</span><span className="text-cyan-400">i</span><span className="text-gray-500">]</span> Confidence Score: <span className="text-[#4fb7b3]">{selectedThreat.confidence}%</span></div>
                        <div className="pl-4"><span className="text-gray-500">[</span><span className="text-yellow-400">!</span><span className="text-gray-500">]</span> Threat Level: <span className={`font-bold ${selectedThreat.severity === 'critical' ? 'text-red-500' :
                          selectedThreat.severity === 'high' ? 'text-orange-500' :
                            selectedThreat.severity === 'medium' ? 'text-yellow-500' : 'text-green-500'
                          }`}>{selectedThreat.severity.toUpperCase()}</span></div>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleBlockIP(selectedThreat.ip)}
                    className="bg-red-600 hover:bg-red-500 text-white px-6 py-3 font-bold uppercase tracking-widest text-sm transition-colors w-fit flex items-center gap-2"
                  >
                    <Lock className="w-4 h-4" />
                    Block IP Address
                  </button>
                </motion.div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[70] px-6 py-3 rounded-lg shadow-lg flex items-center gap-3 font-mono text-sm ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'
              }`}
          >
            {toast.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Attack Alert Notification - Big popup when attack detected! */}
      <AnimatePresence>
        {attackAlert && (
          <motion.div
            initial={{ opacity: 0, x: 400, scale: 0.8 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 400, scale: 0.8 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
            className="fixed top-24 right-6 z-[80] w-80 md:w-96"
          >
            <div className="bg-gradient-to-br from-red-900/95 to-red-950/95 backdrop-blur-xl border border-red-500/50 rounded-xl shadow-2xl shadow-red-500/30 overflow-hidden">
              {/* Animated top bar */}
              <div className="h-1 bg-gradient-to-r from-red-500 via-orange-500 to-red-500 animate-pulse" />

              {/* Header */}
              <div className="p-4 flex items-center gap-3 border-b border-red-500/30">
                <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center animate-pulse">
                  <Zap className="w-5 h-5 text-red-400" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4 text-red-400 animate-bounce" />
                    <span className="text-red-400 font-bold uppercase tracking-wider text-xs">Attack Detected!</span>
                  </div>
                  <p className="text-white font-heading font-bold text-lg">{attackAlert.type}</p>
                </div>
                <button
                  onClick={() => setAttackAlert(null)}
                  className="text-white/50 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400 text-xs uppercase">Attacker IP</span>
                  <span className="text-white font-mono text-sm">{attackAlert.ip}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400 text-xs uppercase">Location</span>
                  <span className="text-[#a8fbd3] font-mono text-sm">{attackAlert.location}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400 text-xs uppercase">Confidence</span>
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-red-500" style={{ width: `${attackAlert.confidence}%` }} />
                    </div>
                    <span className="text-red-400 font-mono text-sm">{attackAlert.confidence}%</span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400 text-xs uppercase">Time</span>
                  <span className="text-white font-mono text-sm">{attackAlert.timestamp}</span>
                </div>
              </div>

              {/* Action */}
              <div className="p-4 border-t border-red-500/30 space-y-2">
                {/* Acknowledge button - stops red flashing permanently */}
                {!isFlashingDisabled ? (
                  <button
                    onClick={() => {
                      setIsAlertAcknowledged(true);
                      setIsFlashingDisabled(true); // Permanently disable flashing until re-enabled
                    }}
                    className="w-full py-2 bg-yellow-600 hover:bg-yellow-500 text-white font-bold uppercase tracking-wider text-xs rounded transition-colors flex items-center justify-center gap-2"
                  >
                    <Bell className="w-4 h-4" />
                    Stop Flashing
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setIsFlashingDisabled(false);
                      setIsAlertAcknowledged(false);
                    }}
                    className="w-full py-2 bg-green-600 hover:bg-green-500 text-white font-bold uppercase tracking-wider text-xs rounded transition-colors flex items-center justify-center gap-2"
                  >
                    <Bell className="w-4 h-4" />
                    Re-enable Flashing Alerts
                  </button>
                )}
                <button
                  onClick={() => {
                    setSelectedThreat(attackAlert);
                    setAttackAlert(null);
                  }}
                  className="w-full py-2 bg-red-600 hover:bg-red-500 text-white font-bold uppercase tracking-wider text-xs rounded transition-colors flex items-center justify-center gap-2"
                >
                  <AlertTriangle className="w-4 h-4" />
                  View Details
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// App wrapper with authentication
const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

// Content that switches between login and dashboard
const AppContent: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();

  // Show loading state while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#4fb7b3]/30 border-t-[#4fb7b3] rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400 font-mono text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  return isAuthenticated ? <Dashboard /> : <AuthPage />;
};

export default App;

