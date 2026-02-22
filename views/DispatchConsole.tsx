import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useSupabaseData } from '../hooks/useSupabaseData';
import { isDriverAvailable } from '../services/autoAssignment';

export const DispatchConsole: React.FC = () => {
   const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
   const { data: bookings, updateItem: updateBooking, loading: loadingBookings } = useSupabaseData('bookings');
   const { data: drivers, loading: loadingDrivers } = useSupabaseData('drivers');
   const { data: vehicles } = useSupabaseData('vehicles');
   const { data: shifts } = useSupabaseData('shifts');
   const [selectedBooking, setSelectedBooking] = useState<any>(null);
   const [searchQuery, setSearchQuery] = useState('');
   const [draggedBookingId, setDraggedBookingId] = useState<string | null>(null);
   const [dropTargetDriverId, setDropTargetDriverId] = useState<string | null>(null);

   const timelineRef = useRef<HTMLDivElement>(null);
   const HOURS = Array.from({ length: 24 }, (_, i) => i);
   const HOUR_WIDTH = 120; // px

   // Auto-scroll to current time on load (if today)
   useEffect(() => {
      if (selectedDate === new Date().toISOString().split('T')[0] && timelineRef.current) {
         const now = new Date();
         const currentHour = now.getHours();
         // Scroll to 1 hour before current time for context
         const targetScroll = Math.max(0, (currentHour - 1) * HOUR_WIDTH);

         timelineRef.current.scrollTo({
            left: targetScroll,
            behavior: 'smooth'
         });
      }
   }, [selectedDate]);

   const filteredBookings = useMemo(() => {
      if (!bookings) return [];
      return bookings.filter((b: any) => {
         if (!b.pickup_date) return false;
         const bookingDate = b.pickup_date.split(' ')[0].split('T')[0];
         return bookingDate === selectedDate;
      });
   }, [bookings, selectedDate]);

   const filteredDrivers = useMemo(() => {
      if (!drivers) return [];
      const activeDrivers = drivers.filter((d: any) => d.current_status === 'Working' || d.current_status === 'Paused');
      if (!searchQuery) return activeDrivers;

      return activeDrivers.filter((d: any) =>
         d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
         (d.plate && d.plate.toLowerCase().includes(searchQuery.toLowerCase()))
      );
   }, [drivers, searchQuery]);

   const handleReassign = async (bookingId: string, newDriverId: string) => {
      const newDriver = drivers?.find((d: any) => d.id === newDriverId);
      if (!newDriver) return;

      const booking = bookings?.find((b: any) => b.id === bookingId);
      if (booking) {
         const isAvailable = isDriverAvailable(newDriver, null, booking, bookings || [], []);
         if (!isAvailable) {
            if (!confirm(`ADVERTENCIA: ${newDriver.name} puede no llegar a tiempo según las políticas (1h espera aeropuerto + trayecto). ¿Reasignar de todos modos?`)) {
               return;
            }
         }
      }

      await updateBooking(bookingId, {
         driver_id: newDriverId,
         assigned_driver_name: newDriver.name,
         status: 'Pending'
      });
   };

   const getBookingStyle = (pickupTime: string) => {
      try {
         const [hours, minutes] = pickupTime.split(':').map(Number);
         const left = (hours * HOUR_WIDTH) + (minutes / 60 * HOUR_WIDTH);
         return { left: `${left}px`, width: '180px' };
      } catch (e) {
         return { left: '0px', width: '100px', display: 'none' };
      }
   };

   const handlePrevDay = () => {
      const d = new Date(selectedDate);
      d.setDate(d.getDate() - 1);
      setSelectedDate(d.toISOString().split('T')[0]);
   };

   const handleNextDay = () => {
      const d = new Date(selectedDate);
      d.setDate(d.getDate() + 1);
      setSelectedDate(d.toISOString().split('T')[0]);
   };

   const currentTimePosition = () => {
      const now = new Date();
      const h = now.getHours();
      const m = now.getMinutes();
      return (h * HOUR_WIDTH) + (m / 60 * HOUR_WIDTH);
   };

   return (
      <div className="flex flex-col h-full bg-brand-black text-slate-200">
         {/* Header */}
         <header className="h-20 shrink-0 bg-brand-charcoal border-b border-white/5 flex items-center justify-between px-8 z-20 shadow-xl">
            <div className="flex items-center gap-6">
               <div>
                  <h1 className="text-xl font-black text-white leading-tight tracking-tight">Consola de Despacho</h1>
                  <p className="text-[10px] text-brand-gold font-black uppercase tracking-widest">Operaciones en Tiempo Real</p>
               </div>
               <div className="h-10 bg-brand-black rounded-xl flex items-center p-1 border border-white/5 ml-6">
                  <button onClick={handlePrevDay} className="w-8 h-8 rounded-lg flex items-center justify-center text-brand-platinum/50 hover:text-white transition-all hover:bg-white/5">
                     <span className="material-icons-round text-sm">chevron_left</span>
                  </button>
                  <span className="px-6 text-xs font-black text-white flex items-center gap-3 uppercase tracking-wider">
                     <span className="material-icons-round text-base text-brand-gold">calendar_today</span>
                     {new Date(selectedDate).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })}
                  </span>
                  <button onClick={handleNextDay} className="w-8 h-8 rounded-lg flex items-center justify-center text-brand-platinum/50 hover:text-white transition-all hover:bg-white/5">
                     <span className="material-icons-round text-sm">chevron_right</span>
                  </button>
               </div>
            </div>
            <div className="flex items-center gap-4">
               <div className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                  <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">{filteredDrivers.length} Conductores Activos</span>
               </div>
            </div>
         </header>

         {/* Main Content */}
         <div className="flex-1 flex overflow-hidden">
            {/* Drivers List */}
            <div className="w-72 shrink-0 bg-brand-charcoal border-r border-white/5 flex flex-col z-20 shadow-2xl">
               <div className="p-4 border-b border-white/5 bg-brand-charcoal/80">
                  <input
                     type="text"
                     placeholder="Buscar flota..."
                     value={searchQuery}
                     onChange={(e) => setSearchQuery(e.target.value)}
                     className="w-full bg-brand-black border border-white/5 rounded-xl py-2.5 px-4 text-xs text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  />
               </div>
               <div className="flex-1 overflow-y-auto custom-scrollbar">
                  {loadingDrivers ? (
                     <div className="p-8 text-center text-brand-platinum/30 text-xs font-bold animate-pulse">Sincronizando flota...</div>
                  ) : filteredDrivers.length === 0 ? (
                     <div className="p-10 text-center">
                        <span className="material-icons-round text-brand-platinum/20 text-4xl mb-4">no_accounts</span>
                        <p className="text-xs text-brand-platinum/30 font-bold uppercase tracking-tighter">Sin servicios asignados</p>
                     </div>
                  ) : filteredDrivers.map((d: any) => (
                     <div key={d.id} className="h-24 px-5 border-b border-white/5/50 flex items-center gap-4 hover:bg-blue-600/5 cursor-pointer transition-all group">
                        <div className="relative">
                           <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center text-white font-black text-lg ring-2 ring-white/5 group-hover:ring-blue-500 transition-all">
                              {d.name.charAt(0)}
                           </div>
                           <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-lg border-2 border-[#1a2533] bg-emerald-500 shadow-lg"></span>
                        </div>
                        <div className="flex-1 min-w-0">
                           <h3 className="text-sm font-black text-white truncate leading-tight mb-0.5">{d.name}</h3>
                           <p className="text-[10px] text-brand-platinum/30 font-bold uppercase tracking-tight">{d.license || 'VTC Profesional'}</p>
                           <div className="flex items-center gap-2 mt-2">
                              <span className="text-[9px] font-black text-brand-gold bg-blue-400/10 px-1.5 py-0.5 rounded-md border border-blue-400/20 uppercase tracking-tighter">
                                 {filteredBookings.filter(b => b.driver_id === d.id).length} Viajes
                              </span>
                           </div>
                        </div>
                     </div>
                  ))}
               </div>
            </div>

            {/* Timeline Area */}
            <div ref={timelineRef} className="flex-1 overflow-x-auto bg-brand-black relative flex flex-col custom-scrollbar">
               {/* Time Header */}
               <div className="h-14 flex items-center border-b border-white/5 sticky top-0 bg-brand-black/95 backdrop-blur-md z-10" style={{ width: HOURS.length * HOUR_WIDTH }}>
                  {HOURS.map((h) => (
                     <div key={h} className="shrink-0 text-[10px] text-brand-platinum/30 font-black uppercase tracking-widest pl-4 border-l border-white/5 h-14 flex items-center" style={{ width: HOUR_WIDTH }}>
                        {h.toString().padStart(2, '0')}:00
                     </div>
                  ))}
               </div>

               {/* Current Time Line */}
               {selectedDate === new Date().toISOString().split('T')[0] && (
                  <div className="absolute top-14 bottom-0 w-px bg-rose-500 z-30 pointer-events-none shadow-[0_0_15px_rgba(244,63,94,0.6)]" style={{ left: currentTimePosition() }}>
                     <div className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-rose-500 rounded-full ring-4 ring-rose-500/20"></div>
                  </div>
               )}

               {/* Grid & Bookings */}
               <div className="flex-1 relative" style={{ width: HOURS.length * HOUR_WIDTH }}>
                  {filteredDrivers.map((d: any) => (
                     <div
                        key={d.id}
                        onDragOver={(e) => {
                           e.preventDefault();
                           if (draggedBookingId) setDropTargetDriverId(d.id);
                        }}
                        onDragLeave={() => setDropTargetDriverId(null)}
                        onDrop={(e) => {
                           e.preventDefault();
                           const bookingId = e.dataTransfer.getData('text');
                           setDropTargetDriverId(null);
                           setDraggedBookingId(null);
                           if (bookingId) handleReassign(bookingId, d.id);
                        }}
                        className={`h-24 border-b border-white/[0.03] relative flex items-center group transition-colors duration-200 ${dropTargetDriverId === d.id ? 'bg-blue-500/10' : ''}`}
                     >
                        {/* Grid Lines */}
                        <div className="absolute inset-0 flex pointer-events-none">
                           {HOURS.map((h) => <div key={h} className="shrink-0 border-l border-white/[0.02] h-full" style={{ width: HOUR_WIDTH }}></div>)}
                        </div>

                        {/* Real Bookings */}
                        {filteredBookings.filter(b => b.driver_id === d.id).map((b: any) => (
                           <div
                              key={b.id}
                              draggable
                              onDragStart={(e) => {
                                 e.dataTransfer.setData('text', b.id);
                                 e.dataTransfer.effectAllowed = 'move';
                                 setDraggedBookingId(b.id);
                              }}
                              onDragEnd={() => {
                                 setDraggedBookingId(null);
                                 setDropTargetDriverId(null);
                              }}
                              onClick={() => setSelectedBooking(b)}
                              style={getBookingStyle(b.pickup_time)}
                              className={`absolute h-14 bg-gradient-to-r ${draggedBookingId === b.id ? 'opacity-50 ring-2 ring-blue-500' : 'from-brand-gold to-[#B3932F]'
                                 } border border-white/10 rounded-[1.25rem] flex items-center px-4 gap-3 hover:scale-105 hover:shadow-2xl hover:shadow-blue-600/40 cursor-grab active:cursor-grabbing z-10 transition-all group/booking`}
                           >
                              <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center text-white shrink-0">
                                 <span className="material-icons-round text-sm">{b.origin.toLowerCase().includes('aeropuerto') ? 'flight_land' : 'location_on'}</span>
                              </div>
                              <div className="overflow-hidden flex-1">
                                 <div className="flex justify-between items-center gap-2">
                                    <p className="text-xs font-black text-white truncate leading-none">{b.passenger}</p>
                                    {(() => {
                                       const bDate = b.pickup_date ? b.pickup_date.split("T")[0] : null;
                                       const svcShift = bDate && shifts ? shifts.find((s: any) => s.driver_id === b.driver_id && s.date === bDate) : null;
                                       const svcVehicle = svcShift && vehicles ? vehicles.find((v: any) => v.id === svcShift.vehicle_id) : null;
                                       return svcVehicle ? (
                                          <span className="text-[8px] font-black bg-white/20 px-1 rounded text-white whitespace-nowrap">{svcVehicle.plate}</span>
                                       ) : null;
                                    })()}
                                 </div>
                                 <p className="text-[9px] text-white/60 font-medium truncate uppercase tracking-tighter mt-1">{b.origin} {"->"} {b.destination}</p>
                              </div>
                              {b.status === 'Completed' && <span className="material-icons-round text-xs text-emerald-400 absolute top-2 right-2">check_circle</span>}
                           </div>
                        ))}
                     </div>
                  ))}
               </div>
            </div>

            {/* Sidebar Detail (Conditional) */}
            {selectedBooking && (
               <div className="w-96 bg-brand-charcoal border-l border-white/5 h-full absolute right-0 top-0 shadow-[-20px_0_50px_rgba(0,0,0,0.5)] z-40 flex flex-col animate-in slide-in-from-right duration-300">
                  <div className="p-8 border-b border-white/5 bg-brand-charcoal/80">
                     <div className="flex justify-between items-start mb-6">
                        <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${selectedBooking.status === 'Completed' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-blue-500/10 text-brand-gold'
                           }`}>
                           {selectedBooking.status}
                        </div>
                        <button onClick={() => setSelectedBooking(null)} className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-brand-platinum/50 hover:text-white transition-all">
                           <span className="material-icons-round">close</span>
                        </button>
                     </div>
                     <h2 className="text-2xl font-black text-white mb-1 tracking-tighter">{selectedBooking.passenger}</h2>
                     <p className="text-xs text-brand-platinum/30 font-bold uppercase tracking-widest">Reserva #{selectedBooking.id.slice(0, 8)}</p>
                  </div>

                  <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar bg-brand-charcoal">
                     <div className="space-y-6">
                        <div className="flex items-start gap-4">
                           <div className="w-10 h-10 rounded-2xl bg-blue-600/20 flex items-center justify-center text-brand-gold shrink-0">
                              <span className="material-icons-round">schedule</span>
                           </div>
                           <div>
                              <p className="text-[10px] text-brand-platinum/30 font-black uppercase tracking-widest mb-1">Cita Programada</p>
                              <p className="text-sm font-bold text-white">{selectedBooking.pickup_date} @ {selectedBooking.pickup_time}h</p>
                           </div>
                        </div>

                        <div className="flex items-start gap-4">
                           <div className="w-10 h-10 rounded-2xl bg-emerald-600/20 flex items-center justify-center text-emerald-400 shrink-0">
                              <span className="material-icons-round">route</span>
                           </div>
                           <div className="space-y-3">
                              <div>
                                 <p className="text-[10px] text-brand-platinum/30 font-black uppercase tracking-widest mb-1">Recogida</p>
                                 <p className="text-sm font-bold text-white">{selectedBooking.origin}</p>
                                 <p className="text-[11px] text-brand-platinum/50 mt-1">{selectedBooking.origin_address}</p>
                              </div>
                              <div className="w-px h-6 bg-slate-800 ml-1"></div>
                              <div>
                                 <p className="text-[10px] text-brand-platinum/30 font-black uppercase tracking-widest mb-1">Destino</p>
                                 <p className="text-sm font-bold text-white">{selectedBooking.destination}</p>
                                 <p className="text-[11px] text-brand-platinum/50 mt-1">{selectedBooking.destination_address}</p>
                              </div>
                           </div>
                        </div>

                        {selectedBooking.flight_number && (
                           <div className="flex items-start gap-4">
                              <div className="w-10 h-10 rounded-2xl bg-purple-600/20 flex items-center justify-center text-purple-400 shrink-0">
                                 <span className="material-icons-round">flight_takeoff</span>
                              </div>
                              <div>
                                 <p className="text-[10px] text-brand-platinum/30 font-black uppercase tracking-widest mb-1">Seguimiento de Vuelo</p>
                                 <p className="text-sm font-bold text-white">{selectedBooking.flight_number}</p>
                              </div>
                           </div>
                        )}
                     </div>

                     {selectedBooking.notes && (
                        <div className="p-4 bg-brand-black rounded-2xl border border-white/5">
                           <p className="text-[10px] text-brand-platinum/30 font-black uppercase tracking-widest mb-2">Observaciones</p>
                           <p className="text-xs text-slate-300 font-medium leading-relaxed">{selectedBooking.notes}</p>
                        </div>
                     )}
                  </div>

                  <div className="p-8 border-t border-white/5 bg-brand-charcoal/80 flex gap-4">
                     <button className="flex-1 py-4 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-black uppercase tracking-widest shadow-xl shadow-blue-900/40 transition-all active:scale-95">Imprimir Hoja de Ruta</button>
                  </div>
               </div>
            )}
         </div>
      </div>
   );
};
