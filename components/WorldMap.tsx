import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, CircleMarker } from 'react-leaflet';
import { Icon, divIcon } from 'leaflet';
import { Globe } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

import { API_BASE } from '../services/config';

interface AttackLocation {
    id: number;
    lat: number;
    lon: number;
    country: string;
    city: string;
    attack_type: string;
    ip_address: string;
    timestamp: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
}

interface WorldMapProps {
    className?: string;
}

const WorldMap: React.FC<WorldMapProps> = ({ className = '' }) => {
    const [attacks, setAttacks] = useState<AttackLocation[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Fetch attack locations
    useEffect(() => {
        const fetchLocations = async () => {
            try {
                const response = await fetch(`${API_BASE}/api/attack-locations`);
                if (response.ok) {
                    const data = await response.json();
                    setAttacks(data);
                }
            } catch (error) {
                console.error('Failed to fetch attack locations:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchLocations();
        const interval = setInterval(fetchLocations, 30000); // Refresh every 30s
        return () => clearInterval(interval);
    }, []);

    // Get marker color based on severity
    const getSeverityColor = (severity: string) => {
        switch (severity) {
            case 'critical': return '#ef4444';
            case 'high': return '#f97316';
            case 'medium': return '#eab308';
            default: return '#22c55e';
        }
    };

    if (isLoading) {
        return (
            <div className={`flex items-center justify-center h-64 bg-black/40 rounded-xl border border-white/10 ${className}`}>
                <div className="text-center">
                    <Globe className="w-8 h-8 text-[#4fb7b3] animate-pulse mx-auto mb-2" />
                    <p className="text-gray-400 font-mono text-sm">Loading attack map...</p>
                </div>
            </div>
        );
    }

    return (
        <div className={`relative rounded-xl overflow-hidden border border-white/10 ${className}`}>
            <div className="absolute top-4 left-4 z-[1000] bg-black/80 backdrop-blur-md px-4 py-2 rounded-lg border border-[#4fb7b3]/30">
                <h3 className="text-white font-heading font-bold flex items-center gap-2 text-sm">
                    <Globe className="w-4 h-4 text-[#4fb7b3]" />
                    Attack Origins
                </h3>
                <p className="text-gray-400 text-xs font-mono">{attacks.length} attacks detected</p>
            </div>

            <MapContainer
                center={[20, 0]}
                zoom={2}
                style={{ height: '400px', width: '100%' }}
                className="z-0"
                scrollWheelZoom={true}
            >
                <TileLayer
                    attribution='&copy; <a href="https://carto.com/">CartoDB</a>'
                    url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                />

                {attacks.filter(a => a.lat !== 0 && a.lon !== 0).map((attack) => (
                    <CircleMarker
                        key={attack.id}
                        center={[attack.lat, attack.lon]}
                        radius={8}
                        pathOptions={{
                            color: getSeverityColor(attack.severity),
                            fillColor: getSeverityColor(attack.severity),
                            fillOpacity: 0.7,
                            weight: 2
                        }}
                    >
                        <Popup>
                            <div className="text-sm">
                                <p className="font-bold text-red-600">{attack.attack_type}</p>
                                <p className="text-gray-600">IP: {attack.ip_address}</p>
                                <p className="text-gray-600">{attack.city}, {attack.country}</p>
                                <p className="text-gray-400 text-xs">{attack.timestamp}</p>
                            </div>
                        </Popup>
                    </CircleMarker>
                ))}
            </MapContainer>

            {/* Legend */}
            <div className="absolute bottom-4 right-4 z-[1000] bg-black/80 backdrop-blur-md px-3 py-2 rounded-lg border border-white/10">
                <p className="text-xs text-gray-400 mb-1 font-mono">Severity</p>
                <div className="flex gap-2 text-xs">
                    <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-[#22c55e]"></span>
                        Low
                    </span>
                    <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-[#eab308]"></span>
                        Med
                    </span>
                    <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-[#f97316]"></span>
                        High
                    </span>
                    <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-[#ef4444]"></span>
                        Crit
                    </span>
                </div>
            </div>
        </div>
    );
};

export default WorldMap;
