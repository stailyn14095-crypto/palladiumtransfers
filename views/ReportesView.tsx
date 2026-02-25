import React from 'react';

export const ReportesView: React.FC = () => {
   return (
      <div className="flex-1 flex flex-col h-full bg-[#101822] overflow-hidden">
         <header className="min-h-[5rem] border-b border-slate-800 bg-[#1a2533] px-4 md:px-8 py-4 md:py-0 flex flex-col md:flex-row items-start md:items-center justify-between shrink-0 gap-4 md:gap-0">
            <div>
               <h1 className="text-xl font-bold text-white">Reportes Financieros</h1>
               <p className="text-xs text-slate-500">Ingresos, Gastos y Beneficios de Flota</p>
            </div>
            <div className="flex flex-wrap gap-3 w-full md:w-auto">
               <select className="flex-1 md:flex-none bg-[#101822] border border-slate-700 text-white text-sm rounded-lg px-3 py-2 outline-none">
                  <option>Este Mes (Octubre)</option>
                  <option>Mes Pasado (Septiembre)</option>
                  <option>Año Actual (YTD)</option>
               </select>
               <button className="w-full md:w-auto justify-center bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2">
                  <span className="material-icons-round text-sm">download</span> Exportar
               </button>
            </div>
         </header>

         <div className="p-8 overflow-y-auto">
            <div className="max-w-7xl mx-auto space-y-8">

               {/* KPI Cards */}
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="bg-[#1a2533] p-6 rounded-xl border border-slate-700">
                     <div className="flex justify-between items-start mb-2">
                        <p className="text-xs font-bold text-slate-400 uppercase">Ingresos Totales</p>
                        <span className="material-icons-round text-emerald-500 bg-emerald-500/10 p-1.5 rounded-lg text-lg">payments</span>
                     </div>
                     <h3 className="text-2xl font-bold text-white">24,592.00 €</h3>
                     <p className="text-xs text-emerald-400 mt-2 flex items-center gap-1">
                        <span className="material-icons-round text-sm">trending_up</span> +12.5% vs mes anterior
                     </p>
                  </div>

                  <div className="bg-[#1a2533] p-6 rounded-xl border border-slate-700">
                     <div className="flex justify-between items-start mb-2">
                        <p className="text-xs font-bold text-slate-400 uppercase">Gasto Combustible/Carga</p>
                        <span className="material-icons-round text-amber-500 bg-amber-500/10 p-1.5 rounded-lg text-lg">local_gas_station</span>
                     </div>
                     <h3 className="text-2xl font-bold text-white">3,240.50 €</h3>
                     <p className="text-xs text-slate-400 mt-2">13.1% de los ingresos</p>
                  </div>

                  <div className="bg-[#1a2533] p-6 rounded-xl border border-slate-700">
                     <div className="flex justify-between items-start mb-2">
                        <p className="text-xs font-bold text-slate-400 uppercase">Mantenimiento</p>
                        <span className="material-icons-round text-blue-500 bg-blue-500/10 p-1.5 rounded-lg text-lg">build</span>
                     </div>
                     <h3 className="text-2xl font-bold text-white">850.00 €</h3>
                     <p className="text-xs text-slate-400 mt-2">2 vehículos en taller</p>
                  </div>

                  <div className="bg-[#1a2533] p-6 rounded-xl border border-slate-700 relative overflow-hidden">
                     <div className="absolute right-0 top-0 w-16 h-16 bg-emerald-500/20 rounded-bl-full"></div>
                     <div className="flex justify-between items-start mb-2 relative z-10">
                        <p className="text-xs font-bold text-slate-400 uppercase">Beneficio Neto</p>
                        <span className="material-icons-round text-emerald-400 bg-emerald-500/10 p-1.5 rounded-lg text-lg">account_balance_wallet</span>
                     </div>
                     <h3 className="text-2xl font-bold text-emerald-400 relative z-10">20,501.50 €</h3>
                     <p className="text-xs text-slate-400 mt-2 relative z-10">Margen neto: 83.3%</p>
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
                                    <th className="pb-3">Vehículo / Conductor</th>
                                    <th className="pb-3">Categoría</th>
                                    <th className="pb-3 text-right">Importe</th>
                                 </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-800">
                                 {[
                                    { date: '24 Oct', desc: 'Repostaje Diesel', ref: '2412 KLP (C. Ruiz)', cat: 'Combustible', amount: '85.50 €' },
                                    { date: '23 Oct', desc: 'Carga Supercharger', ref: '3321 JKL (E. Gomez)', cat: 'Electricidad', amount: '22.10 €' },
                                    { date: '22 Oct', desc: 'Cambio Neumáticos', ref: '9982 BBC (M. Torres)', cat: 'Mantenimiento', amount: '450.00 €' },
                                    { date: '22 Oct', desc: 'Lavado Exterior', ref: '2412 KLP (C. Ruiz)', cat: 'Limpieza', amount: '15.00 €' },
                                 ].map((item, i) => (
                                    <tr key={i} className="hover:bg-slate-800/30">
                                       <td className="py-3 text-slate-400">{item.date}</td>
                                       <td className="py-3 text-white font-medium">{item.desc}</td>
                                       <td className="py-3 text-slate-300">{item.ref}</td>
                                       <td className="py-3">
                                          <span className="px-2 py-0.5 bg-slate-800 text-slate-400 rounded text-xs border border-slate-700">{item.cat}</span>
                                       </td>
                                       <td className="py-3 text-right font-mono text-white">{item.amount}</td>
                                    </tr>
                                 ))}
                              </tbody>
                           </table>
                        </div>
                     </div>
                  </div>

                  {/* Simple Graph Simulation */}
                  <div className="bg-[#1a2533] rounded-xl border border-slate-700 p-6 flex flex-col">
                     <h3 className="text-lg font-bold text-white mb-2">Rentabilidad por Vehículo</h3>
                     <p className="text-xs text-slate-500 mb-6">Top 3 vehículos más rentables este mes</p>

                     <div className="space-y-6 flex-1">
                        <div>
                           <div className="flex justify-between text-sm mb-1">
                              <span className="text-white">Mercedes S-Class (2412 KLP)</span>
                              <span className="text-emerald-400 font-bold">4,200 €</span>
                           </div>
                           <div className="w-full bg-slate-800 rounded-full h-2">
                              <div className="bg-emerald-500 h-2 rounded-full" style={{ width: '85%' }}></div>
                           </div>
                        </div>
                        <div>
                           <div className="flex justify-between text-sm mb-1">
                              <span className="text-white">Tesla Model X (3321 JKL)</span>
                              <span className="text-emerald-400 font-bold">3,850 €</span>
                           </div>
                           <div className="w-full bg-slate-800 rounded-full h-2">
                              <div className="bg-blue-500 h-2 rounded-full" style={{ width: '75%' }}></div>
                           </div>
                        </div>
                        <div>
                           <div className="flex justify-between text-sm mb-1">
                              <span className="text-white">Mercedes V-Class (9982 BBC)</span>
                              <span className="text-emerald-400 font-bold">3,100 €</span>
                           </div>
                           <div className="w-full bg-slate-800 rounded-full h-2">
                              <div className="bg-amber-500 h-2 rounded-full" style={{ width: '60%' }}></div>
                           </div>
                        </div>
                     </div>
                  </div>
               </div>

            </div>
         </div>
      </div>
   );
};
