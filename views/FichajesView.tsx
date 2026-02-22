import React, { useState } from 'react';
import { useSupabaseData } from '../hooks/useSupabaseData';

export const FichajesView: React.FC = () => {
    const { data: logs, loading } = useSupabaseData('driver_logs');
    const { data: drivers } = useSupabaseData('drivers');
    const [monthFilter, setMonthFilter] = useState(new Date().getMonth() + 1);
    const [yearFilter, setYearFilter] = useState(new Date().getFullYear());

    const filteredLogs = logs?.filter((log: any) => {
        const logDate = new Date(log.clock_in);
        return (logDate.getMonth() + 1) === monthFilter && logDate.getFullYear() === yearFilter;
    }) || [];

    const getDriverName = (id: string) => drivers?.find((d: any) => d.id === id)?.name || 'Unknown';

    const exportToCSV = () => {
        const headers = ["Conductor", "Fecha", "Entrada", "Salida", "Tipo", "Duración (h)"];
        const rows = filteredLogs.map((log: any) => {
            const cin = new Date(log.clock_in);
            const cout = log.clock_out ? new Date(log.clock_out) : null;
            const duration = cout ? ((cout.getTime() - cin.getTime()) / (1000 * 60 * 60)).toFixed(2) : '-';
            return [
                getDriverName(log.driver_id),
                cin.toLocaleDateString(),
                cin.toLocaleTimeString(),
                cout ? cout.toLocaleTimeString() : 'En servicio',
                log.type || 'WORK',
                duration
            ];
        });

        const csvContent = "data:text/csv;charset=utf-8,"
            + headers.join(",") + "\n"
            + rows.map(e => e.join(",")).join("\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `Registro_Fichajes_${monthFilter}_${yearFilter}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="flex-1 flex flex-col h-full bg-[#101822]">
            <header className="p-8 border-b border-slate-800 flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-black text-white">Registro Diario</h1>
                    <p className="text-slate-500 text-xs mt-1 uppercase tracking-widest">Control de jornada y fichajes</p>
                </div>
                <div className="flex gap-4 items-center">
                    <select
                        value={monthFilter}
                        onChange={(e) => setMonthFilter(parseInt(e.target.value))}
                        className="bg-slate-800 border-none rounded-xl text-white text-xs p-3 focus:ring-2 focus:ring-blue-500"
                    >
                        {Array.from({ length: 12 }, (_, i) => (
                            <option key={i + 1} value={i + 1}>{new Date(0, i).toLocaleString('es', { month: 'long' }).toUpperCase()}</option>
                        ))}
                    </select>
                    <select
                        value={yearFilter}
                        onChange={(e) => setYearFilter(parseInt(e.target.value))}
                        className="bg-slate-800 border-none rounded-xl text-white text-xs p-3 focus:ring-2 focus:ring-blue-500"
                    >
                        {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                    <button
                        onClick={exportToCSV}
                        className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-black uppercase tracking-widest px-6 py-3 rounded-xl flex items-center gap-2 transition-all shadow-lg"
                    >
                        <span className="material-icons-round text-sm">download</span> Descargar CSV
                    </button>
                </div>
            </header>

            <div className="flex-1 overflow-y-auto p-8">
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                    </div>
                ) : (
                    <div className="bg-[#1a2533] border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
                        <table className="w-full text-left">
                            <thead className="bg-[#141e2b] border-b border-slate-800">
                                <tr>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase">Conductor</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase">Fecha</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase">Entrada</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase">Salida</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase">Tipo</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase">Duración</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800">
                                {filteredLogs.length > 0 ? filteredLogs.map((log: any) => {
                                    const cin = new Date(log.clock_in);
                                    const cout = log.clock_out ? new Date(log.clock_out) : null;
                                    const duration = cout ? ((cout.getTime() - cin.getTime()) / (1000 * 60 * 60)).toFixed(2) : null;
                                    return (
                                        <tr key={log.id} className="hover:bg-white/5 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3 text-sm font-bold text-white">
                                                    <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-[10px]">
                                                        {getDriverName(log.driver_id)[0]}
                                                    </div>
                                                    {getDriverName(log.driver_id)}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-xs text-slate-400 font-mono">
                                                {cin.toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-4 text-xs text-emerald-400 font-mono font-bold">
                                                {cin.toLocaleTimeString()}
                                            </td>
                                            <td className="px-6 py-4 text-xs font-mono font-bold">
                                                {cout ? (
                                                    <span className="text-slate-400">{cout.toLocaleTimeString()}</span>
                                                ) : (
                                                    <span className="text-emerald-500 flex items-center gap-1">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Activo
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter border ${log.type === 'PAUSE' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                                    }`}>
                                                    {log.type || 'WORK'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-xs font-bold text-white">
                                                {duration ? `${duration}h` : '-'}
                                            </td>
                                        </tr>
                                    );
                                }) : (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-20 text-center text-slate-600 text-sm">
                                            No se han encontrado registros para este periodo
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
