import React, { useState, useEffect } from 'react';
import { useSupabaseData } from '../hooks/useSupabaseData';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export const CalculadoraNominasView = () => {
    const { data: drivers } = useSupabaseData('drivers');
    const { data: bookings } = useSupabaseData('bookings');

    // New State for Selector
    const [selectedDriverId, setSelectedDriverId] = useState<string>('');
    const [selectedMonth, setSelectedMonth] = useState<string>(
        new Date().toISOString().substring(0, 7) // YYYY-MM
    );

    // State for the main inputs
    const [factBruta, setFactBruta] = useState<number>(8000);
    const [iva, setIva] = useState<number>(10);
    const [ssPct, setSsPct] = useState<number>(33);
    const [sueldoBase, setSueldoBase] = useState<number>(1500);

    // State for the tramos
    const [limite1, setLimite1] = useState<number>(4500);
    const [limite2, setLimite2] = useState<number>(5500);
    const [pct2, setPct2] = useState<number>(13);
    const [limite3, setLimite3] = useState<number>(6500);
    const [pct3, setPct3] = useState<number>(15);
    const [pct4, setPct4] = useState<number>(17);

    // State for results
    const [resNeta, setResNeta] = useState<number>(0);
    const [resComision, setResComision] = useState<number>(0);
    const [resBruto, setResBruto] = useState<number>(0);
    const [resSs, setResSs] = useState<number>(0);
    const [resCosteTotal, setResCosteTotal] = useState<number>(0);
    const [resRatio, setResRatio] = useState<number>(0);
    const [desglose, setDesglose] = useState<string[]>([]);

    // Facturación Update Effect
    useEffect(() => {
        if (!bookings || !selectedDriverId || !selectedMonth) return;

        const [year, month] = selectedMonth.split('-');

        const total = bookings.reduce((sum: number, booking: any) => {
            if (booking.driver_id !== selectedDriverId) return sum;

            // Only count completed or ongoing bookings for revenue
            if (booking.status !== 'Completed' && booking.status !== 'Completada' && booking.status !== 'Confirmed' && booking.status !== 'Asignada') return sum;

            // Check date match
            let bYear = '';
            let bMonth = '';

            const rawDate = booking.pickup_date || booking.date;

            if (rawDate) {
                // If it's already YYYY-MM-DD
                if (rawDate.includes('-')) {
                    const parts = rawDate.split('-');
                    if (parts[0].length === 4) { // YYYY-MM-DD
                        bYear = parts[0];
                        bMonth = parts[1];
                    } else if (parts[2].length === 4) { // DD-MM-YYYY
                        bYear = parts[2];
                        bMonth = parts[1];
                    }
                }
                // If it's DD/MM/YYYY
                else if (rawDate.includes('/')) {
                    const parts = rawDate.split('/');
                    if (parts[2].length === 4) { // DD/MM/YYYY
                        bYear = parts[2];
                        bMonth = parts[1];
                    } else if (parts[0].length === 4) { // YYYY/MM/DD
                        bYear = parts[0];
                        bMonth = parts[1];
                    }
                }
                // Fallback to JS Date
                else {
                    const bookingDate = new Date(rawDate);
                    if (!isNaN(bookingDate.getTime())) {
                        bYear = bookingDate.getFullYear().toString();
                        bMonth = (bookingDate.getMonth() + 1).toString().padStart(2, '0');
                    }
                }
            }

            // console.log(`Parsed: Y=${bYear} M=${bMonth} | Target: Y=${year} M=${month} | Match=${bYear === year && bMonth === month}`);

            if (bYear === year && bMonth === month) {
                return sum + (Number(booking.collaborator_price) || 0);
            }
            return sum;
        }, 0);

        setFactBruta(total);

    }, [selectedDriverId, selectedMonth, bookings]);


    useEffect(() => {
        calcular();
    }, [factBruta, iva, ssPct, sueldoBase, limite1, limite2, pct2, limite3, pct3, pct4]);

    const calcular = () => {
        const neta = factBruta / (1 + iva / 100);
        let comision = 0;
        const tDesglose: string[] = [];

        // Tramos
        if (factBruta > limite1) {
            const cantidad = Math.min(factBruta, limite2) - limite1;
            const com = cantidad * (pct2 / 100);
            comision += com;
            tDesglose.push(`De ${limite1}€ a ${Math.min(factBruta, limite2)}€ (${pct2}%): **${com.toFixed(2)} €**`);
        }
        if (factBruta > limite2) {
            const cantidad = Math.min(factBruta, limite3) - limite2;
            const com = cantidad * (pct3 / 100);
            comision += com;
            tDesglose.push(`De ${limite2}€ a ${Math.min(factBruta, limite3)}€ (${pct3}%): **${com.toFixed(2)} €**`);
        }
        if (factBruta > limite3) {
            const cantidad = factBruta - limite3;
            const com = cantidad * (pct4 / 100);
            comision += com;
            tDesglose.push(`Más de ${limite3}€ (${pct4}%): **${com.toFixed(2)} €**`);
        }

        if (comision === 0) {
            tDesglose.push('No se han alcanzado los tramos de comisión.');
        }

        const totalBruto = sueldoBase + comision;
        const costeSS = totalBruto * (ssPct / 100);
        const costeTotal = totalBruto + costeSS;
        const ratio = neta > 0 ? (costeTotal / neta) * 100 : 0;

        setResNeta(neta);
        setResComision(comision);
        setResBruto(totalBruto);
        setResSs(costeSS);
        setResCosteTotal(costeTotal);
        setResRatio(ratio);
        setDesglose(tDesglose);
    };

    // Estilos basados en el ratio
    let ratioColor = 'text-green-500';
    let ratioText = 'Óptimo: Negocio rentable.';
    if (resRatio > 45) {
        ratioColor = 'text-red-500';
        ratioText = 'Peligro: El coste de personal es demasiado alto.';
    } else if (resRatio > 40) {
        ratioColor = 'text-yellow-500';
        ratioText = 'Aceptable: Zona de precaución.';
    }

    const handleDownloadPDF = () => {
        const doc = new jsPDF();

        let driverName = 'General';
        if (selectedDriverId && drivers) {
            const d = drivers.find((d: any) => d.id === selectedDriverId);
            if (d) driverName = d.name;
        }

        const mesAnio = selectedMonth ? `${selectedMonth.split('-')[1]}/${selectedMonth.split('-')[0]}` : '';

        // Header
        doc.setFontSize(20);
        doc.setTextColor(40);
        doc.text('Calculadora de Nóminas - Rentabilidad', 14, 22);

        doc.setFontSize(12);
        doc.setTextColor(100);
        doc.text(`Conductor: ${driverName}`, 14, 32);
        doc.text(`Mes/Año: ${mesAnio}`, 14, 38);

        // Parametros
        autoTable(doc, {
            startY: 45,
            head: [['Parámetros Base', 'Valor']],
            body: [
                ['Facturación Bruta (Mes)', `${factBruta.toFixed(2)} €`],
                ['Sueldo Base Bruto', `${sueldoBase.toFixed(2)} €`],
                ['IVA Aplicado', `${iva}%`],
                ['Coste Seguridad Social (%)', `${ssPct}%`],
            ],
            theme: 'grid',
            headStyles: { fillColor: [41, 128, 185] }
        });

        // Tramos Check
        const tramosRows = desglose.map((txt) => {
            // strip simple markdown
            return [txt.replace(/\*\*/g, '')];
        });

        autoTable(doc, {
            startY: (doc as any).lastAutoTable.finalY + 10,
            head: [['Desglose de Comisiones (Tramos)']],
            body: tramosRows.length ? tramosRows : [['No hay comisiones']],
            theme: 'grid',
            headStyles: { fillColor: [39, 174, 96] }
        });

        // Final Results
        autoTable(doc, {
            startY: (doc as any).lastAutoTable.finalY + 10,
            head: [['Resultados Finales', 'Importe']],
            body: [
                ['Facturación Neta (Sin IVA)', `${resNeta.toFixed(2)} €`],
                ['Comisiones Extra', `${resComision.toFixed(2)} €`],
                ['Total Bruto Conductor', `${resBruto.toFixed(2)} €`],
                ['Coste Seg. Social (Empresa)', `${resSs.toFixed(2)} €`],
                ['Coste Total Empresa', `${resCosteTotal.toFixed(2)} €`],
            ],
            theme: 'grid',
            headStyles: { fillColor: [44, 62, 80] },
            alternateRowStyles: { fillColor: [240, 240, 240] },
        });

        // Ratio Alert
        const finalY = (doc as any).lastAutoTable.finalY + 15;
        doc.setFontSize(12);
        if (resRatio > 45) {
            doc.setTextColor(231, 76, 60); // red
        } else if (resRatio > 40) {
            doc.setTextColor(243, 156, 18); // yellow
        } else {
            doc.setTextColor(46, 204, 113); // green
        }

        doc.text(`Ratio Gasto Personal / Ingreso Neto: ${resRatio.toFixed(2)}%`, 14, finalY);
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(ratioText, 14, finalY + 6);

        // Footer
        doc.setFontSize(8);
        doc.text('Generado por Palladium Operations Hub', 14, 285);

        doc.save(`Nomina_${driverName.replace(/\s+/g, '_')}_${selectedMonth}.pdf`);
    };

    return (
        <div className="flex-1 flex flex-col h-full bg-brand-black overflow-y-auto custom-scrollbar">
            <header className="min-h-[5rem] border-b border-white/5 bg-brand-charcoal px-4 md:px-8 py-4 md:py-0 flex items-center justify-between shrink-0">
                <div>
                    <h1 className="text-xl font-bold text-white tracking-tight">Calculadora de Nóminas</h1>
                    <p className="text-[10px] text-brand-platinum/50 uppercase font-bold tracking-widest">Calculadora de Rentabilidad VTC/Transporte</p>
                </div>
            </header>

            <div className="p-4 md:p-8">
                <div className="flex flex-col xl:flex-row gap-6">

                    {/* Panel de Configuración Left */}
                    <div className="flex-1 space-y-6">
                        {/* Main Input */}
                        <div className="bg-brand-charcoal border border-blue-500/30 rounded-xl p-6 shadow-lg shadow-blue-500/5 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl"></div>

                            {/* Driver and Month Selection */}
                            <div className="flex flex-col md:flex-row gap-4 mb-6 relative z-10 p-4 bg-black/20 rounded-xl border border-white/5">
                                <div className="flex-1">
                                    <label className="block text-xs text-brand-platinum/50 uppercase font-bold tracking-widest mb-2">
                                        Seleccionar Conductor
                                    </label>
                                    <select
                                        value={selectedDriverId}
                                        onChange={(e) => setSelectedDriverId(e.target.value)}
                                        className="w-full bg-brand-black/50 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm focus:border-brand-gold outline-none transition-colors"
                                    >
                                        <option value="">-- Manual (Sin Auto-completar) --</option>
                                        {drivers?.map((d: any) => (
                                            <option key={d.id} value={d.id}>
                                                {d.name} {d.status === 'Inactive' || d.status === 'Baja' ? '(Inactivo)' : ''}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="w-full md:w-48 shrink-0">
                                    <label className="block text-xs text-brand-platinum/50 uppercase font-bold tracking-widest mb-2">
                                        Mes
                                    </label>
                                    <input
                                        type="month"
                                        value={selectedMonth}
                                        onChange={(e) => setSelectedMonth(e.target.value)}
                                        className="w-full bg-brand-black/50 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm focus:border-brand-gold outline-none transition-colors [color-scheme:dark]"
                                    />
                                </div>
                            </div>

                            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 relative z-10 border-t border-white/5 pt-6">
                                <div>
                                    <label className="block text-white font-bold mb-1">Facturación Bruta (Mes):</label>
                                    <p className="text-[10px] text-slate-400 uppercase tracking-widest">
                                        {selectedDriverId ? 'Suma automática de las reservas completadas' : 'Introduce lo que ha facturado el conductor (con IVA)'}
                                    </p>
                                </div>
                                <div className="relative">
                                    <input
                                        type="number"
                                        value={factBruta}
                                        onChange={(e) => setFactBruta(Number(e.target.value))}
                                        className={`bg-brand-black border rounded-lg px-4 py-2 text-white font-mono text-xl w-40 outline-none transition-colors text-right ${selectedDriverId ? 'border-brand-gold/50 text-brand-gold bg-brand-gold/10 pointer-events-none' : 'border-white/10 focus:border-blue-500'
                                            }`}
                                        readOnly={!!selectedDriverId}
                                    />
                                    <span className="absolute right-12 top-2.5 text-slate-400 font-bold">€</span>
                                </div>
                            </div>
                        </div>

                        {/* Settings Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                            {/* 1. Gastos Fijos y Base */}
                            <div className="bg-brand-charcoal/50 border border-white/5 rounded-xl p-6 space-y-4 shadow-xl">
                                <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                                    <span className="material-icons-round text-brand-gold text-sm">payments</span>
                                    1. Gastos Fijos y Base
                                </h3>

                                <div className="flex justify-between items-center">
                                    <label className="text-sm text-slate-300">IVA (%):</label>
                                    <input type="number" value={iva} onChange={(e) => setIva(Number(e.target.value))} className="bg-brand-black border border-white/10 rounded w-20 px-2 py-1 text-white text-right font-mono" />
                                </div>
                                <div className="flex justify-between items-center">
                                    <label className="text-sm text-slate-300">Seguridad Social (%):</label>
                                    <input type="number" value={ssPct} onChange={(e) => setSsPct(Number(e.target.value))} className="bg-brand-black border border-white/10 rounded w-20 px-2 py-1 text-white text-right font-mono" />
                                </div>
                                <div className="flex justify-between items-center border-t border-white/5 pt-4">
                                    <label className="text-sm text-white font-bold flex flex-col">
                                        Sueldo Base Bruto (€):
                                    </label>
                                    <input type="number" value={sueldoBase} onChange={(e) => setSueldoBase(Number(e.target.value))} className="bg-brand-black border border-white/20 rounded w-24 px-2 py-1 text-white text-right font-mono font-bold" />
                                </div>
                            </div>

                            {/* 2. Tramos de Incentivos */}
                            <div className="bg-brand-charcoal/50 border border-white/5 rounded-xl p-6 space-y-4 shadow-xl">
                                <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                                    <span className="material-icons-round text-emerald-400 text-sm">trending_up</span>
                                    2. Tramos de Incentivos
                                </h3>

                                <div className="flex flex-col gap-2">
                                    <label className="text-sm text-slate-300">Tramo 1: Solo sueldo base hasta</label>
                                    <div className="flex items-center gap-2">
                                        <input type="number" value={limite1} onChange={(e) => setLimite1(Number(e.target.value))} className="bg-brand-black border border-white/10 rounded w-24 px-2 py-1 text-white text-right font-mono" />
                                        <span className="text-xs text-slate-500">€ brutos</span>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-2 border-t border-white/5 pt-3">
                                    <label className="text-sm text-slate-300">Tramo 2: de {limite1}€ hasta {limite2}€</label>
                                    <div className="flex items-center justify-between gap-2">
                                        <input type="number" value={limite2} onChange={(e) => setLimite2(Number(e.target.value))} className="bg-brand-black border border-white/10 rounded w-24 px-2 py-1 text-white text-right font-mono" />
                                        <span className="text-slate-400 text-sm">al</span>
                                        <div className="relative">
                                            <input type="number" value={pct2} onChange={(e) => setPct2(Number(e.target.value))} className="bg-brand-black border border-white/10 rounded w-16 px-2 py-1 text-white font-mono text-center" />
                                            <span className="absolute right-0 -mr-4 top-1.5 text-xs text-slate-500">%</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-2 border-t border-white/5 pt-3">
                                    <label className="text-sm text-slate-300">Tramo 3: de {limite2}€ hasta {limite3}€</label>
                                    <div className="flex items-center justify-between gap-2">
                                        <input type="number" value={limite3} onChange={(e) => setLimite3(Number(e.target.value))} className="bg-brand-black border border-white/10 rounded w-24 px-2 py-1 text-white text-right font-mono" />
                                        <span className="text-slate-400 text-sm">al</span>
                                        <div className="relative">
                                            <input type="number" value={pct3} onChange={(e) => setPct3(Number(e.target.value))} className="bg-brand-black border border-white/10 rounded w-16 px-2 py-1 text-white font-mono text-center" />
                                            <span className="absolute right-0 -mr-4 top-1.5 text-xs text-slate-500">%</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-2 border-t border-white/5 pt-3">
                                    <label className="text-sm text-slate-300">Tramo 4: A partir de {limite3}€</label>
                                    <div className="flex items-center justify-end gap-2">
                                        <span className="text-slate-400 text-sm">al</span>
                                        <div className="relative">
                                            <input type="number" value={pct4} onChange={(e) => setPct4(Number(e.target.value))} className="bg-brand-black border border-white/10 rounded w-16 px-2 py-1 text-white font-mono text-center" />
                                            <span className="absolute right-0 -mr-4 top-1.5 text-xs text-slate-500">%</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Sidebar - Resultados */}
                    <div className="w-full xl:w-96 shrink-0 space-y-6">
                        <div className="bg-slate-800 rounded-2xl p-6 sticky top-8 shadow-2xl border border-white/10">
                            <h2 className="text-xl font-bold text-white mb-6">Resultados</h2>

                            <div className="space-y-4">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-slate-300">Facturación Neta (Sin IVA):</span>
                                    <span className="font-mono text-white">{resNeta.toFixed(2)} €</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-slate-300">Sueldo Base:</span>
                                    <span className="font-mono text-white">{sueldoBase.toFixed(2)} €</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-slate-300">Comisiones Extra:</span>
                                    <span className="font-mono text-white">{resComision.toFixed(2)} €</span>
                                </div>

                                <div className="bg-black/20 rounded-xl p-4 my-2 border border-white/5 relative overflow-hidden">
                                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500 rounded-l-xl"></div>
                                    <div className="flex justify-between items-center">
                                        <span className="font-bold text-emerald-400">Total Bruto Conductor:</span>
                                        <span className="font-mono font-bold text-emerald-400 text-lg">{resBruto.toFixed(2)} €</span>
                                    </div>
                                </div>

                                <div className="flex justify-between items-center text-sm text-rose-400 border-t border-white/5 pt-4">
                                    <span>Coste Seg. Social (Empresa):</span>
                                    <span className="font-mono">{resSs.toFixed(2)} €</span>
                                </div>

                                <div className="flex justify-between items-center text-base border-b-2 border-white/10 pb-4">
                                    <span className="font-bold text-white">Coste Total Empresa:</span>
                                    <span className="font-mono font-bold text-white">{resCosteTotal.toFixed(2)} €</span>
                                </div>

                                {/* Ratio Component */}
                                <div className="bg-black/30 rounded-xl p-6 text-center mt-6 border border-white/5">
                                    <p className="text-xs text-slate-400 uppercase tracking-widest mb-2 font-bold">Ratio Gasto Personal / Ingreso Neto</p>
                                    <div className={`text-4xl font-black font-mono tracking-tighter ${ratioColor}`}>
                                        {resRatio.toFixed(2)} %
                                    </div>
                                    <p className="text-xs text-slate-300 mt-2">{ratioText}</p>
                                </div>

                                {/* Desglose */}
                                <div className="pt-6">
                                    <h3 className="text-xs uppercase font-bold text-slate-500 mb-3 tracking-widest">Desglose de Comisiones</h3>
                                    <ul className="space-y-2">
                                        {desglose.map((d, i) => (
                                            <li key={i} className="text-sm text-slate-300 flex gap-2">
                                                <span className="text-brand-gold">•</span>
                                                {/* Procesar el markdown simple del breakdown */}
                                                <span dangerouslySetInnerHTML={{ __html: d.replace(/\*\*(.*?)\*\*/g, '<strong class="text-white font-mono">$1</strong>') }} />
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                {/* Botón Descargar PDF */}
                                <div className="pt-6 mt-4 border-t border-white/10">
                                    <button
                                        onClick={handleDownloadPDF}
                                        className="w-full bg-white/5 hover:bg-white/10 border border-white/10 hover:border-brand-gold/50 text-white font-bold py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2 group"
                                    >
                                        <span className="material-icons-round text-brand-gold group-hover:-translate-y-1 transition-transform">picture_as_pdf</span>
                                        Descargar Nómina PDF
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};
