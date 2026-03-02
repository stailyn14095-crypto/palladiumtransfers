import React, { useState, useMemo } from 'react';
import { useSupabaseData } from '../hooks/useSupabaseData';

interface GananciasDriverViewProps {
    driverId: string;
}

export const GananciasDriverView: React.FC<GananciasDriverViewProps> = ({ driverId }) => {
    const { data: allBookings, loading } = useSupabaseData('bookings');

    // Date range filters
    const [startDate, setStartDate] = useState(() => {
        const d = new Date();
        d.setDate(d.getDate() - 7); // Last 7 days by default
        return d.toISOString().split('T')[0];
    });
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

    const filteredEarnings = useMemo(() => {
        if (!allBookings) return [];
        return allBookings.filter((b: any) => {
            if (b.driver_id !== driverId || b.status !== 'Completed') return false;
            // Normalize pickup_date to comparison date (handle timestamps)
            const bDate = b.pickup_date ? b.pickup_date.split('T')[0] : '';
            return bDate >= startDate && bDate <= endDate;
        }).sort((a: any, b: any) => b.pickup_date.localeCompare(a.pickup_date));
    }, [allBookings, driverId, startDate, endDate]);

    const totalAmount = useMemo(() => {
        return filteredEarnings.reduce((acc: number, b: any) => acc + (Number(b.collaborator_price || 0)), 0);
    }, [filteredEarnings]);

    if (loading) return <div className="p-8 text-center text-brand-platinum/50 uppercase tracking-widest text-xs">Cargando ganancias...</div>;

    return (
        <div className="flex-1 bg-brand-black p-4 sm:p-8 animate-fadeIn">
            {/* Header */}
            <div className="mb-8">
                <h2 className="text-2xl font-light text-white tracking-tight mb-2">Mis <span className="font-black text-brand-gold">Ganancias</span></h2>
                <p className="text-[10px] text-brand-platinum/50 uppercase tracking-[0.2em] font-bold">Consulta el histórico de tus servicios completados</p>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-2 gap-4 mb-8">
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

            {/* Summary Card */}
            <div className="bg-gradient-to-br from-brand-gold/20 to-brand-gold/5 border border-brand-gold/20 rounded-[2.5rem] p-8 mb-8 text-center relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                    <span className="material-icons-round text-6xl">payments</span>
                </div>
                <p className="text-[10px] font-bold text-brand-gold uppercase tracking-[0.4em] mb-3">Total Acumulado</p>
                <p className="text-5xl font-black text-white tracking-tighter">{totalAmount.toFixed(2)}€</p>
                <p className="text-[10px] text-brand-gold/50 mt-4 uppercase font-bold tracking-widest">{filteredEarnings.length} servicios completados</p>
            </div>

            {/* List of services */}
            <div className="space-y-4">
                <h3 className="text-[10px] font-black text-brand-platinum/30 uppercase tracking-[0.4em] px-4">Desglose de Servicios</h3>
                {filteredEarnings.length === 0 ? (
                    <div className="p-12 text-center bg-brand-charcoal/20 border border-dashed border-white/5 rounded-3xl text-brand-platinum/30 italic text-sm">
                        No hay servicios registrados en este rango de fechas
                    </div>
                ) : (
                    filteredEarnings.map((b: any) => (
                        <div key={b.id} className="bg-brand-charcoal/30 border border-white/5 rounded-3xl p-6 flex justify-between items-center group hover:bg-brand-charcoal/50 transition-all">
                            <div className="space-y-1">
                                <p className="text-[10px] font-bold text-brand-platinum/50 uppercase tracking-widest">
                                    {new Date(b.pickup_date).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })} - {b.pickup_time}h
                                </p>
                                <p className="text-white font-medium tracking-tight uppercase">{b.origin} → {b.destination}</p>
                                <p className="text-[10px] text-brand-platinum/30 font-bold uppercase tracking-widest">Pasajero: {b.passenger}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-xl font-black text-brand-gold group-hover:scale-110 transition-transform">+{Number(b.collaborator_price || 0).toFixed(2)}€</p>
                                <span className="text-[8px] bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded border border-emerald-500/20 uppercase font-black">Pagado</span>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};
