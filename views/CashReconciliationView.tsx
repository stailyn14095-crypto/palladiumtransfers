import React, { useEffect, useRef, useState } from 'react';
import { useEfectivo } from '../hooks/useEfectivo';
import { DataEntryModal } from '../components/DataEntryModal';

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
        addEntregaManual
    } = useEfectivo();

    const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
    const [isEntregaModalOpen, setIsEntregaModalOpen] = useState(false);

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
        <div className="p-8 h-full flex flex-col pt-24 md:pt-8 bg-[#0a0a0a]">
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
                    <button
                        onClick={handleCloseCycle}
                        disabled={loading || !cycle}
                        className="bg-brand-gold text-black px-6 py-3 rounded-lg flex items-center gap-2 hover:bg-white transition-all font-bold uppercase tracking-widest text-[10px]"
                    >
                        <span className="material-icons-round text-lg">check_circle</span>
                        {loading ? 'Cerrando...' : 'Cerrar Ciclo'}
                    </button>
                </div>
            </div>

            {/* Upload Area */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 shrink-0">
                {['uber', 'entregas', 'vgd'].map((type) => (
                    <div key={type} className="bg-brand-charcoal p-4 rounded-xl border border-white/5 flex flex-col gap-2">
                        <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-platinum/50 flex justify-between items-center">
                            Subir {type.toUpperCase()}
                            {type === 'uber' || type === 'entregas' ? <span className="bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded text-[8px]">.CSV</span> : <span className="bg-green-500/20 text-green-400 px-2 py-0.5 rounded text-[8px]">.XLSX</span>}
                        </label>
                        <label className="bg-white/5 hover:bg-white/10 p-4 rounded-lg cursor-pointer transition-colors border border-white/10 border-dashed text-center flex-1 flex items-center justify-center">
                            <input type="file" className="hidden" accept={type === 'vgd' ? '.xlsx, .xls' : '.csv'} onChange={(e) => handleFileUpload(e, type as any)} />
                            <span className="text-white text-xs font-bold uppercase tracking-widest opacity-80 flex items-center gap-2">
                                <span className="material-icons-round text-sm">upload_file</span>
                                Seleccionar Archivo
                            </span>
                        </label>
                    </div>
                ))}
            </div>

            {/* Data Table */}
            <div className="bg-brand-charcoal rounded-xl border border-white/5 flex-1 flex flex-col min-h-0 overflow-hidden">
                <div className="overflow-x-auto flex-1 custom-scrollbar">
                    <table className="w-full text-left border-collapse">
                        <thead className="sticky top-0 bg-brand-charcoal z-10 before:content-[''] before:absolute before:inset-0 before:border-b before:border-white/5">
                            <tr>
                                {['CONDUCTOR', 'INICIAL', 'UBER', 'VGD', 'TOTAL', 'ENTREGADO', 'GASTOS', 'RESUMEN'].map((header) => (
                                    <th key={header} className="p-4 text-[10px] font-black tracking-[0.2em] text-brand-platinum/50 uppercase border-b border-white/5 whitespace-nowrap">
                                        {header}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {reconciliations.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="p-8 text-center text-brand-platinum/50 text-xs tracking-widest font-bold uppercase">
                                        No hay datos en este ciclo
                                    </td>
                                </tr>
                            ) : (
                                reconciliations.map((r, i) => (
                                    <tr key={i} className="hover:bg-white/[0.02] transition-colors group">
                                        <td className="p-4 text-sm font-bold text-white whitespace-nowrap">{r.driver_name}</td>
                                        <td className="p-4 text-sm font-mono text-slate-300">€{r.saldo_inicial.toFixed(2)}</td>
                                        <td className="p-4 text-sm font-mono text-brand-platinum/80">€{r.uber_cash_collected.toFixed(2)}</td>
                                        <td className="p-4 text-sm font-mono text-brand-platinum/80">€{r.vgd_cash_collected.toFixed(2)}</td>
                                        <td className="p-4 text-sm font-mono text-brand-gold font-bold">€{r.total_cash_collected.toFixed(2)}</td>
                                        <td className="p-4 text-sm font-mono text-red-400">€{r.cash_delivered.toFixed(2)}</td>
                                        <td className="p-4 text-sm font-mono text-red-400">€{r.gastos.toFixed(2)}</td>
                                        <td className="p-4 text-sm font-mono font-bold">
                                            <span className={`px-2 py-1 rounded-md bg-opacity-20 ${r.difference > 0 ? 'text-green-400 bg-green-500' : r.difference < 0 ? 'text-red-400 bg-red-500' : 'text-slate-400 bg-slate-500'}`}>
                                                €{r.difference.toFixed(2)}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modals */}
             <DataEntryModal 
                 isOpen={isExpenseModalOpen}
                 onClose={() => setIsExpenseModalOpen(false)}
                 onSave={handleAddExpense}
                 title="Añadir Gasto"
                 fields={[
                     { name: 'driver_name', label: 'Conductor', type: 'text', required: true },
                     { name: 'description', label: 'Descripción', type: 'text', required: true },
                     { name: 'amount', label: 'Monto (€)', type: 'number', required: true }
                 ]}
             />
             <DataEntryModal 
                 isOpen={isEntregaModalOpen}
                 onClose={() => setIsEntregaModalOpen(false)}
                 onSave={handleAddEntrega}
                 title="Añadir Entrega"
                 fields={[
                     { name: 'driver_name', label: 'Conductor', type: 'text', required: true },
                     { name: 'amount', label: 'Monto (€)', type: 'number', required: true }
                 ]}
             />
        </div>
    );
};
