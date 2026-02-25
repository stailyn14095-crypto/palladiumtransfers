import React from 'react';

export const ApiConfigView: React.FC = () => {
   return (
      <div className="flex-1 flex flex-col h-full bg-brand-black overflow-hidden relative">
         <header className="min-h-[5rem] border-b border-white/5 bg-brand-charcoal px-4 md:px-8 py-4 md:py-0 flex flex-col md:flex-row items-start md:items-center justify-between shrink-0 gap-4 md:gap-0">
            <div>
               <h1 className="text-xl font-bold text-white tracking-tight">Integraciones API</h1>
               <p className="text-[10px] text-brand-platinum/50 uppercase font-bold tracking-widest">Gestión de conexiones con terceros</p>
            </div>
            <button className="w-full md:w-auto px-4 py-2 flex justify-center bg-brand-gold hover:bg-brand-gold/80 text-black rounded-lg text-sm font-bold shadow-lg transition-all active:scale-95">Guardar Cambios</button>
         </header>

         <div className="p-4 md:p-8 overflow-y-auto max-w-5xl mx-auto w-full custom-scrollbar">
            <div className="grid gap-6">

               {/* Government Integration */}
               <div className="bg-brand-charcoal border border-white/5 rounded-2xl p-6 shadow-xl relative overflow-hidden group">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0 mb-6">
                     <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center p-2">
                           <span className="material-icons-round text-slate-900 text-2xl">account_balance</span>
                        </div>
                        <div>
                           <h3 className="text-lg font-bold text-white">Ministerio de Fomento</h3>
                           <p className="text-sm text-slate-400">Registro de Comunicaciones VTC y Viajeros</p>
                        </div>
                     </div>
                     <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        <span className="text-sm text-emerald-500 font-medium">Conectado</span>
                     </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     <div>
                        <label className="block text-[10px] font-bold text-brand-platinum/50 uppercase mb-2 tracking-widest">Endpoint URL</label>
                        <input type="text" value="https://sede.fomento.gob.es/api/vtc/v1" readOnly className="w-full bg-brand-black border border-white/5 rounded-xl px-4 py-3 text-sm text-brand-platinum/70 focus:outline-none focus:border-brand-gold transition-colors" />
                     </div>
                     <div>
                        <label className="block text-[10px] font-bold text-brand-platinum/50 uppercase mb-2 tracking-widest">Certificado Digital</label>
                        <div className="flex items-center gap-2">
                           <input type="text" value="cert_palladium_2024.p12" readOnly className="flex-1 bg-brand-black border border-white/5 rounded-xl px-4 py-3 text-sm text-brand-platinum/70 focus:outline-none focus:border-brand-gold transition-colors" />
                           <button className="p-3 bg-brand-charcoal border border-white/5 rounded-xl text-brand-platinum/50 hover:text-white hover:bg-white/5 transition-colors"><span className="material-icons-round text-sm">upload_file</span></button>
                        </div>
                     </div>
                  </div>
               </div>

               {/* Booking.com */}
               <div className="bg-brand-charcoal border border-white/5 rounded-2xl p-6 shadow-xl relative overflow-hidden group">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0 mb-6">
                     <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-[#003580] rounded-lg flex items-center justify-center p-2">
                           <span className="font-bold text-white text-xl">B.</span>
                        </div>
                        <div>
                           <h3 className="text-lg font-bold text-white">Booking.com Transport</h3>
                           <p className="text-sm text-slate-400">Sincronización automática de reservas</p>
                        </div>
                     </div>
                     <div className="flex items-center gap-2">
                        <label className="relative inline-flex items-center cursor-pointer">
                           <input type="checkbox" className="sr-only peer" defaultChecked />
                           <div className="w-11 h-6 bg-white/5 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-gold"></div>
                        </label>
                     </div>
                  </div>
                  <div className="space-y-4">
                     <div>
                        <label className="block text-[10px] font-bold text-brand-platinum/50 uppercase mb-2 tracking-widest">Partner ID</label>
                        <input type="text" value="PARTNER_992120" className="w-full bg-brand-black border border-white/5 rounded-xl px-4 py-3 text-sm text-brand-platinum font-mono focus:outline-none focus:border-brand-gold transition-colors" />
                     </div>
                     <div>
                        <label className="block text-[10px] font-bold text-brand-platinum/50 uppercase mb-2 tracking-widest">API Key</label>
                        <input type="password" value="************************" className="w-full bg-brand-black border border-white/5 rounded-xl px-4 py-3 text-sm text-brand-platinum font-mono focus:outline-none focus:border-brand-gold transition-colors" />
                     </div>
                  </div>
               </div>

               {/* AENA */}
               <div className="bg-brand-charcoal border border-white/5 rounded-2xl p-6 opacity-75 shadow-xl relative overflow-hidden group">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0 mb-6">
                     <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center p-2">
                           <span className="material-icons-round text-slate-900 text-2xl">flight</span>
                        </div>
                        <div>
                           <h3 className="text-lg font-bold text-white">AENA Flight Info</h3>
                           <p className="text-[10px] text-brand-platinum/50 uppercase font-bold tracking-widest mt-1">Datos de vuelo en tiempo real (Premium)</p>
                        </div>
                     </div>
                     <div className="flex items-center gap-2">
                        <button className="text-[10px] font-bold uppercase tracking-widest bg-white/5 text-brand-platinum/50 px-4 py-2 rounded-full border border-white/5 hover:bg-white/10 transition-colors">Configurar</button>
                     </div>
                  </div>
               </div>

            </div>
         </div>
      </div>
   );
};
