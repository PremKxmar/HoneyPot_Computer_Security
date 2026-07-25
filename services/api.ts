/**
 * @license
 * SPDX-License-Identifier: MIT
 */

import { Threat } from '../types';
import { API_BASE } from './config';

// Threat severity images for visual representation
const THREAT_IMAGES: Record<string, string> = {
    'SQL Injection': 'https://images.unsplash.com/photo-1558494949-efc02570fbc9?q=80&w=1000&auto=format&fit=crop',
    'XSS': 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?q=80&w=1000&auto=format&fit=crop',
    'Brute Force': 'https://images.unsplash.com/photo-1614064641938-3bbee52942c7?q=80&w=1000&auto=format&fit=crop',
    'Directory Traversal': 'https://images.unsplash.com/photo-1516110833967-0b5716ca1387?q=80&w=1000&auto=format&fit=crop',
    'Port Scan': 'https://images.unsplash.com/photo-1544197150-b99a580bbcbf?q=80&w=1000&auto=format&fit=crop',
    'Command Injection': 'https://images.unsplash.com/photo-1555949963-aa79dcee981c?q=80&w=1000&auto=format&fit=crop',
    'SSRF': 'https://images.unsplash.com/photo-1558494949-efc02570fbc9?q=80&w=1000&auto=format&fit=crop',
    'File Upload Attack': 'https://images.unsplash.com/photo-1544197150-b99a580bbcbf?q=80&w=1000&auto=format&fit=crop',
    'LDAP Injection': 'https://images.unsplash.com/photo-1555949963-aa79dcee981c?q=80&w=1000&auto=format&fit=crop',
    'Reconnaissance': 'https://images.unsplash.com/photo-1516110833967-0b5716ca1387?q=80&w=1000&auto=format&fit=crop',
    'default': 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=1000&auto=format&fit=crop'
};

// Map attack types to severity
const getSeverity = (attackType: string): 'low' | 'medium' | 'high' | 'critical' => {
    const severityMap: Record<string, 'low' | 'medium' | 'high' | 'critical'> = {
        'SQL Injection': 'critical',
        'Command Injection': 'critical',
        'SSRF': 'critical',
        'LDAP Injection': 'critical',
        'XSS': 'high',
        'Directory Traversal': 'high',
        'File Upload Attack': 'high',
        'Brute Force': 'medium',
        'Suspicious Activity': 'medium',
        'Port Scan': 'low',
        'Reconnaissance': 'low',
        'Normal': 'low'
    };
    return severityMap[attackType] || 'medium';
};

// Get random confidence score (simulating ML model output)
const getConfidence = (attackType: string): number => {
    if (attackType === 'Normal') return Math.floor(Math.random() * 30) + 20;
    return Math.floor(Math.random() * 15) + 85; // 85-100 for attacks
};

// Backend response interface
export interface BackendAttackLog {
    id: number;
    timestamp: string;
    ip_address: string;
    country: string;
    city: string;
    endpoint: string;
    method: string;
    payload: string | null;
    user_agent: string;
    attack_type: string;
}

// Transform backend data to frontend Threat format
export const transformToThreat = (log: BackendAttackLog): Threat => {
    const location = log.city && log.city !== 'Unknown'
        ? `${log.city}, ${log.country}`
        : log.country || 'Unknown';

    const attackType = log.attack_type || 'Unknown';
    const image = THREAT_IMAGES[attackType] || THREAT_IMAGES['default'];

    return {
        id: String(log.id),
        type: attackType,
        ip: log.ip_address,
        location: location,
        confidence: getConfidence(attackType),
        severity: getSeverity(attackType),
        timestamp: new Date(log.timestamp + 'Z').toLocaleTimeString('en-US', {
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            timeZoneName: 'short'
        }),
        image: image,
        description: log.payload
            ? `Payload detected: "${log.payload.substring(0, 100)}${log.payload.length > 100 ? '...' : ''}". Target: ${log.endpoint} [${log.method}]`
            : `Request to ${log.endpoint} endpoint via ${log.method}. User-Agent: ${log.user_agent?.substring(0, 50) || 'Unknown'}...`
    };
};

// Fetch recent threats from backend
export const fetchThreats = async (limit: number = 50): Promise<Threat[]> => {
    try {
        const response = await fetch(`${API_BASE}/api/threats?limit=${limit}`);
        if (!response.ok) throw new Error('Failed to fetch threats');
        const data: BackendAttackLog[] = await response.json();
        return data.map(transformToThreat);
    } catch (error) {
        console.error('Error fetching threats:', error);
        return [];
    }
};

// Subscribe to live threat feed via SSE
export const subscribeToLiveFeed = (
    onThreat: (threat: Threat) => void,
    onError?: (error: Event) => void
): (() => void) => {
    const eventSource = new EventSource(`${API_BASE}/api/stream`);

    eventSource.onmessage = (event) => {
        try {
            const log: BackendAttackLog = JSON.parse(event.data);
            const threat = transformToThreat(log);
            onThreat(threat);
        } catch (error) {
            console.error('Error parsing SSE data:', error);
        }
    };

    eventSource.onerror = (error) => {
        console.error('SSE connection error:', error);
        if (onError) onError(error);
    };

    // Return cleanup function
    return () => {
        eventSource.close();
    };
};

// Block an IP address
export const blockIP = async (ip: string): Promise<{ success: boolean; message: string }> => {
    try {
        const response = await fetch(`${API_BASE}/api/block-ip`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ ip }),
        });

        if (!response.ok) throw new Error('Failed to block IP');
        return await response.json();
    } catch (error) {
        console.error('Error blocking IP:', error);
        return { success: false, message: 'Failed to block IP address' };
    }
};

// Fetch dashboard stats
export const fetchStats = async () => {
    try {
        const response = await fetch(`${API_BASE}/api/stats`);
        if (!response.ok) throw new Error('Failed to fetch stats');
        return await response.json();
    } catch (error) {
        console.error('Error fetching stats:', error);
        return null;
    }
};
