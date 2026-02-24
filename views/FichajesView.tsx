import React, { useState, useMemo } from 'react';
import { useSupabaseData } from '../hooks/useSupabaseData';

export const FichajesView: React.FC = () => {
    const { data: logs, loading } = useSupabaseData('driver_logs', { orderBy: 'clock_in', ascending: false });
    const { data: drivers } = useSupabaseData('drivers');
    const [monthFilter, setMonthFilter] = useState(new Date().getMonth() + 1);
    const [yearFilter, setYearFilter] = useState(new Date().getFullYear());

    const getDriverName = (id: string) => drivers?.find((d: any) => d.id === id)?.name || 'Desconocido';

    // --- AGGREGATION LOGIC FOR TIME TRACKING ---
    const aggregatedData = useMemo(() => {
        if (!logs) return [];

        // 1. Filter logs by month and year
        const filteredLogs = logs.filter((log: any) => {
            const logDate = new Date(log.clock_in);
            return (logDate.getMonth() + 1) === monthFilter && logDate.getFullYear() === yearFilter;
        });

        // 2. Group by driver and date (YYYY-MM-DD local time)
        const groups: Record<string, any[]> = {};

        filteredLogs.forEach((log: any) => {
            const d = new Date(log.clock_in);
            // Local parsing ensures a shift crossing midnight UTC is handled correctly for Spain
            const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            const key = `${log.driver_id}_${dateStr}`;
            if (!groups[key]) groups[key] = [];
            groups[key].push(log);
        });

        // 3. Calculate daily stats per driver
        const result = Object.entries(groups).map(([key, dayLogs]) => {
            const [driverId, dateStr] = key.split('_');

            // Sort chronologically by clock_in
            dayLogs.sort((a, b) => new Date(a.clock_in).getTime() - new Date(b.clock_in).getTime());

            const firstLog = dayLogs[0];
            const lastLog = dayLogs[dayLogs.length - 1];

            const firstIn = new Date(firstLog.clock_in);
            const lastOut = lastLog.clock_out ? new Date(lastLog.clock_out) : null;
            const isCurrentlyActive = !lastOut;

            let totalWorkMs = 0;
            let totalPauseMs = 0;

            dayLogs.forEach(log => {
                const cin = new Date(log.clock_in).getTime();
                const cout = log.clock_out ? new Date(log.clock_out).getTime() : new Date().getTime(); // Use current time if active

                const durationMs = cout - cin;

                if (log.type === 'WORK') {
                    totalWorkMs += durationMs;
                } else if (log.type === 'PAUSE') {
                    totalPauseMs += durationMs;
                }
            });

            // Convert Ms to Hours
            const workHours = (totalWorkMs / (1000 * 60 * 60)).toFixed(2);
            const pauseHours = (totalPauseMs / (1000 * 60 * 60)).toFixed(2);

            return {
                id: key,
                driverId,
                driverName: getDriverName(driverId),
                dateStr,
                dateObj: new Date(dateStr),
                firstIn,
                lastOut,
                isCurrentlyActive,
                workHours,
                pauseHours,
                rawLogs: dayLogs
            };
        });

        // Sort descending by date, then by driver name
        return result.sort((a, b) => {
            if (b.dateObj.getTime() !== a.dateObj.getTime()) {
                return b.dateObj.getTime() - a.dateObj.getTime();
            }
            return a.driverName.localeCompare(b.driverName);
        });

    }, [logs, monthFilter, yearFilter, drivers]);


    const exportToCSV = () => {
        const headers = ["Conductor", "Fecha", "Primera Entrada", "Última Salida", "Pausas (h)", "Horas Efectivas (h)"];
        const rows = aggregatedData.map((data: any) => {
            return [
                data.driverName,
                data.dateObj.toLocaleDateString(),
                data.firstIn.toLocaleTimeString(),
                data.lastOut ? data.lastOut.toLocaleTimeString() : 'En servicio',
                data.pauseHours,
                data.workHours
            ];
        });

        const csvContent = "data:text/csv;charset=utf-8,\uFEFF"
            + headers.join(",") + "\n"
            + rows.map(e => e.join(",")).join("\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `Registro_Horario_${monthFilter}_${yearFilter}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="flex-1 flex flex-col h-full bg-[#101822]">
            <header className="p-8 border-b border-slate-800 flex justify-between items-center shrink-0">
                <div>
                    <h1 className="text-2xl font-black text-white">Registro Horario de Jornada</h1>
                    <p className="text-slate-500 text-xs mt-1 uppercase tracking-widest">Resumen oficial diario de Trabajadores</p>
                </div>
                <div className="flex gap-4 items-center">
                    <select
                        value={monthFilter}
                        onChange={(e) => setMonthFilter(parseInt(e.target.value))}
                        className="bg-slate-800 border-none rounded-xl text-white text-xs p-3 focus:ring-2 focus:ring-blue-500 font-bold"
                    >
                        {Array.from({ length: 12 }, (_, i) => (
                            <option key={i + 1} value={i + 1}>{new Date(0, i).toLocaleString('es', { month: 'long' }).toUpperCase()}</option>
                        ))}
                    </select>
                    <select
                        value={yearFilter}
                        onChange={(e) => setYearFilter(parseInt(e.target.value))}
                        className="bg-slate-800 border-none rounded-xl text-white text-xs p-3 focus:ring-2 focus:ring-blue-500 font-bold"
                    >
                        {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                    <button
                        onClick={exportToCSV}
                        className="bg-brand-gold hover:bg-yellow-500 text-brand-black text-xs font-black uppercase tracking-widest px-6 py-3 rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-brand-gold/10 ml-2"
                    >
                        <span className="material-icons-round text-sm">download</span> Exportar a Excel (CSV)
                    </button>
                </div>
            </header>

            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-gold"></div>
                    </div>
                ) : (
                    <div className="bg-[#1a2533] border border-white/5 rounded-3xl overflow-hidden shadow-2xl">
                        <table className="w-full text-left">
                            <thead className="bg-[#141e2b] border-b border-white/5">
                                <tr>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Día / Fecha</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Conductor</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Inicio y Fin Jornada</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Pausas</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-brand-gold uppercase tracking-widest">Horas Efectivas</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {aggregatedData.length > 0 ? aggregatedData.map((data: any) => (
                                    <tr key={data.id} className="hover:bg-white/5 transition-colors group">
                                        <td className="px-6 py-5">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex flex-col items-center justify-center shrink-0">
                                                    <span className="text-xs font-black text-white leading-none">{data.dateObj.getDate()}</span>
                                                    <span className="text-[8px] font-bold text-slate-400 uppercase leading-none mt-1">{data.dateObj.toLocaleString('es-ES', { weekday: 'short' })}</span>
                                                </div>
                                                <span className="text-sm font-bold text-slate-300">{data.dateObj.toLocaleDateString()}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-[10px] text-slate-300 font-bold">
                                                    {data.driverName[0]}
                                                </div>
                                                <span className="text-sm font-bold text-white tracking-tight">{data.driverName}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex items-center gap-4">
                                                <div className="flex items-center gap-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded">
                                                    <span className="material-icons-round text-xs">login</span>
                                                    <span className="text-xs font-bold font-mono">{data.firstIn.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                </div>
                                                <span className="text-slate-600">→</span>
                                                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded border ${!data.isCurrentlyActive ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-transparent text-emerald-500 border-transparent animate-pulse'}`}>
                                                    <span className="material-icons-round text-xs">{!data.isCurrentlyActive ? 'logout' : 'sync'}</span>
                                                    <span className="text-xs font-bold font-mono">
                                                        {!data.isCurrentlyActive ? data.lastOut.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Activo'}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 text-sm font-bold text-amber-500/70">
                                            {data.pauseHours > 0 ? `${data.pauseHours} h` : '-'}
                                        </td>
                                        <td className="px-6 py-5 text-lg font-black text-white">
                                            {data.workHours} <span className="text-brand-gold text-xs font-bold">h</span>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-32 text-center">
                                            <span className="material-icons-round text-6xl text-slate-800 mb-4 block">fact_check</span>
                                            <p className="text-slate-500 text-sm font-bold tracking-tight">No hay registros de jornada en este periodo.</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};
