import React from 'react';

interface DriverReportModalProps {
    isOpen: boolean;
    onClose: () => void;
    report: any;
}

export const DriverReportModal: React.FC<DriverReportModalProps> = ({ isOpen, onClose, report }) => {
    if (!isOpen || !report) return null;

    const filteredUber = report.uber_details.filter((d: any) => Math.abs(d.cash_collected) > 0.01);
    const filteredVgd = report.vgd_details.filter((d: any) => Math.abs(d.cash_collected) > 0.01);
    const filteredEntregas = report.entrega_details.filter((d: any) => Math.abs(d.amount) > 0.01);
    const filteredGastos = report.gastos_details.filter((d: any) => Math.abs(d.amount) > 0.01);

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm print:bg-white print:p-0 print:static">
            <div className="bg-brand-charcoal w-full max-w-4xl max-h-[90vh] rounded-2xl border border-white/10 shadow-2xl overflow-hidden flex flex-col print:bg-white print:text-black print:max-h-full print:border-0 print:shadow-none print:w-full">
                {/* Header */}
                <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/[0.02] print:border-black/10">
                    <div>
                        <h2 className="text-2xl font-light tracking-[0.2em] text-white uppercase print:text-black">REPORTE DETALLADO</h2>
                        <p className="text-brand-gold text-sm font-bold tracking-widest mt-1 uppercase">{report.driver_name}</p>
                    </div>
                    <div className="flex gap-2 print:hidden">
                        <button onClick={handlePrint} className="text-brand-platinum/50 hover:text-brand-gold transition-colors flex items-center gap-1 uppercase font-bold text-[10px] tracking-widest bg-white/5 px-3 py-2 rounded-lg border border-white/5">
                            <span className="material-icons-round text-lg">print</span>
                            Imprimir
                        </button>
                        <button onClick={onClose} className="text-brand-platinum/50 hover:text-white transition-colors">
                            <span className="material-icons-round text-3xl">close</span>
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-8 print:overflow-visible">
                    {/* Summary Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 print:grid-cols-4">
                        <div className="bg-white/5 p-4 rounded-xl border border-white/10 print:bg-gray-50 print:border-gray-200">
                            <p className="text-[10px] text-brand-platinum/50 uppercase font-bold tracking-widest print:text-gray-500">Saldo Inicial</p>
                            <p className="text-xl font-mono font-bold text-white mt-1 print:text-black">€{report.saldo_inicial.toFixed(2)}</p>
                        </div>
                        <div className="bg-white/5 p-4 rounded-xl border border-white/10 print:bg-gray-50 print:border-gray-200">
                            <p className="text-[10px] text-brand-platinum/50 uppercase font-bold tracking-widest print:text-gray-500">Total Recaudado</p>
                            <p className="text-xl font-mono font-bold text-brand-gold mt-1 print:text-black">€{(report.total_uber + report.total_vgd).toFixed(2)}</p>
                        </div>
                        <div className="bg-white/5 p-4 rounded-xl border border-white/10 print:bg-gray-50 print:border-gray-200">
                            <p className="text-[10px] text-brand-platinum/50 uppercase font-bold tracking-widest print:text-gray-500">Total Entregado</p>
                            <p className="text-xl font-mono font-bold text-emerald-400 mt-1 print:text-black">€{(report.total_entregas + report.total_gastos).toFixed(2)}</p>
                        </div>
                        <div className="bg-white/5 p-4 rounded-xl border border-white/10 print:bg-gray-50 print:border-gray-200">
                            <p className="text-[10px] text-brand-platinum/50 uppercase font-bold tracking-widest print:text-gray-500">Diferencia Final</p>
                            <p className={`text-xl font-mono font-bold mt-1 ${report.difference >= 0 ? 'text-emerald-400' : 'text-red-400'} print:text-black`}>€{report.difference.toFixed(2)}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 print:grid-cols-2">
                        {/* Uber Details */}
                        <div>
                            <h3 className="text-xs font-black tracking-[0.2em] text-brand-platinum/50 uppercase mb-4 flex items-center gap-2 print:text-gray-600">
                                <span className="material-icons-round text-sm text-blue-400 print:hidden">directions_car</span>
                                Detalle Uber
                            </h3>
                            <div className="bg-white/[0.02] border border-white/5 rounded-lg overflow-hidden print:border-gray-200">
                                <table className="w-full text-xs">
                                    <thead className="bg-white/5 print:bg-gray-100">
                                        <tr>
                                            <th className="p-3 text-left font-bold uppercase tracking-widest opacity-50 print:opacity-100 print:text-gray-600">Fecha/Periodo</th>
                                            <th className="p-3 text-right font-bold uppercase tracking-widest opacity-50 print:opacity-100 print:text-gray-600">Importe</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5 print:divide-gray-100">
                                        {filteredUber.length === 0 ? (
                                            <tr><td colSpan={2} className="p-4 text-center opacity-30 italic print:text-gray-400">Sin registros</td></tr>
                                        ) : filteredUber.map((d: any, i: number) => (
                                            <tr key={i} className="hover:bg-white/5 print:hover:bg-transparent">
                                                <td className="p-3 font-mono opacity-80 print:text-gray-700">{d.period}</td>
                                                <td className="p-3 text-right font-mono font-bold text-white print:text-black">€{d.cash_collected.toFixed(2)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* VGD Details */}
                        <div>
                            <h3 className="text-xs font-black tracking-[0.2em] text-brand-platinum/50 uppercase mb-4 flex items-center gap-2 print:text-gray-600">
                                <span className="material-icons-round text-sm text-green-400 print:hidden">description</span>
                                Detalle V-GD
                            </h3>
                            <div className="bg-white/[0.02] border border-white/5 rounded-lg overflow-hidden print:border-gray-200">
                                <table className="w-full text-xs">
                                    <thead className="bg-white/5 print:bg-gray-100">
                                        <tr>
                                            <th className="p-3 text-left font-bold uppercase tracking-widest opacity-50 print:opacity-100 print:text-gray-600">Fecha/Mes</th>
                                            <th className="p-3 text-right font-bold uppercase tracking-widest opacity-50 print:opacity-100 print:text-gray-600">Importe</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5 print:divide-gray-100">
                                        {filteredVgd.length === 0 ? (
                                            <tr><td colSpan={2} className="p-4 text-center opacity-30 italic print:text-gray-400">Sin registros</td></tr>
                                        ) : filteredVgd.map((d: any, i: number) => (
                                            <tr key={i} className="hover:bg-white/5 print:hover:bg-transparent">
                                                <td className="p-3 font-mono opacity-80 print:text-gray-700">{d.month}</td>
                                                <td className="p-3 text-right font-mono font-bold text-white print:text-black">€{d.cash_collected.toFixed(2)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Entrega Details */}
                        <div>
                            <h3 className="text-xs font-black tracking-[0.2em] text-brand-platinum/50 uppercase mb-4 flex items-center gap-2 print:text-gray-600">
                                <span className="material-icons-round text-sm text-emerald-400 print:hidden">payments</span>
                                Detalle Entregas
                            </h3>
                            <div className="bg-white/[0.02] border border-white/5 rounded-lg overflow-hidden print:border-gray-200">
                                <table className="w-full text-xs">
                                    <thead className="bg-white/5 print:bg-gray-100">
                                        <tr>
                                            <th className="p-3 text-left font-bold uppercase tracking-widest opacity-50 print:opacity-100 print:text-gray-600">Fecha/Hora</th>
                                            <th className="p-3 text-right font-bold uppercase tracking-widest opacity-50 print:opacity-100 print:text-gray-600">Importe</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5 print:divide-gray-100">
                                        {filteredEntregas.length === 0 ? (
                                            <tr><td colSpan={2} className="p-4 text-center opacity-30 italic print:text-gray-400">Sin registros</td></tr>
                                        ) : filteredEntregas.map((d: any, i: number) => (
                                            <tr key={i} className="hover:bg-white/5 print:hover:bg-transparent">
                                                <td className="p-3 font-mono opacity-80 print:text-gray-700">{d.timestamp}</td>
                                                <td className="p-3 text-right font-mono font-bold text-emerald-400 print:text-black">€{d.amount.toFixed(2)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Gastos Details */}
                        <div>
                            <h3 className="text-xs font-black tracking-[0.2em] text-brand-platinum/50 uppercase mb-4 flex items-center gap-2 print:text-gray-600">
                                <span className="material-icons-round text-sm text-amber-400 print:hidden">request_quote</span>
                                Detalle Gastos
                            </h3>
                            <div className="bg-white/[0.02] border border-white/5 rounded-lg overflow-hidden print:border-gray-200">
                                <table className="w-full text-xs">
                                    <thead className="bg-white/5 print:bg-gray-100">
                                        <tr>
                                            <th className="p-3 text-left font-bold uppercase tracking-widest opacity-50 print:opacity-100 print:text-gray-600">Descripción</th>
                                            <th className="p-3 text-right font-bold uppercase tracking-widest opacity-50 print:opacity-100 print:text-gray-600">Importe</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5 print:divide-gray-100">
                                        {filteredGastos.length === 0 ? (
                                            <tr><td colSpan={2} className="p-4 text-center opacity-30 italic print:text-gray-400">Sin registros</td></tr>
                                        ) : filteredGastos.map((d: any, i: number) => (
                                            <tr key={i} className="hover:bg-white/5 print:hover:bg-transparent">
                                                <td className="p-3 flex flex-col">
                                                    <span className="font-bold text-white print:text-black">{d.description}</span>
                                                    <span className="opacity-50 text-[10px] font-mono print:text-gray-600">{d.timestamp}</span>
                                                </td>
                                                <td className="p-3 text-right font-mono font-bold text-amber-400 print:text-black">€{d.amount.toFixed(2)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-white/10 bg-white/[0.02] flex justify-end print:hidden">
                    <button onClick={onClose} className="bg-white/5 text-white px-8 py-3 rounded-lg hover:bg-white/10 transition-all font-bold uppercase tracking-widest text-xs border border-white/5">
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
};
