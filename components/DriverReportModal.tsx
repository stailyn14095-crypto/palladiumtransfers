import React from 'react';
import { createPortal } from 'react-dom';

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

    const sectionTableStyle: React.CSSProperties = {
        width: '100%',
        borderCollapse: 'collapse',
        fontSize: '11px',
    };

    const thStyle: React.CSSProperties = {
        padding: '6px 10px',
        textAlign: 'left',
        fontWeight: 'bold',
        textTransform: 'uppercase',
        fontSize: '9px',
        letterSpacing: '0.1em',
        color: '#555',
        background: '#f0f0f0',
    };

    const tdStyle: React.CSSProperties = {
        padding: '6px 10px',
        borderBottom: '1px solid #eee',
        fontFamily: 'monospace',
    };

    const tdRightStyle: React.CSSProperties = {
        ...tdStyle,
        textAlign: 'right',
        fontWeight: 'bold',
    };

    const sectionStyle: React.CSSProperties = {
        display: 'inline-block',
        width: '48%',
        verticalAlign: 'top',
        marginBottom: '20px',
        border: '1px solid #ddd',
        borderRadius: '6px',
        overflow: 'hidden',
        pageBreakInside: 'avoid',
        breakInside: 'avoid',
    };

    // This is the print content - rendered via portal directly into body
    const printContent = createPortal(
        <div
            id="palladium-print-report"
            style={{
                display: 'none',       // Hidden in screen mode; @media print will show it
                fontFamily: 'system-ui, sans-serif',
                color: '#1a1a1a',
                padding: '1cm',
                background: 'white',
            }}
        >
            <style>{`
                @media print {
                    #palladium-print-report { display: block !important; }
                    body > *:not(#palladium-print-report) { display: none !important; }
                    #root { display: none !important; }
                }
            `}</style>

            {/* Header */}
            <div style={{ marginBottom: '24px', borderBottom: '2px solid #c4a14c', paddingBottom: '12px' }}>
                <h1 style={{ fontSize: '22px', fontWeight: 300, letterSpacing: '0.2em', textTransform: 'uppercase', margin: 0 }}>REPORTE DETALLADO</h1>
                <p style={{ color: '#c4a14c', fontWeight: 'bold', margin: '4px 0 0', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{report.driver_name}</p>
            </div>

            {/* Summary Cards */}
            <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
                {[
                    { label: 'Saldo Inicial', value: `€${report.saldo_inicial.toFixed(2)}` },
                    { label: 'Total Recaudado', value: `€${(report.total_uber + report.total_vgd).toFixed(2)}` },
                    { label: 'Total Entregado', value: `€${(report.total_entregas + report.total_gastos).toFixed(2)}` },
                    { label: 'Diferencia Final', value: `€${report.difference.toFixed(2)}` },
                ].map((card) => (
                    <div key={card.label} style={{ flex: 1, border: '1px solid #ddd', borderRadius: '6px', padding: '10px' }}>
                        <p style={{ fontSize: '9px', fontWeight: 'bold', color: '#888', textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>{card.label}</p>
                        <p style={{ fontSize: '18px', fontFamily: 'monospace', fontWeight: 'bold', margin: '4px 0 0' }}>{card.value}</p>
                    </div>
                ))}
            </div>

            {/* Details Grid */}
            <div style={{ display: 'block', width: '100%' }}>
                {/* Row 1: Uber & VGD */}
                <div style={{ marginBottom: '16px' }}>
                    <div style={{ ...sectionStyle, marginRight: '4%' }}>
                        <div style={{ padding: '8px 10px', background: '#f8f8f8', borderBottom: '1px solid #ddd' }}>
                            <span style={{ fontSize: '9px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#555' }}>Detalle Uber</span>
                        </div>
                        <table style={sectionTableStyle}>
                            <thead><tr><th style={thStyle}>Fecha/Periodo</th><th style={{ ...thStyle, textAlign: 'right' }}>Importe</th></tr></thead>
                            <tbody>
                                {filteredUber.length === 0 ? (
                                    <tr><td colSpan={2} style={{ ...tdStyle, textAlign: 'center', color: '#999', fontStyle: 'italic' }}>Sin registros</td></tr>
                                ) : filteredUber.map((d: any, i: number) => (
                                    <tr key={i}><td style={tdStyle}>{d.period}</td><td style={tdRightStyle}>€{d.cash_collected.toFixed(2)}</td></tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div style={sectionStyle}>
                        <div style={{ padding: '8px 10px', background: '#f8f8f8', borderBottom: '1px solid #ddd' }}>
                            <span style={{ fontSize: '9px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#555' }}>Detalle V-GD</span>
                        </div>
                        <table style={sectionTableStyle}>
                            <thead><tr><th style={thStyle}>Fecha/Mes</th><th style={{ ...thStyle, textAlign: 'right' }}>Importe</th></tr></thead>
                            <tbody>
                                {filteredVgd.length === 0 ? (
                                    <tr><td colSpan={2} style={{ ...tdStyle, textAlign: 'center', color: '#999', fontStyle: 'italic' }}>Sin registros</td></tr>
                                ) : filteredVgd.map((d: any, i: number) => (
                                    <tr key={i}><td style={tdStyle}>{d.month}</td><td style={tdRightStyle}>€{d.cash_collected.toFixed(2)}</td></tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Row 2: Entregas & Gastos */}
                <div>
                    <div style={{ ...sectionStyle, marginRight: '4%' }}>
                        <div style={{ padding: '8px 10px', background: '#f8f8f8', borderBottom: '1px solid #ddd' }}>
                            <span style={{ fontSize: '9px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#555' }}>Detalle Entregas</span>
                        </div>
                        <table style={sectionTableStyle}>
                            <thead><tr><th style={thStyle}>Fecha/Hora</th><th style={{ ...thStyle, textAlign: 'right' }}>Importe</th></tr></thead>
                            <tbody>
                                {filteredEntregas.length === 0 ? (
                                    <tr><td colSpan={2} style={{ ...tdStyle, textAlign: 'center', color: '#999', fontStyle: 'italic' }}>Sin registros</td></tr>
                                ) : filteredEntregas.map((d: any, i: number) => (
                                    <tr key={i}><td style={tdStyle}>{d.timestamp}</td><td style={tdRightStyle}>€{d.amount.toFixed(2)}</td></tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div style={sectionStyle}>
                        <div style={{ padding: '8px 10px', background: '#f8f8f8', borderBottom: '1px solid #ddd' }}>
                            <span style={{ fontSize: '9px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#555' }}>Detalle Gastos</span>
                        </div>
                        <table style={sectionTableStyle}>
                            <thead><tr><th style={thStyle}>Descripción</th><th style={{ ...thStyle, textAlign: 'right' }}>Importe</th></tr></thead>
                            <tbody>
                                {filteredGastos.length === 0 ? (
                                    <tr><td colSpan={2} style={{ ...tdStyle, textAlign: 'center', color: '#999', fontStyle: 'italic' }}>Sin registros</td></tr>
                                ) : filteredGastos.map((d: any, i: number) => (
                                    <tr key={i}>
                                        <td style={tdStyle}>
                                            <span style={{ fontWeight: 'bold', display: 'block' }}>{d.description}</span>
                                            <span style={{ fontSize: '10px', color: '#888' }}>{d.timestamp}</span>
                                        </td>
                                        <td style={tdRightStyle}>€{d.amount.toFixed(2)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );

    return (
        <>
            {/* Print version rendered as portal directly in body */}
            {printContent}

            {/* Screen modal overlay */}
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                <div className="bg-brand-charcoal w-full max-w-4xl max-h-[90vh] rounded-2xl border border-white/10 shadow-2xl overflow-hidden flex flex-col">
                    {/* Header */}
                    <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/[0.02]">
                        <div>
                            <h2 className="text-2xl font-light tracking-[0.2em] text-white uppercase">REPORTE DETALLADO</h2>
                            <p className="text-brand-gold text-sm font-bold tracking-widest mt-1 uppercase">{report.driver_name}</p>
                        </div>
                        <div className="flex gap-2">
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
                    <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-8">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                                <p className="text-[10px] text-brand-platinum/50 uppercase font-bold tracking-widest">Saldo Inicial</p>
                                <p className="text-xl font-mono font-bold text-white mt-1">€{report.saldo_inicial.toFixed(2)}</p>
                            </div>
                            <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                                <p className="text-[10px] text-brand-platinum/50 uppercase font-bold tracking-widest">Total Recaudado</p>
                                <p className="text-xl font-mono font-bold text-brand-gold mt-1">€{(report.total_uber + report.total_vgd).toFixed(2)}</p>
                            </div>
                            <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                                <p className="text-[10px] text-brand-platinum/50 uppercase font-bold tracking-widest">Total Entregado</p>
                                <p className="text-xl font-mono font-bold text-emerald-400 mt-1">€{(report.total_entregas + report.total_gastos).toFixed(2)}</p>
                            </div>
                            <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                                <p className="text-[10px] text-brand-platinum/50 uppercase font-bold tracking-widest">Diferencia Final</p>
                                <p className={`text-xl font-mono font-bold mt-1 ${report.difference >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>€{report.difference.toFixed(2)}</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div>
                                <h3 className="text-xs font-black tracking-[0.2em] text-brand-platinum/50 uppercase mb-4 flex items-center gap-2">
                                    <span className="material-icons-round text-sm text-blue-400">directions_car</span>
                                    Detalle Uber
                                </h3>
                                <div className="bg-white/[0.02] border border-white/5 rounded-lg overflow-hidden">
                                    <table className="w-full text-xs">
                                        <thead className="bg-white/5"><tr>
                                            <th className="p-3 text-left font-bold uppercase tracking-widest opacity-50">Fecha/Periodo</th>
                                            <th className="p-3 text-right font-bold uppercase tracking-widest opacity-50">Importe</th>
                                        </tr></thead>
                                        <tbody className="divide-y divide-white/5">
                                            {filteredUber.length === 0 ? (
                                                <tr><td colSpan={2} className="p-4 text-center opacity-30 italic">Sin registros</td></tr>
                                            ) : filteredUber.map((d: any, i: number) => (
                                                <tr key={i} className="hover:bg-white/5">
                                                    <td className="p-3 font-mono opacity-80">{d.period}</td>
                                                    <td className="p-3 text-right font-mono font-bold text-white">€{d.cash_collected.toFixed(2)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                            <div>
                                <h3 className="text-xs font-black tracking-[0.2em] text-brand-platinum/50 uppercase mb-4 flex items-center gap-2">
                                    <span className="material-icons-round text-sm text-green-400">description</span>
                                    Detalle V-GD
                                </h3>
                                <div className="bg-white/[0.02] border border-white/5 rounded-lg overflow-hidden">
                                    <table className="w-full text-xs">
                                        <thead className="bg-white/5"><tr>
                                            <th className="p-3 text-left font-bold uppercase tracking-widest opacity-50">Fecha/Mes</th>
                                            <th className="p-3 text-right font-bold uppercase tracking-widest opacity-50">Importe</th>
                                        </tr></thead>
                                        <tbody className="divide-y divide-white/5">
                                            {filteredVgd.length === 0 ? (
                                                <tr><td colSpan={2} className="p-4 text-center opacity-30 italic">Sin registros</td></tr>
                                            ) : filteredVgd.map((d: any, i: number) => (
                                                <tr key={i} className="hover:bg-white/5">
                                                    <td className="p-3 font-mono opacity-80">{d.month}</td>
                                                    <td className="p-3 text-right font-mono font-bold text-white">€{d.cash_collected.toFixed(2)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                            <div>
                                <h3 className="text-xs font-black tracking-[0.2em] text-brand-platinum/50 uppercase mb-4 flex items-center gap-2">
                                    <span className="material-icons-round text-sm text-emerald-400">payments</span>
                                    Detalle Entregas
                                </h3>
                                <div className="bg-white/[0.02] border border-white/5 rounded-lg overflow-hidden">
                                    <table className="w-full text-xs">
                                        <thead className="bg-white/5"><tr>
                                            <th className="p-3 text-left font-bold uppercase tracking-widest opacity-50">Fecha/Hora</th>
                                            <th className="p-3 text-right font-bold uppercase tracking-widest opacity-50">Importe</th>
                                        </tr></thead>
                                        <tbody className="divide-y divide-white/5">
                                            {filteredEntregas.length === 0 ? (
                                                <tr><td colSpan={2} className="p-4 text-center opacity-30 italic">Sin registros</td></tr>
                                            ) : filteredEntregas.map((d: any, i: number) => (
                                                <tr key={i} className="hover:bg-white/5">
                                                    <td className="p-3 font-mono opacity-80">{d.timestamp}</td>
                                                    <td className="p-3 text-right font-mono font-bold text-emerald-400">€{d.amount.toFixed(2)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                            <div>
                                <h3 className="text-xs font-black tracking-[0.2em] text-brand-platinum/50 uppercase mb-4 flex items-center gap-2">
                                    <span className="material-icons-round text-sm text-amber-400">request_quote</span>
                                    Detalle Gastos
                                </h3>
                                <div className="bg-white/[0.02] border border-white/5 rounded-lg overflow-hidden">
                                    <table className="w-full text-xs">
                                        <thead className="bg-white/5"><tr>
                                            <th className="p-3 text-left font-bold uppercase tracking-widest opacity-50">Descripción</th>
                                            <th className="p-3 text-right font-bold uppercase tracking-widest opacity-50">Importe</th>
                                        </tr></thead>
                                        <tbody className="divide-y divide-white/5">
                                            {filteredGastos.length === 0 ? (
                                                <tr><td colSpan={2} className="p-4 text-center opacity-30 italic">Sin registros</td></tr>
                                            ) : filteredGastos.map((d: any, i: number) => (
                                                <tr key={i} className="hover:bg-white/5">
                                                    <td className="p-3 flex flex-col">
                                                        <span className="font-bold text-white">{d.description}</span>
                                                        <span className="opacity-50 text-[10px] font-mono">{d.timestamp}</span>
                                                    </td>
                                                    <td className="p-3 text-right font-mono font-bold text-amber-400">€{d.amount.toFixed(2)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="p-6 border-t border-white/10 bg-white/[0.02] flex justify-end">
                        <button onClick={onClose} className="bg-white/5 text-white px-8 py-3 rounded-lg hover:bg-white/10 transition-all font-bold uppercase tracking-widest text-xs border border-white/5">
                            Cerrar
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
};
