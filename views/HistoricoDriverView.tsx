import React, { useState, useMemo } from 'react';
import { useSupabaseData } from '../hooks/useSupabaseData';

interface HistoricoDriverViewProps {
    driverId: string;
}

export const HistoricoDriverView: React.FC<HistoricoDriverViewProps> = ({ driverId }) => {
    const { data: allBookings, loading } = useSupabaseData('bookings');

    // Date range filters
    const [startDate, setStartDate] = useState(() => {
        const d = new Date();
        d.setDate(d.getDate() - 30); // Last 30 days by default
        return d.toISOString().split('T')[0];
    });
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
    const [hideCancelled, setHideCancelled] = useState(true);

    const filteredHistory = useMemo(() => {
        if (!allBookings) return [];
        return allBookings.filter((b: any) => {
            // Show all services (Completed, Cancelled, etc.) that were assigned to this driver
            if (b.driver_id !== driverId) return false;

            // Date range filter
            // Normalize pickup_date to comparison date (handle timestamps)
            const bDate = b.pickup_date ? b.pickup_date.split('T')[0] : '';
            if (bDate < startDate || bDate > endDate) return false;

            // Hide cancelled filter
            if (hideCancelled && b.status === 'Cancelled') return false;

            return true;
        }).sort((a: any, b: any) => b.pickup_date.localeCompare(a.pickup_date) || b.pickup_time.localeCompare(a.pickup_time));
    }, [allBookings, driverId, startDate, endDate, hideCancelled]);

    if (loading) return <div className="p-8 text-center text-brand-platinum/50 uppercase tracking-widest text-xs">Cargando historial...</div>;

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'Completed': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
            case 'Cancelled': return 'bg-red-500/10 text-red-500 border-red-500/20';
            case 'In Progress': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
            default: return 'bg-brand-platinum/10 text-brand-platinum/50 border-white/5';
        }
    };

    return (
        <div className="flex-1 bg-brand-black p-4 sm:p-8 animate-fadeIn">
            {/* Header */}
            <div className="mb-8">
                <h2 className="text-2xl font-light text-white tracking-tight mb-2">Histórico de <span className="font-black text-brand-platinum">Servicios</span></h2>
                <p className="text-[10px] text-brand-platinum/50 uppercase tracking-[0.2em] font-bold">Registro completo de todos tus trayectos</p>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-brand-charcoal/40 border border-white/5 rounded-2xl p-4">
                    <label className="text-[9px] text-brand-platinum/30 font-black uppercase tracking-widest block mb-2">Desde</label>
                    <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full bg-transparent text-white text-sm outline-none"
                        style={{ colorScheme: 'dark' }}
                    />
                </div>
                <div className="bg-brand-charcoal/40 border border-white/5 rounded-2xl p-4">
                    <label className="text-[9px] text-brand-platinum/30 font-black uppercase tracking-widest block mb-2">Hasta</label>
                    <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full bg-transparent text-white text-sm outline-none"
                        style={{ colorScheme: 'dark' }}
                    />
                </div>
            </div>

            {/* View Options */}
            <div className="flex items-center gap-3 mb-8 px-2">
                <div
                    onClick={() => setHideCancelled(!hideCancelled)}
                    className="flex items-center gap-3 cursor-pointer group"
                >
                    <div className="relative">
                        <div className={`w-10 h-5 rounded-full transition-all duration-300 ${hideCancelled ? 'bg-brand-platinum shadow-[0_0_10px_rgba(255,255,255,0.3)]' : 'bg-white/10'}`}></div>
                        <div className={`absolute top-1 left-1 w-3 h-3 rounded-full bg-brand-black transition-all duration-300 ${hideCancelled ? 'translate-x-5' : 'translate-x-0'}`}></div>
                    </div>
                    <span className="text-[10px] font-bold text-brand-platinum uppercase tracking-widest opacity-70 group-hover:opacity-100 transition-opacity">Ocultar Cancelados</span>
                </div>
            </div>

            {/* List of history */}
            <div className="space-y-4">
                {filteredHistory.length === 0 ? (
                    <div className="p-12 text-center bg-brand-charcoal/20 border border-dashed border-white/5 rounded-3xl text-brand-platinum/30 italic text-sm">
                        No hay servicios registrados en este periodo
                    </div>
                ) : (
                    filteredHistory.map((b: any) => (
                        <div key={b.id} className="bg-brand-charcoal/30 border border-white/5 rounded-3xl p-6 group hover:bg-brand-charcoal/40 transition-all border-l-4 border-l-brand-platinum/20">
                            <div className="flex justify-between items-start mb-4">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2 bg-white/5 px-3 py-1 rounded-lg border border-white/10 w-fit">
                                        <span className="material-icons-round text-brand-gold text-xs">event</span>
                                        <p className="text-brand-platinum font-bold text-[10px] tracking-widest uppercase">
                                            {new Date(b.pickup_date).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })} {b.pickup_time}h
                                        </p>
                                    </div>
                                    <p className="text-sm font-light text-brand-platinum/50 uppercase tracking-[0.2em] pt-1">ID: #{b.display_id || b.id.slice(0, 6)}</p>
                                </div>
                                <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border ${getStatusStyle(b.status)}`}>
                                    {b.status === 'Completed' ? 'Completado' : b.status === 'Cancelled' ? 'Cancelado' : b.status}
                                </span>
                            </div>

                            <div className="space-y-3 mb-4">
                                <div className="flex items-start gap-3">
                                    <div className="w-1.5 h-1.5 rounded-full bg-brand-platinum mt-1.5 shrink-0"></div>
                                    <p className="text-white text-sm font-light leading-tight tracking-tight uppercase">{b.origin}</p>
                                </div>
                                <div className="flex items-start gap-3">
                                    <div className="w-1.5 h-1.5 rounded-full bg-brand-gold mt-1.5 shrink-0"></div>
                                    <p className="text-white text-sm font-light leading-tight tracking-tight uppercase">{b.destination}</p>
                                </div>
                            </div>

                            <div className="flex justify-between items-center pt-4 border-t border-white/5">
                                <div className="flex items-center gap-2">
                                    <span className="material-icons-round text-brand-platinum/30 text-sm">person</span>
                                    <span className="text-[10px] text-brand-platinum/50 font-bold uppercase tracking-widest">{b.passenger}</span>
                                </div>
                                {b.status === 'Completed' && (
                                    <p className="text-sm font-black text-brand-gold tracking-tighter">+{Number(b.collaborator_price || 0).toFixed(2)}€</p>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};
