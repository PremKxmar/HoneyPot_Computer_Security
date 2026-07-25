
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/


export interface Threat {
  id: string;
  type: string; // e.g., SQL Injection, XSS
  ip: string;
  location: string; // GeoIP City/Country
  confidence: number; // ML Confidence
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: string;
  image: string; // Abstract representation
  description: string;
}

export interface NodeStatus {
  id: string;
  name: string;
  region: string;
  status: 'active' | 'under_attack' | 'offline';
  uptime: string;
  requests: number;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  isError?: boolean;
}

export enum Section {
  HERO = 'hero',
  THREATS = 'threats',
  ANALYTICS = 'analytics',
  NODES = 'nodes',
}
