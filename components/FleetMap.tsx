import React, { useEffect } from 'react';
import { useSupabaseData } from '../hooks/useSupabaseData';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet's default icon path issues
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom Icon generator based on driver status
const createDriverIcon = (status: string, name: string) => {
    let color = '#64748b'; // Off
    if (status === 'Working') color = '#10b981';
    if (status === 'Paused') color = '#f59e0b';
    if (status === 'En Route' || status === 'In Progress') color = '#3b82f6';

    // Create an SVG string for a custom marker
    const svgIcon = `
    <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
      <circle cx="20" cy="20" r="16" fill="${color}" fill-opacity="0.2" stroke="${color}" stroke-width="2">
        ${status === 'Working' ? '<animate attributeName="r" values="12;16;12" dur="2s" repeatCount="indefinite" />' : ''}
      </circle>
      <circle cx="20" cy="20" r="8" fill="${color}" />
      <text x="20" y="20" font-family="sans-serif" font-size="8" font-weight="bold" fill="white" text-anchor="middle" dominant-baseline="central">${name}</text>
    </svg>`;

    return L.divIcon({
        className: 'custom-driver-marker',
        html: svgIcon,
        iconSize: [40, 40],
        iconAnchor: [20, 20],
        popupAnchor: [0, -20]
    });
};

const RecenterControls = ({ center }: { center: [number, number] }) => {
    const map = useMap();
    useEffect(() => {
        const handleRecenter = () => {
            map.setView(center, map.getZoom());
        };
        const el = document.getElementById('btn-recenter');
        if (el) el.addEventListener('click', handleRecenter);
        return () => {
            if (el) el.removeEventListener('click', handleRecenter);
        };
    }, [map, center]);
    return null;
};

// Alicante Airport coords as default center
const defaultCenter: [number, number] = [38.2822, -0.5582];
const zoomLevel = 11;

export const FleetMap: React.FC = () => {
    const { data: drivers } = useSupabaseData('drivers');
    const { data: locations } = useSupabaseData('driver_locations', { orderBy: 'updated_at' });

    return (
        <div className="w-full h-full relative overflow-hidden rounded-2xl isolate">
            {/* The leaflet MapContainer */}
            <MapContainer
                center={defaultCenter}
                zoom={zoomLevel}
                style={{ height: '100%', width: '100%', background: '#0b1118' }}
                zoomControl={false}
                attributionControl={false}
            >
                <TileLayer
                    url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                />
                <RecenterControls center={defaultCenter} />

                {/* Alicante Airport Landmark */}
                <Marker position={[defaultCenter[0], defaultCenter[1]]} icon={L.divIcon({
                    className: 'landmark-icon',
                    html: `<div class="bg-blue-500/20 border border-blue-500/50 p-2 rounded-full flex items-center justify-center backdrop-blur text-blue-400">
                             <span class="material-icons-round text-sm">flight</span>
                           </div>`,
                    iconSize: [32, 32],
                    iconAnchor: [16, 16]
                })}>
                    <Popup className="custom-popup">
                        <div className="font-bold text-slate-800">Alicante Airport (ALC)</div>
                    </Popup>
                </Marker>

                {/* Driver Markers from Real Geolocation */}
                {drivers?.map((d: any) => {
                    const loc = locations?.find((l: any) => l.driver_id === d.id);

                    if (loc && loc.lat && loc.lng) {
                        const position: [number, number] = [loc.lat, loc.lng];
                        const icon = createDriverIcon(d.current_status || 'Off', (d.name || '?')[0]);

                        return (
                            <Marker key={d.id} position={position} icon={icon}>
                                <Popup className="custom-popup">
                                    <div className="bg-white p-1 rounded">
                                        <p className="font-bold text-slate-800 mb-1">{d.name}</p>
                                        <p className="text-xs text-slate-500 mb-0.5">Estado: <span className="font-semibold">{d.current_status}</span></p>
                                        <p className="text-[10px] text-slate-400">Última señal: {new Date(loc.updated_at).toLocaleTimeString()}</p>
                                    </div>
                                </Popup>
                            </Marker>
                        );
                    }
                    return null;
                })}
            </MapContainer>

            {/* Map Controls Overlay over the map wrapper */}
            <div className="absolute top-4 left-4 flex gap-2 z-[400]">
                <button id="btn-recenter" className="px-3 py-1 bg-slate-900/80 border border-slate-700/50 backdrop-blur rounded-lg text-xs font-bold text-white hover:bg-blue-600 shadow-xl transition-colors">
                    <span className="material-icons-round text-[14px] align-middle mr-1">my_location</span> RE-CENTER
                </button>
            </div>

            <div className="absolute bottom-4 right-4 text-[10px] text-blue-400 bg-blue-900/30 border border-blue-500/30 backdrop-blur px-2 py-1 rounded font-bold uppercase tracking-widest pointer-events-none z-[400]">
                LIVE GPS DATA • LEAFLET MAPS
            </div>

            <style>{`
                .leaflet-popup-content-wrapper {
                    background-color: white;
                    color: #333;
                    border-radius: 8px;
                    padding: 4px;
                }
                .leaflet-popup-tip {
                    background-color: white;
                }
                .custom-driver-marker svg {
                    filter: drop-shadow(0 4px 6px rgba(0,0,0,0.3));
                }
            `}</style>
        </div>
    );
};
