import React, { useEffect, useRef, useState } from 'react';
import { useEfectivo } from '../hooks/useEfectivo';
import { DataEntryModal } from '../components/DataEntryModal';
import { DriverReportModal } from '../components/DriverReportModal';

export const CashReconciliationView: React.FC = () => {
    const {
        cycle,
        loading,
        reconciliations,
        fetchActiveCycle,
        processUberFile,
        processEntregasFile,
        processVGDFile,
        closeCycle,
        addExpense,
        addEntregaManual,
        uploadHistory,
        allCycles,
        loadSpecificCycle,
        renameCycle,
        clearCurrentCycleData,
        aliases,
        getDriverReport
    } = useEfectivo();

    const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);
    const [selectedReport, setSelectedReport] = useState<any>(null);

    const totalRecaudado = reconciliations.reduce((acc, curr) => acc + (curr.total_cash_collected || 0), 0);
    const totalEntregado = reconciliations.reduce((acc, curr) => acc + (curr.cash_delivered || 0), 0);
    const totalGastos = reconciliations.reduce((acc, curr) => acc + (curr.gastos || 0), 0);
    const totalDiferencia = reconciliations.reduce((acc, curr) => acc + (curr.difference || 0), 0);

    const handleRenameCycle = () => {
        if (!cycle) return;
        const newName = prompt('Ingrese el nuevo nombre para este ciclo:', cycle.name);
        if (newName && newName.trim() !== '') {
            renameCycle(cycle.id, newName.trim());
        }
    };

    const handleClearDatabase = async () => {
        if (confirm('¡CUIDADO! Estás a punto de borrar todos los registros de los archivos del ciclo actual. Esta acción NO se puede deshacer. ¿Estás seguro?')) {
            await clearCurrentCycleData();
        }
    };
    const [isEntregaModalOpen, setIsEntregaModalOpen] = useState(false);

    const driverNames = Array.from(new Set([
        ...reconciliations.map(r => r.driver_name),
        ...aliases.map(a => a.good_name)
    ])).filter(Boolean).sort();

    useEffect(() => {
        fetchActiveCycle();
    }, []);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'uber' | 'entregas' | 'vgd') => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            if (type === 'uber') await processUberFile(file);
            else if (type === 'entregas') await processEntregasFile(file);
            else if (type === 'vgd') await processVGDFile(file);
            alert(`Archivo ${type} procesado correctamente.`);
        } catch (error: any) {
            alert('Error al procesar archivo: ' + error.message);
        }
        e.target.value = ''; // Reset input
    };

    const handleAddExpense = async (data: any) => {
        await addExpense(data.driver_name, data.description, parseFloat(data.amount));
        setIsExpenseModalOpen(false);
    };

    const handleAddEntrega = async (data: any) => {
        await addEntregaManual(data.driver_name, parseFloat(data.amount));
        setIsEntregaModalOpen(false);
    };

    const handleCloseCycle = async () => {
        if (window.confirm("¿Estás seguro de que quieres cerrar el ciclo actual? Los saldos se arrastrarán al siguiente.")) {
            await closeCycle();
            alert("Ciclo cerrado exitosamente.");
        }
    };

    return (
        <div className="p-8 h-full flex flex-col pt-24 md:pt-8 bg-[#0a0a0a] overflow-y-auto custom-scrollbar">
            <div className="print:hidden flex flex-col min-h-0">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-8 shrink-0">
                    <div>
                        <h1 className="text-4xl font-light tracking-[0.2em] text-white flex items-center gap-4">
                            <span className="material-icons-round text-brand-gold text-4xl">account_balance_wallet</span>
                            EFECTIVO
                            {cycle && <span className="text-sm border border-brand-gold/30 text-brand-gold px-3 py-1 rounded-full uppercase ml-4">{cycle.name} {cycle.is_active ? '(ACTIVO)' : ''}</span>}
                        </h1>
                        <p className="text-brand-platinum/50 uppercase tracking-[0.3em] text-xs font-bold mt-2">
                            Cuadre de Efectivo de Conductores
                        </p>
                    </div>

                    <div className="flex gap-2">
                        <button
                            onClick={() => setIsExpenseModalOpen(true)}
                            className="bg-brand-charcoal text-white px-6 py-3 rounded-lg flex items-center gap-2 hover:bg-brand-charcoal/80 transition-all font-bold uppercase tracking-widest text-[10px] border border-white/5"
                        >
                            <span className="material-icons-round text-lg text-brand-platinum">request_quote</span>
                            + Gasto
                        </button>
                        <button
                            onClick={() => setIsEntregaModalOpen(true)}
                            className="bg-brand-charcoal text-white px-6 py-3 rounded-lg flex items-center gap-2 hover:bg-brand-charcoal/80 transition-all font-bold uppercase tracking-widest text-[10px] border border-white/5"
                        >
                            <span className="material-icons-round text-lg text-brand-platinum">payments</span>
                            + Entrega
                        </button>
                    </div>
                </div>

                {/* Upload Area */}
                <div className="bg-brand-charcoal rounded-xl p-6 shadow-xl border border-white/5 w-full mb-8 shrink-0">
                    <h2 className="text-xl font-semibold border-b border-white/10 pb-4 mb-6 text-white tracking-widest uppercase text-sm">Subir Datos Nuevos</h2>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Uber CSV */}
                        <div className="col-span-1">
                            <label className="block text-sm font-bold text-white uppercase tracking-widest mb-1">Uber</label>
                            <p className="text-[10px] text-brand-platinum/50 uppercase tracking-wider mb-2 h-8">Descargar el CSV desde apartado Rendimiento seleccionando el rango de fechas.</p>
                            <label htmlFor="uber_file" className="flex flex-col items-center justify-center w-full h-32 border border-white/10 border-dashed rounded-xl cursor-pointer bg-white/[0.02] hover:bg-white/5 transition duration-300 hover:border-blue-500 group overflow-hidden relative">
                                <div className="flex flex-col items-center justify-center p-4 text-center w-full">
                                    <span className="material-icons-round w-8 h-8 mb-3 text-slate-400 group-hover:text-blue-500 transition-colors text-3xl">cloud_upload</span>
                                    <p className="mb-2 text-sm text-brand-platinum/80 truncate w-full"><span className="font-bold text-white">Haz clic para subir</span> o arrastra</p>
                                    <p className="text-xs text-brand-gold truncate w-full px-2" title={uploadHistory?.uber}>{uploadHistory?.uber !== 'Ninguno' ? uploadHistory.uber : 'Ningún archivo seleccionado'}</p>
                                </div>
                                <input id="uber_file" type="file" className="hidden" accept=".csv" onChange={(e) => handleFileUpload(e, 'uber')} />
                            </label>
                        </div>

                        {/* VGD Excel */}
                        <div className="col-span-1">
                            <label className="block text-sm font-bold text-white uppercase tracking-widest mb-1">V-GD</label>
                            <p className="text-[10px] text-brand-platinum/50 uppercase tracking-wider mb-2 h-8">Exportar el excel de servicios seleccionando el rango de fechas.</p>
                            <label htmlFor="vgd_file" className="flex flex-col items-center justify-center w-full h-32 border border-white/10 border-dashed rounded-xl cursor-pointer bg-white/[0.02] hover:bg-white/5 transition duration-300 hover:border-green-500 group overflow-hidden relative">
                                <div className="flex flex-col items-center justify-center p-4 text-center w-full">
                                    <span className="material-icons-round w-8 h-8 mb-3 text-slate-400 group-hover:text-green-500 transition-colors text-3xl">description</span>
                                    <p className="mb-2 text-sm text-brand-platinum/80 truncate w-full"><span className="font-bold text-white">Haz clic para subir</span> o arrastra</p>
                                    <p className="text-xs text-brand-gold truncate w-full px-2" title={uploadHistory?.vgd}>{uploadHistory?.vgd !== 'Ninguno' ? uploadHistory.vgd : 'Ningún archivo seleccionado'}</p>
                                </div>
                                <input id="vgd_file" type="file" className="hidden" accept=".xlsx, .xls" onChange={(e) => handleFileUpload(e, 'vgd')} />
                            </label>
                        </div>

                        {/* Entregas CSV */}
                        <div className="col-span-1">
                            <label className="block text-sm font-bold text-white uppercase tracking-widest mb-1">Entregas</label>
                            <p className="text-[10px] text-brand-platinum/50 uppercase tracking-wider mb-2 h-8">Subir archivo CSV de entregas de base.</p>
                            <label htmlFor="entregas_file" className="flex flex-col items-center justify-center w-full h-32 border border-white/10 border-dashed rounded-xl cursor-pointer bg-white/[0.02] hover:bg-white/5 transition duration-300 hover:border-emerald-500 group overflow-hidden relative">
                                <div className="flex flex-col items-center justify-center p-4 text-center w-full">
                                    <span className="material-icons-round w-8 h-8 mb-3 text-slate-400 group-hover:text-emerald-500 transition-colors text-3xl">view_list</span>
                                    <p className="mb-2 text-sm text-brand-platinum/80 truncate w-full"><span className="font-bold text-white">Haz clic para subir</span> o arrastra</p>
                                    <p className="text-xs text-brand-gold truncate w-full px-2" title={uploadHistory?.entregas}>{uploadHistory?.entregas !== 'Ninguno' ? uploadHistory.entregas : 'Ningún archivo seleccionado'}</p>
                                </div>
                                <input id="entregas_file" type="file" className="hidden" accept=".csv" onChange={(e) => handleFileUpload(e, 'entregas')} />
                            </label>
                        </div>
                    </div>

                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mt-6 gap-4 border-t border-white/5 pt-4">
                        <div className="text-[10px] uppercase font-bold tracking-widest text-brand-platinum/50 space-y-2 w-full md:w-auto">
                            <p>Último de Uber: &nbsp;<span className={uploadHistory?.uber === 'Ninguno' ? 'text-red-400' : 'text-emerald-400 font-mono tracking-normal'}>{uploadHistory?.uber || 'Ninguno'}</span></p>
                            <p>Última de Entregas: &nbsp;<span className={uploadHistory?.entregas === 'Ninguno' ? 'text-red-400' : 'text-emerald-400 font-mono tracking-normal'}>{uploadHistory?.entregas || 'Ninguno'}</span></p>
                            <p>Último de V-GD: &nbsp;<span className={uploadHistory?.vgd === 'Ninguno' ? 'text-red-400' : 'text-emerald-400 font-mono tracking-normal'}>{uploadHistory?.vgd || 'Ninguno'}</span></p>
                        </div>
                    </div>
                </div>

                {/* Resultados Almacenados */}
                <div className="bg-brand-charcoal rounded-xl p-6 shadow-xl border border-white/5 w-full mb-8 shrink-0">
                    <div className="flex flex-col sm:flex-row justify-between items-center border-b border-white/10 pb-4 gap-4 mb-6">
                        <h2 className="text-xl font-semibold text-white tracking-widest uppercase text-sm">Resultados Almacenados</h2>
                        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 w-full sm:w-auto">
                            <select 
                                value={cycle?.id || ''} 
                                onChange={(e) => loadSpecificCycle(Number(e.target.value))}
                                className="bg-white/5 border border-white/10 text-[10px] uppercase font-bold tracking-widest rounded-md px-3 py-2 w-full sm:w-auto focus:outline-none focus:border-brand-gold text-brand-platinum"
                            >
                                {!allCycles.length && <option value="">Cargando ciclos...</option>}
                                {allCycles.map(c => (
                                    <option key={c.id} value={c.id}>{c.name} {c.is_active ? '(ACTIVO)' : ''}</option>
                                ))}
                            </select>
                            <button onClick={handleRenameCycle} className="flex items-center justify-center text-sm px-3 py-2 bg-white/5 hover:bg-white/10 rounded-md transition duration-200 shrink-0 border border-white/10 text-brand-platinum" title="Renombrar Ciclo">
                                <span className="material-icons-round text-sm">edit</span>
                            </button>
                            <button onClick={handleCloseCycle} disabled={loading || !cycle} className="flex items-center justify-center text-[10px] font-bold tracking-widest uppercase px-4 py-2 bg-purple-900/50 hover:bg-purple-800 text-purple-200 rounded-md transition duration-200 shrink-0 border border-purple-800/50">
                                <span className="material-icons-round text-sm mr-2">check_circle</span> Cerrar Ciclo
                            </button>
                            <button onClick={handleClearDatabase} disabled={loading || !cycle} className="flex items-center justify-center text-[10px] font-bold tracking-widest uppercase px-4 py-2 bg-red-900/50 hover:bg-red-800 text-red-200 rounded-md transition duration-200 shrink-0 border border-red-800/50">
                                <span className="material-icons-round text-sm mr-2">delete</span> Borrar Todo
                            </button>
                            <button onClick={() => { if(cycle) loadSpecificCycle(cycle.id); else fetchActiveCycle(); }} disabled={loading} className="flex items-center justify-center text-[10px] font-bold tracking-widest uppercase px-4 py-2 bg-white/5 hover:bg-white/10 rounded-md transition duration-200 shrink-0 border border-white/10 text-brand-platinum">
                                <span className="material-icons-round text-sm mr-2">refresh</span> Actualizar
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                            <p className="text-[10px] text-brand-platinum/50 uppercase font-bold tracking-[0.2em]">Recaudación Flota <span className="text-[8px] opacity-70">(Uber + VGD)</span></p>
                            <p className="text-2xl font-mono font-bold text-white mt-1">€{totalRecaudado.toFixed(2)}</p>
                        </div>
                        <div className="bg-white/5 p-4 rounded-xl border border-emerald-900/50">
                            <p className="text-[10px] text-brand-platinum/50 uppercase font-bold tracking-[0.2em]">Total Entregado</p>
                            <p className="text-2xl font-mono font-bold text-emerald-400 mt-1">€{totalEntregado.toFixed(2)}</p>
                        </div>
                        <div className="bg-white/5 p-4 rounded-xl border border-amber-900/50">
                            <p className="text-[10px] text-brand-platinum/50 uppercase font-bold tracking-[0.2em]">Gastos Reg.</p>
                            <p className="text-2xl font-mono font-bold text-brand-gold mt-1">€{totalGastos.toFixed(2)}</p>
                        </div>
                        <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                            <p className="text-[10px] text-brand-platinum/50 uppercase font-bold tracking-[0.2em]">Diferencia Flota</p>
                            <p className={`text-2xl font-mono font-bold mt-1 ${totalDiferencia >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>€{totalDiferencia.toFixed(2)}</p>
                        </div>
                    </div>
                </div>

                {/* Data Table */}
                <div className="bg-brand-charcoal rounded-xl border border-white/5 flex flex-col min-h-[400px] mb-12 shrink-0">
                    <div className="overflow-x-auto w-full custom-scrollbar rounded-xl">
                        <table className="w-full text-left border-collapse">
                            <thead className="sticky top-0 bg-brand-charcoal z-10 before:content-[''] before:absolute before:inset-0 before:border-b before:border-white/5">
                                <tr>
                                    {['CONDUCTOR', 'INICIAL', 'UBER', 'VGD', 'TOTAL', 'ENTREGADO', 'GASTOS', 'RESUMEN', 'ACCIONES'].map((header) => (
                                        <th key={header} className="p-4 text-[10px] font-black tracking-[0.2em] text-brand-platinum/50 uppercase border-b border-white/5 whitespace-nowrap">
                                            {header}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {reconciliations.length === 0 ? (
                                    <tr>
                                        <td colSpan={9} className="p-8 text-center text-brand-platinum/50 text-xs tracking-widest font-bold uppercase">
                                            No hay datos en este ciclo
                                        </td>
                                    </tr>
                                ) : (
                                    reconciliations.map((r, i) => (
                                        <tr key={i} className="hover:bg-white/[0.02] transition-colors group h-16 border-b border-white/5 last:border-0">
                                            <td className="p-4 text-sm font-bold text-white whitespace-nowrap">{r.driver_name || 'Desconocido'}</td>
                                            <td className="p-4 text-sm font-mono text-slate-300">€{(r.saldo_inicial || 0).toFixed(2)}</td>
                                            <td className="p-4 text-sm font-mono text-brand-platinum/80">€{(r.uber_cash_collected || 0).toFixed(2)}</td>
                                            <td className="p-4 text-sm font-mono text-brand-platinum/80">€{(r.vgd_cash_collected || 0).toFixed(2)}</td>
                                            <td className="p-4 text-sm font-mono text-brand-gold font-bold">€{(r.total_cash_collected || 0).toFixed(2)}</td>
                                            <td className="p-4 text-sm font-mono text-red-400">€{(r.cash_delivered || 0).toFixed(2)}</td>
                                            <td className="p-4 text-sm font-mono text-red-400">€{(r.gastos || 0).toFixed(2)}</td>
                                            <td className="p-4 text-sm font-mono font-bold">
                                                <span className={`px-3 py-1.5 rounded-lg bg-opacity-20 ${(r.difference || 0) > 0 ? 'text-green-400 bg-green-500' : (r.difference || 0) < 0 ? 'text-red-400 bg-red-500' : 'text-slate-400 bg-slate-500'}`}>
                                                    €{(r.difference || 0).toFixed(2)}
                                                </span>
                                            </td>
                                            <td className="p-4">
                                                <button 
                                                    onClick={async () => {
                                                        const detailObj = await getDriverReport(r.driver_name, cycle.id);
                                                        setSelectedReport(detailObj);
                                                        setIsReportModalOpen(true);
                                                    }}
                                                    className="text-brand-gold hover:text-white transition-colors flex items-center gap-1 uppercase font-bold text-[10px] tracking-widest"
                                                >
                                                    <span className="material-icons-round text-sm">analytics</span>
                                                    Detalle
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Modals */}
             <DriverReportModal 
                 isOpen={isReportModalOpen} 
                 onClose={() => setIsReportModalOpen(false)} 
                 report={selectedReport} 
             />
             <DataEntryModal 
                 isOpen={isExpenseModalOpen}
                 onClose={() => setIsExpenseModalOpen(false)}
                 onSubmit={handleAddExpense}
                 title="Añadir Gasto"
                 fields={[
                     { name: 'driver_name', label: 'Conductor', type: 'searchable-select', options: driverNames, required: true },
                     { name: 'description', label: 'Descripción', type: 'text', required: true },
                     { name: 'amount', label: 'Monto (€)', type: 'number', required: true }
                 ]}
             />
             <DataEntryModal 
                 isOpen={isEntregaModalOpen}
                 onClose={() => setIsEntregaModalOpen(false)}
                 onSubmit={handleAddEntrega}
                 title="Añadir Entrega"
                 fields={[
                     { name: 'driver_name', label: 'Conductor', type: 'searchable-select', options: driverNames, required: true },
                     { name: 'amount', label: 'Monto (€)', type: 'number', required: true }
                 ]}
             />
        </div>
    );
};
