import React, { useState, useMemo, useEffect } from 'react';
import { useSupabaseData } from '../hooks/useSupabaseData';
import { supabase } from '../services/supabase';

export const FichajesView: React.FC = () => {
    const { data: logs, loading } = useSupabaseData('driver_logs', { orderBy: 'clock_in', ascending: false });
    const { data: drivers } = useSupabaseData('drivers');
    const { data: requests, refresh: refreshRequests } = useSupabaseData('time_correction_requests', { orderBy: 'created_at', ascending: false });
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

            const hasLocation = firstLog.clock_in_location || (lastLog && lastLog.clock_out_location);

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
                hasLocation,
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

    const [detailsModalOpen, setDetailsModalOpen] = useState(false);
    const [selectedData, setSelectedData] = useState<any>(null);
    const [auditLogs, setAuditLogs] = useState<any[]>([]);
    const [loadingAudit, setLoadingAudit] = useState(false);

    const openDetails = async (data: any) => {
        setSelectedData(data);
        setDetailsModalOpen(true);
        setLoadingAudit(true);
        
        try {
            const logIds = data.rawLogs.map((l: any) => l.id);
            if (logIds.length > 0) {
                const { data: auditData } = await supabase
                    .from('driver_logs_audit')
                    .select('*')
                    .in('log_id', logIds)
                    .order('modified_at', { ascending: false });
                setAuditLogs(auditData || []);
            } else {
                setAuditLogs([]);
            }
        } catch (error) {
            console.error("Error loading audit logs", error);
        } finally {
            setLoadingAudit(false);
        }
    };

    // --- CORRECTION REQUESTS LOGIC ---
    const [proposeModalOpen, setProposeModalOpen] = useState(false);
    const [selectedLogToPropose, setSelectedLogToPropose] = useState<any>(null);
    const [proposeForm, setProposeForm] = useState({ inTime: '', outTime: '', reason: '' });
    const [submittingProposal, setSubmittingProposal] = useState(false);

    const openProposeModal = (log: any) => {
        setSelectedLogToPropose(log);
        setProposeForm({
            inTime: new Date(log.clock_in).toISOString().slice(0, 16),
            outTime: log.clock_out ? new Date(log.clock_out).toISOString().slice(0, 16) : '',
            reason: ''
        });
        setProposeModalOpen(true);
    };

    const submitProposal = async () => {
        if (!proposeForm.reason.trim()) return alert("Debe especificar un motivo.");
        setSubmittingProposal(true);
        try {
            await supabase.from('time_correction_requests').insert([{
                log_id: selectedLogToPropose.id,
                driver_id: selectedLogToPropose.driver_id,
                requested_by: 'ADMIN',
                proposed_clock_in: new Date(proposeForm.inTime).toISOString(),
                proposed_clock_out: proposeForm.outTime ? new Date(proposeForm.outTime).toISOString() : null,
                proposed_type: selectedLogToPropose.type,
                reason: proposeForm.reason,
                status: 'PENDING'
            }]);
            alert("Propuesta enviada al conductor para su aprobación.");
            setProposeModalOpen(false);
            refreshRequests();
        } catch (e) {
            console.error(e);
            alert("Error al enviar propuesta");
        } finally {
            setSubmittingProposal(false);
        }
    };

    const resolveRequest = async (reqId: string, resolution: 'APPROVED_BY_ADMIN' | 'REJECTED') => {
        try {
            const req = requests?.find((r: any) => r.id === reqId);
            if (!req) return;

            if (resolution === 'REJECTED') {
                await supabase.from('time_correction_requests').update({ status: 'REJECTED', resolved_at: new Date().toISOString(), resolved_by: 'ADMIN' }).eq('id', reqId);
                alert("Petición rechazada.");
            } else if (resolution === 'APPROVED_BY_ADMIN') {
                // If it was requested by driver and approved by admin, it becomes APPLIED
                await supabase.from('time_correction_requests').update({ status: 'APPLIED', resolved_at: new Date().toISOString(), resolved_by: 'ADMIN' }).eq('id', reqId);
                
                // Set the audit reason in postgres context (best effort workaround via direct rpc if we had it, but standard update will fall back to default)
                await supabase.from('driver_logs').update({
                    clock_in: req.proposed_clock_in,
                    clock_out: req.proposed_clock_out
                }).eq('id', req.log_id);
                
                alert("Corrección aplicada y guardada en el Audit Trail.");
            }
            refreshRequests();
        } catch (e) {
            console.error(e);
            alert("Error resolviendo petición");
        }
    };

    return (
        <div className="flex-1 flex flex-col h-full bg-[#101822]">
            <header className="p-4 md:p-8 border-b border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center shrink-0 gap-4 md:gap-0">
                <div>
                    <h1 className="text-2xl font-black text-white">Registro Horario de Jornada</h1>
                    <p className="text-slate-500 text-xs mt-1 uppercase tracking-widest">Resumen oficial diario de Trabajadores</p>
                </div>
                <div className="flex flex-wrap gap-4 items-center w-full md:w-auto">
                    <select
                        value={monthFilter}
                        onChange={(e) => setMonthFilter(parseInt(e.target.value))}
                        className="flex-1 md:flex-none bg-slate-800 border-none rounded-xl text-white text-xs p-3 focus:ring-2 focus:ring-blue-500 font-bold"
                    >
                        {Array.from({ length: 12 }, (_, i) => (
                            <option key={i + 1} value={i + 1}>{new Date(0, i).toLocaleString('es', { month: 'long' }).toUpperCase()}</option>
                        ))}
                    </select>
                    <select
                        value={yearFilter}
                        onChange={(e) => setYearFilter(parseInt(e.target.value))}
                        className="flex-1 md:flex-none bg-slate-800 border-none rounded-xl text-white text-xs p-3 focus:ring-2 focus:ring-blue-500 font-bold"
                    >
                        {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                    <button
                        onClick={exportToCSV}
                        className="w-full md:w-auto bg-brand-gold hover:bg-yellow-500 text-brand-black text-xs font-black uppercase tracking-widest px-6 py-3 rounded-xl flex justify-center items-center gap-2 transition-all shadow-lg shadow-brand-gold/10"
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
                    <div className="bg-[#1a2533] border border-white/5 rounded-3xl overflow-hidden shadow-2xl relative">
                        <div className="overflow-x-auto custom-scrollbar w-full">
                            <div className="min-w-[800px]">
                                <table className="w-full text-left">
                                    <thead className="bg-[#141e2b] border-b border-white/5">
                                        <tr>
                                            <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Día / Fecha</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Conductor</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Inicio y Fin Jornada</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Pausas</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-brand-gold uppercase tracking-widest">Horas Efectivas</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Acciones</th>
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
                                                <td className="px-6 py-5 text-right">
                                                    <div className="flex justify-end items-center gap-3">
                                                        {data.hasLocation && (
                                                            <div className="text-emerald-500 bg-emerald-500/10 p-1.5 rounded-lg flex items-center justify-center tooltip-trigger group/tt relative">
                                                                <span className="material-icons-round text-sm">location_on</span>
                                                                <div className="absolute bottom-full mb-2 bg-brand-charcoal text-white text-[10px] px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover/tt:opacity-100 transition-opacity pointer-events-none">
                                                                    Fichaje Geolocalizado
                                                                </div>
                                                            </div>
                                                        )}
                                                        <button 
                                                            onClick={() => openDetails(data)}
                                                            className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-brand-platinum rounded-xl text-[10px] font-bold uppercase tracking-widest transition-colors flex items-center gap-1 border border-white/10"
                                                        >
                                                            <span className="material-icons-round text-sm">manage_search</span> Detalles
                                                        </button>
                                                    </div>
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
                        </div>
                    </div>
                )}
            </div>

            {/* Modal de Detalles y Auditoría */}
            {detailsModalOpen && selectedData && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-brand-charcoal border border-white/10 rounded-3xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-6 border-b border-white/10 flex justify-between items-center bg-brand-black/50">
                            <div>
                                <h2 className="text-lg font-black text-white">Detalle de Fichajes</h2>
                                <p className="text-xs text-brand-platinum uppercase tracking-widest mt-1">
                                    {selectedData.driverName} - {selectedData.dateObj.toLocaleDateString()}
                                </p>
                            </div>
                            <button onClick={() => setDetailsModalOpen(false)} className="text-white/50 hover:text-white p-2">
                                <span className="material-icons-round">close</span>
                            </button>
                        </div>
                        
                        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-8">
                            {/* Raw Logs */}
                            <div>
                                <h3 className="text-xs font-bold text-brand-gold uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <span className="material-icons-round text-sm">list_alt</span> Registros Brutos
                                </h3>
                                <div className="space-y-2">
                                    {selectedData.rawLogs.map((log: any) => (
                                        <div key={log.id} className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${log.type === 'WORK' ? 'bg-emerald-500/20 text-emerald-500' : 'bg-amber-500/20 text-amber-500'}`}>
                                                    <span className="material-icons-round text-sm">{log.type === 'WORK' ? 'directions_car' : 'coffee'}</span>
                                                </div>
                                                <div>
                                                    <p className="text-xs font-bold text-white uppercase tracking-wider">{log.type === 'WORK' ? 'Trabajo' : 'Pausa'}</p>
                                                    <div className="text-[10px] text-brand-platinum mt-1 flex items-center gap-2">
                                                        <span>In: {new Date(log.clock_in).toLocaleTimeString()}</span>
                                                        <span>Out: {log.clock_out ? new Date(log.clock_out).toLocaleTimeString() : 'En curso'}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex flex-col gap-2 items-end">
                                                <div className="flex flex-col gap-1 text-[9px] text-slate-500 text-right">
                                                    {log.clock_in_location && <span><span className="text-brand-platinum">GPS IN:</span> {log.clock_in_location}</span>}
                                                    {log.clock_out_location && <span><span className="text-brand-platinum">GPS OUT:</span> {log.clock_out_location}</span>}
                                                </div>
                                                
                                                {/* Peticiones relacionadas a este log */}
                                                {(() => {
                                                    const pendingReqs = requests?.filter((r: any) => r.log_id === log.id && r.status === 'PENDING');
                                                    if (pendingReqs && pendingReqs.length > 0) {
                                                        const req = pendingReqs[0];
                                                        return (
                                                            <div className="bg-brand-gold/10 border border-brand-gold/30 rounded p-2 text-right">
                                                                <p className="text-[9px] text-brand-gold uppercase font-bold mb-1">
                                                                    {req.requested_by === 'DRIVER' ? 'Conductor solicita corrección' : 'Esperando aprobación del conductor'}
                                                                </p>
                                                                <p className="text-[9px] text-brand-platinum mb-2">Motivo: {req.reason}</p>
                                                                {req.requested_by === 'DRIVER' && (
                                                                    <div className="flex gap-2 justify-end">
                                                                        <button onClick={() => resolveRequest(req.id, 'APPROVED_BY_ADMIN')} className="text-[9px] bg-emerald-500 text-white px-2 py-1 rounded font-bold uppercase">Aprobar</button>
                                                                        <button onClick={() => resolveRequest(req.id, 'REJECTED')} className="text-[9px] bg-red-500 text-white px-2 py-1 rounded font-bold uppercase">Rechazar</button>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    }
                                                    return (
                                                        <button onClick={() => openProposeModal(log)} className="text-[9px] bg-white/10 hover:bg-white/20 text-white px-2 py-1 rounded flex items-center gap-1 transition-colors">
                                                            <span className="material-icons-round text-[10px]">edit</span> Proponer Cambio
                                                        </button>
                                                    );
                                                })()}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Audit Trail */}
                            <div>
                                <h3 className="text-xs font-bold text-brand-platinum uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <span className="material-icons-round text-sm">policy</span> Trazabilidad Legal (Audit Trail)
                                </h3>
                                {loadingAudit ? (
                                    <div className="text-center py-4 text-brand-platinum text-xs">Cargando auditoría...</div>
                                ) : auditLogs.length === 0 ? (
                                    <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-4 text-center">
                                        <p className="text-emerald-500 text-[10px] font-bold uppercase tracking-widest">Registros originales, sin modificaciones.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {auditLogs.map((audit: any) => (
                                            <div key={audit.id} className="bg-red-500/5 border border-red-500/20 rounded-xl p-4">
                                                <div className="flex justify-between items-center mb-2">
                                                    <span className="text-red-400 text-[9px] font-black uppercase tracking-widest px-2 py-1 bg-red-500/10 rounded">{audit.operation}</span>
                                                    <span className="text-brand-platinum text-[9px]">{new Date(audit.modified_at).toLocaleString()}</span>
                                                </div>
                                                <p className="text-white text-xs mb-1">Motivo: <span className="font-bold text-brand-gold">{audit.reason}</span></p>
                                                <p className="text-slate-400 text-[9px]">Modificado por: {audit.modified_by || 'Administrador'}</p>
                                                
                                                {audit.operation === 'UPDATE' && (
                                                    <div className="mt-3 grid grid-cols-2 gap-4 text-[9px]">
                                                        <div className="bg-white/5 p-2 rounded">
                                                            <p className="text-slate-500 uppercase tracking-widest mb-1">Valor Anterior</p>
                                                            <p className="text-white">In: {new Date(audit.old_clock_in).toLocaleTimeString()}</p>
                                                            <p className="text-white">Out: {audit.old_clock_out ? new Date(audit.old_clock_out).toLocaleTimeString() : 'N/A'}</p>
                                                        </div>
                                                        <div className="bg-emerald-500/10 p-2 rounded">
                                                            <p className="text-emerald-500 uppercase tracking-widest mb-1">Nuevo Valor</p>
                                                            <p className="text-white">In: {new Date(audit.new_clock_in).toLocaleTimeString()}</p>
                                                            <p className="text-white">Out: {audit.new_clock_out ? new Date(audit.new_clock_out).toLocaleTimeString() : 'N/A'}</p>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Proponer Corrección */}
            {proposeModalOpen && (
                <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-brand-charcoal border border-brand-gold/30 rounded-3xl w-full max-w-md p-6">
                        <h2 className="text-lg font-black text-brand-gold mb-2">Proponer Corrección</h2>
                        <p className="text-xs text-brand-platinum mb-6">
                            Según la normativa, el cambio debe ser aceptado por el conductor en su app antes de aplicarse en el registro oficial.
                        </p>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Hora Inicio Correcta</label>
                                <input type="datetime-local" value={proposeForm.inTime} onChange={e => setProposeForm({...proposeForm, inTime: e.target.value})} className="w-full bg-slate-800 text-white p-3 rounded-xl border border-white/5 focus:border-brand-gold outline-none" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Hora Fin Correcta</label>
                                <input type="datetime-local" value={proposeForm.outTime} onChange={e => setProposeForm({...proposeForm, outTime: e.target.value})} className="w-full bg-slate-800 text-white p-3 rounded-xl border border-white/5 focus:border-brand-gold outline-none" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Motivo Justificado (Obligatorio)</label>
                                <textarea 
                                    value={proposeForm.reason} 
                                    onChange={e => setProposeForm({...proposeForm, reason: e.target.value})} 
                                    placeholder="Ej: Conductor reporta olvido al finalizar el turno..."
                                    className="w-full bg-slate-800 text-white p-3 rounded-xl border border-white/5 focus:border-brand-gold outline-none min-h-[80px]" 
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 mt-8">
                            <button onClick={() => setProposeModalOpen(false)} className="flex-1 bg-white/5 text-white font-bold p-3 rounded-xl hover:bg-white/10 transition">Cancelar</button>
                            <button onClick={submitProposal} disabled={submittingProposal} className="flex-1 bg-brand-gold text-brand-black font-black uppercase tracking-widest p-3 rounded-xl hover:bg-yellow-500 transition disabled:opacity-50">
                                {submittingProposal ? 'Enviando...' : 'Enviar Propuesta'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
