import re
import os

filepath = r"j:\PALLADIUM TRANSFERS\palladium-operations-hub\views\DriverAppView.tsx"

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. ADD IMPORTS
if "import { jsPDF } from 'jspdf'" not in content:
    content = content.replace("import { buildFomentoPayload } from '../utils/fomentoHelper';", 
                              "import { buildFomentoPayload } from '../utils/fomentoHelper';\nimport { jsPDF } from 'jspdf';")

# 2. ADD STATE VARIABLES
if "const [cartelModalOpen" not in content:
    state_vars = """
   // Cartel Modal State
   const [cartelModalOpen, setCartelModalOpen] = useState(false);
   const [cartelData, setCartelData] = useState({ passenger: '', subtitle: '', logoDataUrl: '' });
   const [cartelBookingId, setCartelBookingId] = useState<string | null>(null);
   const [upcomingCollapsed, setUpcomingCollapsed] = useState(false);
"""
    content = content.replace("const [isSubscribed, setIsSubscribed] = useState(false);", 
                              state_vars + "\n   const [isSubscribed, setIsSubscribed] = useState(false);")

# 3. COMPARTIR COCHE LOGIC & YESTERDAY/TODAY/TOMORROW FILTERING
old_bookings_logic = """   const driverBookings = allBookings?.filter((b: any) => b.driver_id === selectedDriverId && b.status !== 'Completed' && b.status !== 'Cancelled') || [];
   const completedThisWeek = allBookings?.filter((b: any) => {
      if (b.driver_id !== selectedDriverId || b.status !== 'Completed') return false;
      const bDate = new Date(b.pickup_date);
      const now = new Date();
      const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
      return bDate >= startOfWeek;
   }) || [];

   // Assigned vehicle for today
   const todayShift = shifts?.find((s: any) => {
      const today = new Date().toISOString().split('T')[0];
      return s.driver_id === selectedDriverId && s.date === today;
   });
   const assignedVehicle = vehicles?.find((v: any) => v.id === todayShift?.vehicle_id);"""

new_bookings_logic = """   const nowDate = new Date();
   const todayStr = nowDate.toISOString().split('T')[0];
   const yesterdayDate = new Date(nowDate); yesterdayDate.setDate(nowDate.getDate() - 1);
   const yesterdayStr = yesterdayDate.toISOString().split('T')[0];
   const tomorrowDate = new Date(nowDate); tomorrowDate.setDate(nowDate.getDate() + 1);
   const tomorrowStr = tomorrowDate.toISOString().split('T')[0];

   const driverBookings = allBookings?.filter((b: any) => {
      if (b.driver_id !== selectedDriverId) return false;
      if (b.status === 'Completed' || b.status === 'Cancelled') return false;
      const bDate = b.pickup_date.split('T')[0];
      return bDate === yesterdayStr || bDate === todayStr || bDate === tomorrowStr;
   }) || [];

   const completedThisWeek = allBookings?.filter((b: any) => {
      if (b.driver_id !== selectedDriverId || b.status !== 'Completed') return false;
      const bDate = new Date(b.pickup_date);
      const now = new Date();
      const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
      return bDate >= startOfWeek;
   }) || [];

   // Assigned vehicle for today
   const todayShift = shifts?.find((s: any) => {
      const today = new Date().toISOString().split('T')[0];
      return s.driver_id === selectedDriverId && s.date === today;
   });
   const assignedVehicle = vehicles?.find((v: any) => v.id === todayShift?.vehicle_id);

   // Compartir Coche Logic
   const sharedVehicleAlerts: string[] = [];
   if (assignedVehicle && shifts) {
      const sharedShifts = shifts.filter((s: any) => 
         s.vehicle_id === assignedVehicle.id && 
         s.driver_id !== selectedDriverId && 
         (s.date === todayStr || s.date === tomorrowStr)
      );

      if (sharedShifts.length > 0) {
         const driverNames = Array.from(new Set(sharedShifts.map((s: any) => {
             const d = drivers?.find((d: any) => d.id === s.driver_id);
             return d ? d.name.split(' ')[0] : 'Compañero';
         })));
         const daysArr = Array.from(new Set(sharedShifts.map((s: any) => s.date === todayStr ? 'hoy' : 'mañana')));
         sharedVehicleAlerts.push(`¡Atención! Compartes este vehículo ${daysArr.join(' y ')} con ${driverNames.join(', ')}.`);
      }
   }"""
content = content.replace(old_bookings_logic, new_bookings_logic)

# 4. GENERATE PDF FUNCTION
generate_pdf_func = """
   const generatePDF = () => {
      const doc = new jsPDF({ orientation: 'landscape' });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      // Background
      doc.setFillColor(15, 15, 15); // brand-black
      doc.rect(0, 0, pageWidth, pageHeight, 'F');

      if (cartelData.logoDataUrl) {
         try {
            doc.addImage(cartelData.logoDataUrl, 'PNG', pageWidth / 2 - 25, 20, 50, 50);
         } catch(e) {
            console.error("Error adding image to PDF", e);
         }
      } else {
         doc.setTextColor(197, 160, 89); // brand-gold
         doc.setFontSize(24);
         doc.text("PALLADIUM TRANSFERS", pageWidth / 2, 40, { align: 'center' });
      }

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(48);
      doc.text(cartelData.passenger.toUpperCase(), pageWidth / 2, pageHeight / 2 + 10, { align: 'center' });

      if (cartelData.subtitle) {
         doc.setTextColor(197, 160, 89);
         doc.setFontSize(24);
         doc.text(cartelData.subtitle, pageWidth / 2, pageHeight / 2 + 40, { align: 'center' });
      }

      window.open(doc.output('bloburl'), '_blank');
      setCartelModalOpen(false);
   };
"""
if "const generatePDF =" not in content:
    content = content.replace("const finalizeService = async () => {", generate_pdf_func + "\n   const finalizeService = async () => {")


# 5. RENDER SHARED VEHICLE ALERTS
assigned_vehicle_jsx_old = """            {/* Assigned Vehicle */}
            <div className="mb-8 p-6 bg-brand-black/40 rounded-3xl border border-white/5 flex items-center gap-5 group hover:border-brand-gold/20 transition-all duration-500">
               <div className="w-14 h-14 bg-brand-gold/10 rounded-2xl flex items-center justify-center text-brand-gold border border-brand-gold/10 group-hover:bg-brand-gold group-hover:text-black transition-all">
                  <span className="material-icons-round text-2xl">directions_car</span>
               </div>
               <div>
                  <p className="text-[9px] font-bold text-brand-platinum uppercase tracking-[0.4em] mb-1.5 opacity-50">Vehículo Asignado</p>
                  <p className="text-lg font-light text-white tracking-tight">{assignedVehicle ? `${assignedVehicle.model}` : 'Sin vehículo asignado'} <span className="font-bold text-brand-gold ml-2">{assignedVehicle?.plate}</span></p>
               </div>
            </div>"""

assigned_vehicle_jsx_new = """            {/* Assigned Vehicle */}
            <div className="mb-8">
               <div className="p-6 bg-brand-black/40 rounded-3xl border border-white/5 flex items-center gap-5 group hover:border-brand-gold/20 transition-all duration-500">
                  <div className="w-14 h-14 bg-brand-gold/10 rounded-2xl flex items-center justify-center text-brand-gold border border-brand-gold/10 group-hover:bg-brand-gold group-hover:text-black transition-all">
                     <span className="material-icons-round text-2xl">directions_car</span>
                  </div>
                  <div>
                     <p className="text-[9px] font-bold text-brand-platinum uppercase tracking-[0.4em] mb-1.5 opacity-50">Vehículo Asignado</p>
                     <p className="text-lg font-light text-white tracking-tight">{assignedVehicle ? `${assignedVehicle.model}` : 'Sin vehículo asignado'} <span className="font-bold text-brand-gold ml-2">{assignedVehicle?.plate}</span></p>
                  </div>
               </div>
               {sharedVehicleAlerts.map((alert, idx) => (
                  <div key={idx} className="mt-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center gap-3 animate-pulse">
                     <span className="material-icons-round text-amber-500 text-sm">warning</span>
                     <p className="text-amber-500 text-[10px] font-bold uppercase tracking-widest">{alert}</p>
                  </div>
               ))}
            </div>"""
content = content.replace(assigned_vehicle_jsx_old, assigned_vehicle_jsx_new)

# 6. ADJUST SERVICE CARD UI
card_ui_old = """                                       <h3 className="text-4xl font-light text-white tracking-tighter uppercase group-hover:platinum-text transition-all leading-tight">{currentBooking.passenger}</h3>
                                       <p className="text-brand-platinum text-[10px] font-bold tracking-[0.3em] flex items-center gap-2 uppercase opacity-50 mt-1">
                                          <span className="material-icons-round text-xs">phone</span> {currentBooking.phone || 'No disponible'}
                                          <span className="ml-4 opacity-30 tracking-[0.5em]">ID: #{currentBooking.display_id || currentBooking.id.slice(0, 6)}</span>
                                       </p>
                                       {renderExtrasIcons(currentBooking.notes)}
                                    </div>
                                    <span className={`px-4 py-1.5 rounded-full text-[8px] font-bold uppercase tracking-[0.2em] border ${currentBooking.status === 'Pending' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20 animate-pulse' : 'bg-white/5 text-brand-platinum border-white/10'}`}>
                                       {currentBooking.status}
                                    </span>
                                 </div>

                                 <div className="grid md:grid-cols-2 gap-8 mb-10">
                                    <div className="space-y-6">
                                       <div className="flex items-start gap-4 group/loc">
                                          <div className="w-1.5 h-1.5 rounded-full bg-brand-platinum mt-1.5 shrink-0 shadow-[0_0_8px_rgba(142,145,150,0.5)]"></div>
                                          <div>
                                             <p className="text-brand-platinum/40 uppercase font-bold text-[8px] tracking-[0.3em] mb-1.5">Recogida</p>
                                             <p className="text-slate-200 font-light text-sm leading-relaxed tracking-tight group-hover/loc:text-white transition-colors">{currentBooking.origin_address || currentBooking.origin}</p>
                                          </div>
                                       </div>
                                       <div className="flex items-start gap-4 group/loc">
                                          <div className="w-1.5 h-1.5 rounded-full bg-brand-gold mt-1.5 shrink-0 shadow-[0_0_8px_rgba(197,160,89,0.5)]"></div>
                                          <div>
                                             <p className="text-brand-gold/40 uppercase font-bold text-[8px] tracking-[0.3em] mb-1.5">Destino</p>
                                             <p className="text-slate-200 font-light text-sm leading-relaxed tracking-tight group-hover/loc:text-white transition-colors">{currentBooking.destination_address || currentBooking.destination}</p>
                                          </div>
                                       </div>
                                    </div>
                                 </div>

                                 <div className="grid grid-cols-2 gap-4 mb-10">
                                    <div className="bg-brand-black/30 backdrop-blur-md p-5 rounded-[2rem] border border-white/5 col-span-2 hover:border-white/10 transition-all">
                                       <p className="text-[8px] font-bold text-brand-platinum uppercase tracking-[0.3em] mb-2 opacity-50 italic">Pasajeros</p>
                                       <p className="text-sm font-light text-white flex items-center gap-2 tracking-tight">
                                          <span className="material-icons-round text-sm opacity-50">groups</span> {currentBooking.pax || 1} <span className="font-bold text-brand-platinum/50 uppercase text-[10px] tracking-widest">PAX</span>
                                       </p>
                                    </div>
                                    {currentBooking.flight_number && (
                                       <div className="bg-brand-black/30 backdrop-blur-md p-5 rounded-[2rem] border border-white/5 hover:border-white/10 transition-all col-span-2">
                                          <p className="text-[8px] font-bold text-brand-platinum uppercase tracking-[0.3em] mb-2 opacity-50 italic">Vuelo</p>
                                          <p className="text-sm font-light text-white flex items-center gap-2 tracking-tight uppercase">
                                             <span className="material-icons-round text-sm opacity-50">flight</span> {currentBooking.flight_number}
                                          </p>
                                       </div>
                                    )}
                                 </div>"""

card_ui_new = """                                       <h3 className="text-lg font-bold text-white tracking-widest uppercase group-hover:platinum-text transition-all leading-tight">{currentBooking.passenger}</h3>
                                       <div className="flex items-center gap-3 mt-1">
                                          <p className="text-brand-platinum text-[10px] font-bold tracking-[0.3em] flex items-center gap-2 uppercase opacity-50">
                                             <span className="material-icons-round text-xs">phone</span> {currentBooking.phone || 'No disponible'}
                                             <span className="ml-2 opacity-30 tracking-[0.5em]">ID: #{currentBooking.display_id || currentBooking.id.slice(0, 6)}</span>
                                          </p>
                                          <div className="flex items-center gap-1 bg-white/5 px-2 py-0.5 rounded-lg border border-white/10">
                                             <span className="material-icons-round text-[10px] text-white">groups</span>
                                             <span className="text-[10px] font-bold text-white uppercase">{currentBooking.pax || 1} PAX</span>
                                          </div>
                                       </div>
                                       {renderExtrasIcons(currentBooking.notes)}
                                    </div>
                                    <div className="flex flex-col items-end gap-2">
                                       <span className={`px-4 py-1.5 rounded-full text-[8px] font-bold uppercase tracking-[0.2em] border ${currentBooking.status === 'Pending' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20 animate-pulse' : 'bg-white/5 text-brand-platinum border-white/10'}`}>
                                          {currentBooking.status}
                                       </span>
                                       <button 
                                          onClick={() => {
                                             setCartelData({ passenger: currentBooking.passenger, subtitle: '', logoDataUrl: '' });
                                             setCartelBookingId(currentBooking.id);
                                             setCartelModalOpen(true);
                                          }}
                                          className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-gold/10 border border-brand-gold/20 text-brand-gold rounded-full hover:bg-brand-gold hover:text-black transition-all"
                                       >
                                          <span className="material-icons-round text-[10px]">edit_document</span>
                                          <span className="text-[8px] font-black uppercase tracking-widest">Cartel PDF</span>
                                       </button>
                                    </div>
                                 </div>

                                 <div className="grid md:grid-cols-2 gap-8 mb-10">
                                    <div className="space-y-6">
                                       <div className="flex items-start gap-4 group/loc">
                                          <div className="w-1.5 h-1.5 rounded-full bg-brand-platinum mt-1.5 shrink-0 shadow-[0_0_8px_rgba(142,145,150,0.5)]"></div>
                                          <div>
                                             <p className="text-brand-platinum/40 uppercase font-bold text-[8px] tracking-[0.3em] mb-1.5">Recogida</p>
                                             <p className="text-slate-200 font-light text-sm leading-relaxed tracking-tight group-hover/loc:text-white transition-colors">{currentBooking.origin_address || currentBooking.origin}</p>
                                          </div>
                                       </div>
                                       <div className="flex items-start gap-4 group/loc">
                                          <div className="w-1.5 h-1.5 rounded-full bg-brand-gold mt-1.5 shrink-0 shadow-[0_0_8px_rgba(197,160,89,0.5)]"></div>
                                          <div>
                                             <p className="text-brand-gold/40 uppercase font-bold text-[8px] tracking-[0.3em] mb-1.5">Destino</p>
                                             <p className="text-slate-200 font-light text-sm leading-relaxed tracking-tight group-hover/loc:text-white transition-colors">{currentBooking.destination_address || currentBooking.destination}</p>
                                          </div>
                                       </div>
                                    </div>
                                 </div>

                                 <div className="grid grid-cols-2 gap-4 mb-6">
                                    {currentBooking.flight_number && (
                                       <div className="bg-brand-black/30 backdrop-blur-md p-5 rounded-[2rem] border border-white/5 hover:border-white/10 transition-all col-span-2">
                                          <p className="text-[8px] font-bold text-brand-platinum uppercase tracking-[0.3em] mb-2 opacity-50 italic">Vuelo</p>
                                          <p className="text-sm font-light text-white flex items-center gap-2 tracking-tight uppercase">
                                             <span className="material-icons-round text-sm opacity-50">flight</span> {currentBooking.flight_number}
                                          </p>
                                       </div>
                                    )}
                                 </div>"""
content = content.replace(card_ui_old, card_ui_new)

# 7. UPDATE PROXIMOS SERVICIOS
proximos_old = """                        {/* UPCOMING BOOKINGS */}
                        {upcomingBookings.length > 0 && (
                           <div>
                              <div className="flex items-center gap-4 mb-4">
                                 <div className="w-8 h-px bg-brand-platinum opacity-30"></div>
                                 <h2 className="text-[9px] font-bold text-brand-platinum uppercase tracking-[0.5em]">Próximos Servicios</h2>
                              </div>
                              <div className="space-y-3">
                                 {upcomingBookings.map((b: any) => (
                                    <div key={b.id} className="flex items-center justify-between p-4 bg-brand-charcoal/20 border border-white/5 rounded-2xl">
                                       <div className="flex items-center gap-4">
                                          <div className="text-center px-3 border-r border-white/10">
                                             <p className="text-[10px] text-brand-platinum uppercase font-bold">{b.pickup_time}</p>
                                          </div>
                                          <div>
                                             <p className="text-xs text-white font-bold tracking-widest uppercase">{b.passenger}</p>
                                             <p className="text-[9px] text-brand-platinum/50 uppercase truncate max-w-[150px] sm:max-w-[250px]">{b.origin} → {b.destination}</p>
                                          </div>
                                       </div>
                                       <span className="px-2 py-1 bg-white/5 rounded-lg text-[8px] uppercase tracking-widest text-brand-platinum">{b.status}</span>
                                    </div>
                                 ))}
                              </div>
                           </div>
                        )}"""

proximos_new = """                        {/* UPCOMING BOOKINGS (Grouped) */}
                        {upcomingBookings.length > 0 && (
                           <div>
                              <div 
                                 className="flex items-center justify-between mb-4 cursor-pointer group"
                                 onClick={() => setUpcomingCollapsed(!upcomingCollapsed)}
                              >
                                 <div className="flex items-center gap-4">
                                    <div className="w-8 h-px bg-brand-platinum opacity-30 group-hover:bg-brand-gold transition-colors"></div>
                                    <h2 className="text-[9px] font-bold text-brand-platinum group-hover:text-brand-gold transition-colors uppercase tracking-[0.5em]">
                                       Próximos Servicios ({upcomingBookings.length})
                                    </h2>
                                 </div>
                                 <span className="material-icons-round text-brand-platinum/50 group-hover:text-brand-gold text-sm transition-all">
                                    {upcomingCollapsed ? 'expand_more' : 'expand_less'}
                                 </span>
                              </div>
                              
                              {!upcomingCollapsed && (
                                 <div className="space-y-6">
                                    {['Ayer', 'Hoy', 'Mañana'].map(dayGroup => {
                                       const targetStr = dayGroup === 'Ayer' ? yesterdayStr : dayGroup === 'Hoy' ? todayStr : tomorrowStr;
                                       const groupBookings = upcomingBookings.filter((b: any) => b.pickup_date.split('T')[0] === targetStr);
                                       if (groupBookings.length === 0) return null;
                                       
                                       return (
                                          <div key={dayGroup} className="space-y-3">
                                             <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest pl-2">
                                                {dayGroup} - {new Date(targetStr).toLocaleDateString('es-ES')}
                                             </p>
                                             {groupBookings.map((b: any) => (
                                                <div key={b.id} className="flex flex-col p-4 bg-brand-charcoal/20 border border-white/5 rounded-2xl relative overflow-hidden">
                                                   <div className="flex items-center justify-between mb-2">
                                                      <div className="flex items-center gap-4">
                                                         <div className="text-center px-3 border-r border-white/10">
                                                            <p className="text-[10px] text-brand-platinum uppercase font-bold">{b.pickup_time}</p>
                                                         </div>
                                                         <div>
                                                            <p className="text-xs text-white font-bold tracking-widest uppercase">{b.passenger}</p>
                                                            <div className="flex items-center gap-2 mt-1">
                                                               <span className="material-icons-round text-[10px] text-brand-platinum/50">route</span>
                                                               <p className="text-[9px] text-brand-platinum/50 uppercase truncate max-w-[150px] sm:max-w-[250px]">{b.origin} → {b.destination}</p>
                                                            </div>
                                                         </div>
                                                      </div>
                                                      <span className="px-2 py-1 bg-white/5 rounded-lg text-[8px] uppercase tracking-widest text-brand-platinum">{b.status}</span>
                                                   </div>
                                                   {(dayGroup === 'Hoy' || dayGroup === 'Mañana') && getTimeRemaining(b.pickup_date, b.pickup_time) && (
                                                      <div className="mt-2 text-right">
                                                         <span className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest bg-emerald-500/10 px-2 py-1 rounded">
                                                            {getTimeRemaining(b.pickup_date, b.pickup_time)}
                                                         </span>
                                                      </div>
                                                   )}
                                                   {b.notes && (
                                                      <div className="mt-3 p-2 bg-white/5 rounded-xl border border-white/5">
                                                         <p className="text-[8px] text-brand-gold uppercase tracking-widest mb-1">Notas:</p>
                                                         <p className="text-[9px] text-brand-platinum/70 italic leading-relaxed">{b.notes}</p>
                                                      </div>
                                                   )}
                                                </div>
                                             ))}
                                          </div>
                                       );
                                    })}
                                 </div>
                              )}
                           </div>
                        )}"""
content = content.replace(proximos_old, proximos_new)

# 8. ADD CARTEL MODAL at the bottom of the JSX before final </div>
cartel_modal_jsx = """
         {/* Cartel PDF Modal */}
         {cartelModalOpen && (
            <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
               <div className="bg-brand-charcoal border border-brand-gold/30 rounded-3xl w-full max-w-md p-6">
                  <h2 className="text-lg font-black text-brand-gold mb-2">Generar Cartel PDF</h2>
                  <p className="text-xs text-brand-platinum mb-6">
                     Diseña un cartel elegante para mostrar en la tablet al cliente en el aeropuerto.
                  </p>

                  <div className="space-y-4">
                     <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Nombre Pasajero</label>
                        <input type="text" value={cartelData.passenger} onChange={e => setCartelData({...cartelData, passenger: e.target.value})} className="w-full bg-slate-800 text-white p-3 rounded-xl border border-white/5 focus:border-brand-gold outline-none uppercase font-black" />
                     </div>
                     <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Subtítulo / Mensaje (Opcional)</label>
                        <input type="text" value={cartelData.subtitle} onChange={e => setCartelData({...cartelData, subtitle: e.target.value})} placeholder="Ej: VIP, Happy Birthday..." className="w-full bg-slate-800 text-white p-3 rounded-xl border border-white/5 focus:border-brand-gold outline-none" />
                     </div>
                     <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Logo / Imagen (Opcional)</label>
                        <input type="file" accept="image/*" onChange={(e) => {
                           const file = e.target.files?.[0];
                           if (file) {
                              const reader = new FileReader();
                              reader.onload = (ev) => {
                                 setCartelData({...cartelData, logoDataUrl: ev.target?.result as string});
                              };
                              reader.readAsDataURL(file);
                           }
                        }} className="w-full text-[10px] text-brand-platinum file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-[10px] file:font-bold file:bg-brand-gold/10 file:text-brand-gold hover:file:bg-brand-gold/20 cursor-pointer"/>
                     </div>
                  </div>

                  <div className="flex gap-3 mt-8">
                     <button onClick={() => setCartelModalOpen(false)} className="flex-1 bg-white/5 text-white font-bold p-3 rounded-xl hover:bg-white/10 transition text-[10px] uppercase tracking-widest">Cancelar</button>
                     <button onClick={generatePDF} className="flex-1 bg-brand-gold text-brand-black font-black uppercase tracking-widest p-3 rounded-xl hover:bg-yellow-500 transition text-[10px] flex items-center justify-center gap-2">
                        <span className="material-icons-round text-sm">print</span> Generar PDF
                     </button>
                  </div>
               </div>
            </div>
         )}
"""
content = content.replace("      </div>\n   );\n};\n", cartel_modal_jsx + "\n      </div>\n   );\n};\n")


with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated DriverAppView.tsx successfully")
