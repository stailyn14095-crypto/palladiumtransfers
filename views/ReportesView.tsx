import React, { useState } from 'react';
import { useReportes } from '../hooks/useReportes';

export const ReportesView: React.FC = () => {
   const [timeFilter, setTimeFilter] = useState<'Este Mes' | 'Mes Pasado' | 'YTD'>('Este Mes');
   
   const {
      totalRevenue,
      revenueGrowth,
      totalFuelCost,
      fuelCostPercentage,
      totalMaintenanceCost,
      vehiclesInShop,
      netProfit,
      netMargin,
      totalCollected,
      totalPending,
      recentExpenses,
      vehicleProfitability,
      loading
   } = useReportes(timeFilter);

   const formatCurrency = (value: number) => {
      return value.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
   };

   return (
      <div className="flex-1 flex flex-col h-full bg-[#101822] overflow-hidden relative">
         <header className="min-h-[5rem] border-b border-slate-800 bg-[#1a2533] shrink-0 z-10 relative">
            <div className="max-w-[1400px] mx-auto px-4 md:px-8 h-full flex flex-col md:flex-row items-start md:items-center justify-between gap-4 md:gap-0 py-4 md:py-0">
               <div>
                  <h1 className="text-xl font-bold text-white tracking-tight">Reportes Financieros</h1>
                  <p className="text-xs text-slate-500 font-medium">Ingresos, Gastos y Beneficios de Flota</p>
               </div>
               <div className="flex flex-wrap gap-3 w-full md:w-auto">
                  <select 
                     value={timeFilter}
                     onChange={(e) => setTimeFilter(e.target.value as any)}
                     className="flex-1 md:flex-none bg-[#101822] border border-slate-700 text-white text-sm rounded-lg px-3 py-2 outline-none focus:border-brand-gold transition-colors"
                  >
                     <option value="Este Mes">Este Mes</option>
                     <option value="Mes Pasado">Mes Pasado</option>
                     <option value="YTD">Año Actual (YTD)</option>
                  </select>
                  <button className="w-full md:w-auto justify-center bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all active:scale-95 shadow-lg shadow-blue-500/10">
                     <span className="material-icons-round text-sm">download</span> Exportar
                  </button>
               </div>
            </div>
         </header>

         {loading && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#101822]/80 backdrop-blur-sm">
               <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-gold"></div>
            </div>
         )}

         <div className="p-8 overflow-y-auto custom-scrollbar">
            <div className="max-w-[1400px] mx-auto space-y-8">

               {/* KPI Cards Row 1: Revenue & Cash Flow */}
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="bg-[#1a2533] p-6 rounded-xl border border-slate-700">
                     <div className="flex justify-between items-start mb-2">
                        <p className="text-xs font-bold text-slate-400 uppercase">Ingresos Brutos (Servicios)</p>
                        <span className="material-icons-round text-emerald-500 bg-emerald-500/10 p-1.5 rounded-lg text-lg">payments</span>
                     </div>
                     <h3 className="text-2xl font-bold text-white">{formatCurrency(totalRevenue)}</h3>
                     <p className={`text-xs mt-2 flex items-center gap-1 ${revenueGrowth >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        <span className="material-icons-round text-sm">{revenueGrowth >= 0 ? 'trending_up' : 'trending_down'}</span> 
                        {revenueGrowth >= 0 ? '+' : ''}{revenueGrowth.toFixed(1)}% vs periodo anterior
                     </p>
                  </div>

                  <div className="bg-[#1a2533] p-6 rounded-xl border border-slate-700">
                     <div className="flex justify-between items-start mb-2">
                        <p className="text-xs font-bold text-slate-400 uppercase">Cobros Efectivos</p>
                        <span className="material-icons-round text-blue-500 bg-blue-500/10 p-1.5 rounded-lg text-lg">check_circle</span>
                     </div>
                     <h3 className="text-2xl font-bold text-white">{formatCurrency(totalCollected)}</h3>
                     <div className="w-full bg-slate-800 rounded-full h-1.5 mt-3 overflow-hidden">
                        <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${totalRevenue > 0 ? Math.min(100, (totalCollected / totalRevenue) * 100) : 0}%` }}></div>
                     </div>
                  </div>

                  <div className="bg-[#1a2533] p-6 rounded-xl border border-slate-700">
                     <div className="flex justify-between items-start mb-2">
                        <p className="text-xs font-bold text-slate-400 uppercase">Pendiente de Cobro</p>
                        <span className="material-icons-round text-amber-500 bg-amber-500/10 p-1.5 rounded-lg text-lg">schedule</span>
                     </div>
                     <h3 className="text-2xl font-bold text-amber-400">{formatCurrency(totalPending)}</h3>
                     <p className="text-xs text-slate-400 mt-2">Facturas emitidas no pagadas</p>
                  </div>

                  <div className="bg-[#1a2533] p-6 rounded-xl border border-slate-700 relative overflow-hidden">
                     <div className={`absolute right-0 top-0 w-16 h-16 ${netProfit >= 0 ? 'bg-emerald-500/10' : 'bg-rose-500/10'} rounded-bl-full`}></div>
                     <div className="flex justify-between items-start mb-2 relative z-10">
                        <p className="text-xs font-bold text-slate-400 uppercase">Beneficio Estimado</p>
                        <span className={`material-icons-round ${netProfit >= 0 ? 'text-emerald-400 bg-emerald-500/10' : 'text-rose-400 bg-rose-500/10'} p-1.5 rounded-lg text-lg`}>account_balance_wallet</span>
                     </div>
                     <h3 className={`text-2xl font-bold relative z-10 ${netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{formatCurrency(netProfit)}</h3>
                     <p className="text-xs text-slate-400 mt-2 relative z-10">Margen neto: {netMargin.toFixed(1)}%</p>
                  </div>
               </div>

               {/* Row 2: Operational Costs */}
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="bg-[#1a2533]/50 p-5 rounded-xl border border-slate-800 flex items-center gap-4">
                     <div className="p-3 bg-amber-500/10 rounded-lg">
                        <span className="material-icons-round text-amber-500">local_gas_station</span>
                     </div>
                     <div>
                        <p className="text-xs text-slate-500 font-bold uppercase">Combustible</p>
                        <h4 className="text-lg font-bold text-white">{formatCurrency(totalFuelCost)}</h4>
                     </div>
                  </div>

                  <div className="bg-[#1a2533]/50 p-5 rounded-xl border border-slate-800 flex items-center gap-4">
                     <div className="p-3 bg-blue-500/10 rounded-lg">
                        <span className="material-icons-round text-blue-500">build</span>
                     </div>
                     <div>
                        <p className="text-xs text-slate-500 font-bold uppercase">Mantenimiento</p>
                        <h4 className="text-lg font-bold text-white">{formatCurrency(totalMaintenanceCost)}</h4>
                     </div>
                  </div>

                  <div className="bg-[#1a2533]/50 p-5 rounded-xl border border-slate-800 flex items-center gap-4">
                     <div className="p-3 bg-rose-500/10 rounded-lg">
                        <span className="material-icons-round text-rose-500">car_repair</span>
                     </div>
                     <div>
                        <p className="text-xs text-slate-500 font-bold uppercase">En Taller</p>
                        <h4 className="text-lg font-bold text-white">{vehiclesInShop} <span className="text-sm font-normal text-slate-500">Vehículos</span></h4>
                     </div>
                  </div>

                  <div className="bg-[#1a2533]/50 p-5 rounded-xl border border-slate-800 flex items-center gap-4">
                     <div className="p-3 bg-slate-500/10 rounded-lg">
                        <span className="material-icons-round text-slate-400">equalizer</span>
                     </div>
                     <div>
                        <p className="text-xs text-slate-500 font-bold uppercase">Ratio Coste/Ingreso</p>
                        <h4 className="text-lg font-bold text-white">{fuelCostPercentage.toFixed(1)}%</h4>
                     </div>
                  </div>
               </div>

               <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Expense Breakdown */}
                  <div className="bg-[#1a2533] rounded-xl border border-slate-700 p-6 lg:col-span-2">
                     <h3 className="text-lg font-bold text-white mb-6">Desglose de Gastos Recientes</h3>
                     <div className="overflow-x-auto custom-scrollbar">
                        <div className="min-w-[600px]">
                           <table className="w-full text-left text-sm">
                              <thead className="text-xs text-slate-500 uppercase border-b border-slate-700">
                                 <tr>
                                    <th className="pb-3">Fecha</th>
                                    <th className="pb-3">Concepto</th>
                                    <th className="pb-3">Vehículo</th>
                                    <th className="pb-3">Categoría</th>
                                    <th className="pb-3 text-right">Importe</th>
                                 </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-800">
                                 {recentExpenses.length > 0 ? recentExpenses.map((item, i) => (
                                    <tr key={item.id || i} className="hover:bg-slate-800/30">
                                       <td className="py-3 text-slate-400">{item.date}</td>
                                       <td className="py-3 text-white font-medium">{item.desc}</td>
                                       <td className="py-3 text-slate-300">{item.ref}</td>
                                       <td className="py-3">
                                          <span className="px-2 py-0.5 bg-slate-800 text-slate-400 rounded text-xs border border-slate-700">{item.cat}</span>
                                       </td>
                                       <td className="py-3 text-right font-mono text-white">{item.amount}</td>
                                    </tr>
                                 )) : (
                                    <tr>
                                       <td colSpan={5} className="py-8 text-center text-slate-500 italic">No hay gastos recientes en este periodo.</td>
                                    </tr>
                                 )}
                              </tbody>
                           </table>
                        </div>
                     </div>
                  </div>

                  {/* Vehicle Profitability Graph */}
                  <div className="bg-[#1a2533] rounded-xl border border-slate-700 p-6 flex flex-col">
                     <h3 className="text-lg font-bold text-white mb-2">Rentabilidad por Vehículo</h3>
                     <p className="text-xs text-slate-500 mb-6">Top 3 vehículos más rentables</p>

                     <div className="space-y-6 flex-1 flex flex-col justify-center min-h-[150px]">
                        {vehicleProfitability.length > 0 ? vehicleProfitability.map((item, i) => (
                           <div key={item.id || i}>
                              <div className="flex justify-between text-sm mb-1">
                                 <span className="text-white">{item.name} ({item.plate})</span>
                                 <span className="text-emerald-400 font-bold">{formatCurrency(item.profit)}</span>
                              </div>
                              <div className="w-full bg-slate-800 rounded-full h-2">
                                 <div className={`h-2 rounded-full ${i === 0 ? 'bg-emerald-500' : i === 1 ? 'bg-blue-500' : 'bg-amber-500'}`} style={{ width: `${Math.min(100, Math.max(0, item.profitPercentage))}%` }}></div>
                              </div>
                           </div>
                        )) : (
                           <div className="text-center text-slate-500 italic text-sm">
                              No hay suficientes datos de rentabilidad.
                           </div>
                        )}
                     </div>
                  </div>
               </div>

            </div>
         </div>
      </div>
   );
};
