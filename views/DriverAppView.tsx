import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { useSupabaseData } from '../hooks/useSupabaseData';

export const DriverAppView: React.FC = () => {
   const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);
   const [myUserId, setMyUserId] = useState<string | null>(null);

   const { data: drivers, updateItem: updateDriver } = useSupabaseData('drivers');
   const { data: allBookings, updateItem: updateBooking } = useSupabaseData('bookings');
   const { data: shifts } = useSupabaseData('shifts');
   const { data: vehicles } = useSupabaseData('vehicles');

   useEffect(() => {
      supabase.auth.getSession().then(({ data: { session } }) => {
         if (session?.user) {
            setMyUserId(session.user.id);
         }
      });
   }, []);

   const activeDriver = drivers?.find((d: any) => d.id === selectedDriverId);

   // Shifts & Logs state
   const [currentLog, setCurrentLog] = useState<any>(null);
   const [weeklyEarnings, setWeeklyEarnings] = useState(0);
   const [alerts, setAlerts] = useState<any[]>([]);

   // Payment Modal State
   const [paymentModalOpen, setPaymentModalOpen] = useState(false);
   const [collectingBooking, setCollectingBooking] = useState<any>(null);
   const [cashAmount, setCashAmount] = useState('');
   const [tpvAmount, setTpvAmount] = useState('');
   const [actualPaymentMethod, setActualPaymentMethod] = useState<'Efectivo' | 'TPV' | 'Mixto'>('Efectivo');

   // KM Prompt State
   const [kmModalOpen, setKmModalOpen] = useState(false);
   const [currentKm, setCurrentKm] = useState('');
   const [pendingAction, setPendingAction] = useState<'clockIn' | 'clockOut' | null>(null);

   const driverBookings = allBookings?.filter((b: any) => b.driver_id === selectedDriverId && b.status !== 'Completed' && b.status !== 'Cancelled') || [];
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

   useEffect(() => {
      if (selectedDriverId) {
         checkActiveShift();
         calculateEarnings();

         // Real-time subscription for alerts
         const channel = supabase
            .channel('schema-db-changes')
            .on(
               'postgres_changes',
               {
                  event: '*',
                  schema: 'public',
                  table: 'bookings'
               },
               (payload) => {
                  const eventType = payload.eventType;
                  const newB = payload.new as any;
                  const oldB = payload.old as any;

                  let msg = "";
                  let type = eventType;

                  // NUEVO SERVICIO: Entra en mi driver_id
                  if (newB?.driver_id === selectedDriverId && (!oldB || oldB.driver_id !== selectedDriverId)) {
                     msg = "¡Nuevo servicio asignado!";
                     type = 'INSERT';
                  }
                  // SERVICIO RETIRADO/CANCELADO: Sale de mi driver_id
                  else if (oldB?.driver_id === selectedDriverId && newB?.driver_id !== selectedDriverId) {
                     msg = "Un servicio te ha sido retirado o reasignado";
                     type = 'DELETE';
                  }
                  // ACTUALIZACIÓN: Sigue siendo mío pero cambió el resto
                  else if (newB?.driver_id === selectedDriverId) {
                     if (newB.status === 'Cancelled') msg = "Reserva cancelada";
                     else msg = "Reserva actualizada";
                  }

                  if (msg) {
                     const newAlert = { id: Date.now(), msg, type };
                     setAlerts(prev => [newAlert, ...prev]);
                     setTimeout(() => setAlerts(prev => prev.filter(a => a.id !== newAlert.id)), 10000);
                  }
               }
            )
            .subscribe();

         return () => { channel.unsubscribe(); };
      }
   }, [selectedDriverId, allBookings]);

   // GEOLOCATION
   useEffect(() => {
      if (selectedDriverId && activeDriver?.current_status === 'Working') {
         const interval = setInterval(() => {
            navigator.geolocation.getCurrentPosition((pos) => {
               const { latitude, longitude } = pos.coords;
               supabase.from('driver_locations').upsert({
                  driver_id: selectedDriverId,
                  lat: latitude,
                  lng: longitude,
                  updated_at: new Date().toISOString()
               }).then();
            });
         }, 30000);
         return () => clearInterval(interval);
      }
   }, [selectedDriverId, activeDriver?.current_status]);

   const checkActiveShift = async () => {
      const { data } = await supabase
         .from('driver_logs')
         .select('*')
         .eq('driver_id', selectedDriverId)
         .is('clock_out', null)
         .order('clock_in', { ascending: false })
         .limit(1)
         .single();

      if (data) setCurrentLog(data);
      else setCurrentLog(null);
   };

   const calculateEarnings = () => {
      const commPct = activeDriver?.commission_pct || 15;
      const total = completedThisWeek.reduce((acc: number, b: any) => acc + (Number(b.price || 0) * (commPct / 100)), 0);
      setWeeklyEarnings(total);
   };

   const { updateItem: updateVehicle } = useSupabaseData('vehicles');

   const handleClockIn = async () => {
      setPendingAction('clockIn');
      setCurrentKm(assignedVehicle?.km?.toString() || '');
      setKmModalOpen(true);
   };

   const handleClockOut = async () => {
      if (!currentLog) return;
      setPendingAction('clockOut');
      setCurrentKm(assignedVehicle?.km?.toString() || '');
      setKmModalOpen(true);
   };

   const confirmKmAndProceed = async () => {
      const kmValue = parseInt(currentKm);
      if (!isNaN(kmValue) && assignedVehicle) {
         await updateVehicle(assignedVehicle.id, { km: kmValue });
      }

      if (pendingAction === 'clockIn') {
         const { data } = await supabase.from('driver_logs').insert([{ driver_id: selectedDriverId, type: 'WORK' }]).select().single();
         await updateDriver(selectedDriverId!, { current_status: 'Working' });
         setCurrentLog(data);
      } else if (pendingAction === 'clockOut') {
         if (!currentLog) return;
         await supabase.from('driver_logs').update({ clock_out: new Date().toISOString() }).eq('id', currentLog.id);
         await updateDriver(selectedDriverId!, { current_status: 'Off' });
         setCurrentLog(null);
      }

      setKmModalOpen(false);
      setPendingAction(null);
   };

   const handlePauseToggle = async () => {
      if (!currentLog) return;
      const now = new Date().toISOString();
      await supabase.from('driver_logs').update({ clock_out: now }).eq('id', currentLog.id);
      if (activeDriver?.current_status === 'Working') {
         const { data } = await supabase.from('driver_logs').insert([{ driver_id: selectedDriverId, type: 'PAUSE', clock_in: now }]).select().single();
         await updateDriver(selectedDriverId!, { current_status: 'Paused' });
         setCurrentLog(data);
      } else {
         const { data } = await supabase.from('driver_logs').insert([{ driver_id: selectedDriverId, type: 'WORK', clock_in: now }]).select().single();
         await updateDriver(selectedDriverId!, { current_status: 'Working' });
         setCurrentLog(data);
      }
   };

   const updateStatus = async (bookingId: string, status: string) => {
      await updateBooking(bookingId, { status });
   };

   const finalizeService = async () => {
      if (!collectingBooking) return;

      const cash = parseFloat(cashAmount) || 0;
      const tpv = parseFloat(tpvAmount) || 0;
      const total = cash + tpv;

      await updateBooking(collectingBooking.id, {
         status: 'Completed',
         collected_amount: total,
         cash_amount: cash,
         tpv_amount: tpv,
         actual_payment_method: actualPaymentMethod
      });
      setPaymentModalOpen(false);
      setCollectingBooking(null);
      setCashAmount('');
      setTpvAmount('');
   };

   // Auto-select if there is exactly one linked driver
   useEffect(() => {
      if (myUserId && drivers && !selectedDriverId) {
         const linkedDriver = drivers.find((d: any) => d.user_id === myUserId);
         if (linkedDriver) {
            setSelectedDriverId(linkedDriver.id);
         }
      }
   }, [myUserId, drivers, selectedDriverId]);

   if (!selectedDriverId) {
      if (!myUserId || !drivers) {
         return <div className="flex-1 bg-brand-black flex items-center justify-center p-8 text-white font-bold">Cargando perfil...</div>;
      }

      return (
         <div className="flex-1 bg-brand-black flex items-center justify-center p-8">
            <div className="bg-brand-charcoal p-8 rounded-3xl border border-white/5 w-full max-w-sm text-center">
               <span className="material-icons-round text-6xl text-brand-platinum/20 mb-4 block">no_accounts</span>
               <h2 className="text-xl font-bold text-white mb-2">Cuenta no vinculada</h2>
               <p className="text-sm text-brand-platinum/50 mb-6">Pide a tu administrador que vincule tu cuenta de usuario con un perfil de conductor en la sección de Conductores.</p>
            </div>
         </div>
      );
   }

   return (
      <div className="flex-1 bg-brand-black text-brand-white overflow-y-auto custom-scrollbar pb-20 relative selection:bg-brand-platinum/30 font-sans">
         {/* Background Effects */}
         <div className="fixed inset-0 z-0 pointer-events-none">
            <div className="absolute top-[-10%] left-[-5%] w-[50%] h-[50%] bg-brand-platinum/5 rounded-full blur-[120px] animate-pulse transition-all duration-1000"></div>
            <div className="absolute bottom-[-10%] right-[-5%] w-[50%] h-[50%] bg-brand-gold/5 rounded-full blur-[120px] animate-pulse delay-1000 transition-all duration-1000"></div>
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.02]"></div>
         </div>

         {/* Alerts Portal */}
         <div className="fixed top-4 left-4 right-4 z-50 pointer-events-none flex flex-col gap-2">
            {alerts.map(a => (
               <div key={a.id} className="animate-bounce bg-red-600 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 border border-red-500">
                  <span className="material-icons-round">notifications_active</span>
                  <p className="text-sm font-black uppercase tracking-widest">{a.msg}</p>
               </div>
            ))}
         </div>

         {/* Header */}
         <div className="relative z-10 bg-brand-charcoal/50 backdrop-blur-xl p-8 border-b border-white/5">
            <div className="flex justify-between items-start mb-10">
               <div className="space-y-2">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-brand-platinum text-[8px] font-bold uppercase tracking-[0.3em]">
                     <div className="w-1 h-1 rounded-full bg-brand-platinum animate-pulse"></div>
                     Driver Portal
                  </div>
                  <h1 className="text-4xl font-light tracking-tighter text-white">
                     Hola, <span className="platinum-text font-black">{(activeDriver?.name || '').split(' ')[0]}</span>
                  </h1>
                  <p className={`text-[10px] font-bold uppercase tracking-[0.3em] flex items-center gap-2 ${activeDriver?.current_status === 'Working' ? 'text-emerald-400' : activeDriver?.current_status === 'Paused' ? 'text-amber-400' : 'text-slate-500'}`}>
                     <span className={`w-2 h-2 rounded-full ${activeDriver?.current_status === 'Working' ? 'bg-emerald-400 animate-pulse' : activeDriver?.current_status === 'Paused' ? 'bg-amber-400' : 'bg-slate-700'}`}></span>
                     {activeDriver?.current_status === 'Working' ? 'En servicio' : activeDriver?.current_status === 'Paused' ? 'En pausa' : 'Fuera de servicio'}
                  </p>
               </div>
               <button
                  onClick={() => { localStorage.removeItem('activeDriverId'); setSelectedDriverId(null); }}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-brand-platinum hover:text-white text-[9px] font-bold uppercase tracking-[0.2em] transition-all"
               >
                  Salir
               </button>
            </div>

            {/* Assigned Vehicle */}
            <div className="mb-8 p-6 bg-brand-black/40 rounded-3xl border border-white/5 flex items-center gap-5 group hover:border-brand-gold/20 transition-all duration-500">
               <div className="w-14 h-14 bg-brand-gold/10 rounded-2xl flex items-center justify-center text-brand-gold border border-brand-gold/10 group-hover:bg-brand-gold group-hover:text-black transition-all">
                  <span className="material-icons-round text-2xl">directions_car</span>
               </div>
               <div>
                  <p className="text-[9px] font-bold text-brand-platinum uppercase tracking-[0.4em] mb-1.5 opacity-50">Vehículo Asignado</p>
                  <p className="text-lg font-light text-white tracking-tight">{assignedVehicle ? `${assignedVehicle.model}` : 'Sin vehículo asignado'} <span className="font-bold text-brand-gold ml-2">{assignedVehicle?.plate}</span></p>
               </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
               <div className="bg-brand-charcoal/40 backdrop-blur-md border border-white/5 rounded-[2rem] p-6 hover:border-brand-gold/20 transition-all">
                  <p className="text-[9px] font-bold text-brand-gold uppercase tracking-[0.4em] mb-3">Ganancias Semana</p>
                  <p className="text-3xl font-light text-white tracking-tighter">{weeklyEarnings.toFixed(2)}€</p>
               </div>
               <div className="bg-brand-charcoal/40 backdrop-blur-md border border-white/5 rounded-[2rem] p-6 hover:border-emerald-500/20 transition-all">
                  <p className="text-[9px] font-bold text-emerald-400 uppercase tracking-[0.4em] mb-3">Servicios Hoy</p>
                  <p className="text-3xl font-light text-white tracking-tighter">{driverBookings.length}</p>
               </div>
            </div>

            {activeDriver?.current_status === 'Off' ? (
               <button onClick={handleClockIn} className="w-full mt-8 py-5 bg-white text-brand-black rounded-2xl font-bold uppercase text-[10px] tracking-[0.3em] hover:bg-slate-200 shadow-xl transition-all">
                  Fichar Entrada
               </button>
            ) : (
               <div className="grid grid-cols-2 gap-4 mt-8">
                  <button
                     onClick={handlePauseToggle}
                     className={`py-5 rounded-2xl font-bold uppercase text-[10px] tracking-[0.3em] border transition-all ${activeDriver?.current_status === 'Paused'
                        ? 'bg-amber-600 text-white border-amber-500 shadow-lg shadow-amber-900/20'
                        : 'bg-white/5 text-amber-500 border-white/10 hover:bg-amber-500 hover:text-white'
                        }`}
                  >
                     {activeDriver?.current_status === 'Paused' ? 'Reanudar' : 'Pausa'}
                  </button>
                  <button onClick={handleClockOut} className="py-5 bg-white/5 text-red-500 border border-white/10 rounded-2xl font-bold uppercase text-[10px] tracking-[0.3em] hover:bg-red-500 hover:text-white transition-all">
                     Fichar Salida
                  </button>
               </div>
            )}
         </div>

         {/* Assignments */}
         <div className="relative z-10 p-8 space-y-8">
            <div className="flex items-center gap-4 mb-4">
               <div className="w-8 h-px bg-brand-platinum opacity-30"></div>
               <h2 className="text-[9px] font-bold text-brand-platinum uppercase tracking-[0.5em]">Servicios Asignados</h2>
            </div>

            {driverBookings.length === 0 ? (
               <div className="p-20 text-center bg-brand-charcoal/20 border border-dashed border-white/5 rounded-[3rem] text-brand-platinum opacity-30 font-light italic">
                  No tienes servicios pendientes por ahora
               </div>
            ) : (
               driverBookings.map((b: any) => (
                  <div key={b.id} className="group relative bg-brand-charcoal/30 backdrop-blur-md border border-white/5 border-l-brand-gold/20 border-l-4 rounded-[2.5rem] p-8 overflow-hidden transition-all duration-500 hover:bg-brand-charcoal/50 hover:border-white/10 shadow-2xl">
                     <div className="flex justify-between items-start mb-10">
                        <div className="space-y-1">
                           <div className="flex flex-wrap items-center gap-3 mb-2">
                              {/* Larger formatted date/time */}
                              <div className="flex items-center gap-2 bg-brand-gold/10 px-4 py-2 rounded-xl border border-brand-gold/20">
                                 <span className="material-icons-round text-brand-gold text-sm">event</span>
                                 <p className="text-brand-gold font-bold text-sm tracking-widest uppercase">
                                    {(() => {
                                       const d = new Date(b.pickup_date);
                                       const day = d.getDate().toString().padStart(2, '0');
                                       const month = (d.getMonth() + 1).toString().padStart(2, '0');
                                       const year = d.getFullYear();
                                       return `${day}/${month}/${year}`;
                                    })()} {b.pickup_time}h
                                 </p>
                              </div>

                              {(() => {
                                 const serviceShift = shifts?.find((s: any) => s.driver_id === selectedDriverId && s.date === b.pickup_date);
                                 const svcVehicle = vehicles?.find((v: any) => v.id === serviceShift?.vehicle_id);
                                 return svcVehicle ? (
                                    <div className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-xl border border-white/10 uppercase tracking-[0.2em] font-bold text-[10px] text-brand-platinum">
                                       <span className="material-icons-round text-xs opacity-50">directions_car</span>
                                       {svcVehicle.model} <span className="text-brand-gold ml-1">{svcVehicle.plate}</span>
                                    </div>
                                 ) : (
                                    <div className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-xl border border-white/10 uppercase tracking-[0.2em] font-bold text-[10px] text-brand-platinum/50 italic text-[8px]">
                                       Sin vehículo asignado
                                    </div>
                                 );
                              })()}
                           </div>
                           <h3 className="text-4xl font-light text-white tracking-tighter uppercase group-hover:platinum-text transition-all leading-tight">{b.passenger}</h3>
                           <p className="text-brand-platinum text-[10px] font-bold tracking-[0.3em] flex items-center gap-2 uppercase opacity-50 mt-1">
                              <span className="material-icons-round text-xs">phone</span> {b.phone || 'No disponible'}
                              <span className="ml-4 opacity-30 tracking-[0.5em]">ID: #{b.display_id || b.id.slice(0, 6)}</span>
                           </p>
                        </div>
                        <span className={`px-4 py-1.5 rounded-full text-[8px] font-bold uppercase tracking-[0.2em] border ${b.status === 'Pending' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20 animate-pulse' : 'bg-white/5 text-brand-platinum border-white/10'
                           }`}>{b.status}</span>
                     </div>

                     <div className="grid md:grid-cols-2 gap-8 mb-10">
                        <div className="space-y-6">
                           <div className="flex items-start gap-4 group/loc">
                              <div className="w-1.5 h-1.5 rounded-full bg-brand-platinum mt-1.5 shrink-0 shadow-[0_0_8px_rgba(142,145,150,0.5)]"></div>
                              <div>
                                 <p className="text-brand-platinum/40 uppercase font-bold text-[8px] tracking-[0.3em] mb-1.5">Recogida</p>
                                 <p className="text-slate-200 font-light text-sm leading-relaxed tracking-tight group-hover/loc:text-white transition-colors">{b.origin_address || b.origin}</p>
                              </div>
                           </div>
                           <div className="flex items-start gap-4 group/loc">
                              <div className="w-1.5 h-1.5 rounded-full bg-brand-gold mt-1.5 shrink-0 shadow-[0_0_8px_rgba(197,160,89,0.5)]"></div>
                              <div>
                                 <p className="text-brand-gold/40 uppercase font-bold text-[8px] tracking-[0.3em] mb-1.5">Destino</p>
                                 <p className="text-slate-200 font-light text-sm leading-relaxed tracking-tight group-hover/loc:text-white transition-colors">{b.destination_address || b.destination}</p>
                              </div>
                           </div>
                        </div>
                     </div>

                     {/* Additional Info */}
                     <div className="grid grid-cols-2 gap-4 mb-10">
                        <div className="bg-brand-black/30 backdrop-blur-md p-5 rounded-[2rem] border border-white/5 col-span-2 group/info hover:border-brand-gold/20 transition-all">
                           <p className="text-[8px] font-bold text-brand-platinum uppercase tracking-[0.3em] mb-2 opacity-50 italic">Vehículo Asignado para este Servicio</p>
                           {(() => {
                              const serviceShift = shifts?.find((s: any) => s.driver_id === selectedDriverId && s.date === b.pickup_date);
                              const svcVehicle = vehicles?.find((v: any) => v.id === serviceShift?.vehicle_id);
                              return (
                                 <p className="text-sm font-light text-brand-gold flex items-center gap-2 tracking-tight">
                                    <span className="material-icons-round text-sm opacity-50">directions_car</span>
                                    {svcVehicle ? `${svcVehicle.model}` : 'Sin vehículo asignado'}
                                    {svcVehicle && <span className="font-bold opacity-50 ml-1">{svcVehicle.plate}</span>}
                                 </p>
                              );
                           })()}
                        </div>
                        <div className="bg-brand-black/30 backdrop-blur-md p-5 rounded-[2rem] border border-white/5 hover:border-white/10 transition-all">
                           <p className="text-[8px] font-bold text-brand-platinum uppercase tracking-[0.3em] mb-2 opacity-50 italic">Pasajeros</p>
                           <p className="text-sm font-light text-white flex items-center gap-2 tracking-tight">
                              <span className="material-icons-round text-sm opacity-50">groups</span> {b.pax || 1} <span className="font-bold text-brand-platinum/50 uppercase text-[10px] tracking-widest">PAX</span>
                           </p>
                        </div>
                        <div className="bg-brand-black/30 backdrop-blur-md p-5 rounded-[2rem] border border-white/5 hover:border-white/10 transition-all">
                           <p className="text-[8px] font-bold text-brand-platinum uppercase tracking-[0.3em] mb-2 opacity-50 italic">Vuelo</p>
                           <p className="text-sm font-light text-white flex items-center gap-2 tracking-tight uppercase">
                              <span className="material-icons-round text-sm opacity-50">flight</span> {b.flight_number || 'N/A'}
                           </p>
                        </div>
                     </div>

                     {/* Extras */}
                     {b.notes && (
                        <div className="mb-8 p-6 bg-brand-platinum/5 border border-brand-platinum/10 rounded-[2rem] relative overflow-hidden">
                           <div className="absolute top-0 right-0 p-3 opacity-10">
                              <span className="material-icons-round text-4xl">info</span>
                           </div>
                           <p className="text-[8px] font-bold text-brand-platinum uppercase tracking-[0.4em] mb-3 flex justify-between">
                              EXTRAS & OBSERVACIONES
                              {b.notes.toLowerCase().includes('efectivo') && (
                                 <span className="text-emerald-500 font-bold tracking-widest">--- PAGO AL CONDUCTOR ---</span>
                              )}
                           </p>
                           <p className="text-[11px] text-slate-300 leading-relaxed font-light italic uppercase tracking-wider">{b.notes}</p>
                        </div>
                     )}

                     {/* Payment Reminder for Cash Bookings */}
                     {(b.payment_method === 'Efectivo' || (b.notes && b.notes.toLowerCase().includes('efectivo'))) && (
                        <div className="mb-10 p-6 bg-emerald-500/5 border border-emerald-500/20 rounded-[2.5rem] flex items-center gap-5">
                           <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                              <span className="material-icons-round">payments</span>
                           </div>
                           <div>
                              <p className="text-[8px] font-bold text-emerald-500 uppercase tracking-[0.4em] mb-1">Cobro Obligatorio</p>
                              <p className="text-lg font-light text-white tracking-tight">
                                 Cobrar <span className="text-3xl font-black text-emerald-400 mx-1">{b.price}€</span> en Efectivo
                              </p>
                           </div>
                        </div>
                     )}

                     <div className="grid grid-cols-1 gap-3">
                        {b.status === 'Pending' && (
                           <button onClick={() => updateStatus(b.id, 'Confirmed')} className="w-full py-5 bg-white text-brand-black rounded-2xl text-[10px] font-bold uppercase tracking-[0.3em] shadow-xl hover:bg-slate-200 transition-all">Confirmar Recepción</button>
                        )}
                        {b.status === 'Confirmed' && (
                           <button onClick={() => updateStatus(b.id, 'En Route')} className="w-full py-5 bg-white/5 border border-white/10 text-white rounded-2xl text-[10px] font-bold uppercase tracking-[0.3em] hover:bg-white/10 transition-all">De Camino</button>
                        )}
                        {b.status === 'En Route' && (
                           <button onClick={() => updateStatus(b.id, 'At Origin')} className="w-full py-5 bg-white/5 border border-white/10 text-white rounded-2xl text-[10px] font-bold uppercase tracking-[0.3em] hover:bg-white/10 transition-all">En Origen</button>
                        )}
                        {b.status === 'At Origin' && (
                           <button onClick={() => updateStatus(b.id, 'In Progress')} className="w-full py-5 bg-white/5 border border-white/10 text-white rounded-2xl text-[10px] font-bold uppercase tracking-[0.3em] hover:bg-white/10 transition-all">En Ruta</button>
                        )}
                        {b.status === 'In Progress' && (
                           <button onClick={() => {
                              setCollectingBooking(b);
                              const isCash = b.payment_method === 'Efectivo' || (b.notes?.toLowerCase() || '').includes('efectivo');

                              if (isCash) {
                                 setCashAmount(b.price?.toString() || '');
                                 setTpvAmount('');
                                 setActualPaymentMethod('Efectivo');
                              } else {
                                 setCashAmount('');
                                 setTpvAmount(b.price?.toString() || '');
                                 setActualPaymentMethod('TPV');
                              }
                              setPaymentModalOpen(true);
                           }} className="w-full py-6 bg-gradient-to-r from-emerald-600 to-blue-600 text-white rounded-2xl text-[11px] font-bold uppercase tracking-[0.4em] shadow-2xl hover:scale-[1.02] active:scale-[0.98] transition-all">Finalizar Trayecto</button>
                        )}
                     </div>
                  </div>
               ))
            )}
         </div>

         {/* Payment Collection Modal */}
         {paymentModalOpen && (
            <div className="fixed inset-0 z-[100] bg-brand-black/95 backdrop-blur-xl flex items-end sm:items-center justify-center p-4">
               <div className="bg-brand-charcoal w-full max-w-sm rounded-[32px] border border-white/5/50 shadow-2xl p-8 animate-in slide-in-from-bottom duration-300">
                  <div className="text-center mb-8">
                     <div className="w-16 h-16 bg-emerald-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="material-icons-round text-emerald-500 text-3xl">account_balance_wallet</span>
                     </div>
                     <h2 className="text-xl font-black text-white">Registrar Cobro</h2>
                     <p className="text-xs text-brand-platinum/30 mt-1 uppercase tracking-widest">Servicio #{collectingBooking?.display_id}</p>
                  </div>

                  <div className="space-y-6">
                     <div className="flex bg-brand-black p-1 rounded-2xl border border-white/5 mb-6">
                        <button
                           onClick={() => { setActualPaymentMethod('Efectivo'); setTpvAmount(''); setCashAmount(collectingBooking?.price?.toString() || ''); }}
                           className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${actualPaymentMethod === 'Efectivo' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/40' : 'text-brand-platinum/30 hover:text-white'}`}
                        >Efectivo</button>
                        <button
                           onClick={() => { setActualPaymentMethod('TPV'); setCashAmount(''); setTpvAmount(collectingBooking?.price?.toString() || ''); }}
                           className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${actualPaymentMethod === 'TPV' ? 'bg-brand-gold text-brand-black shadow-lg shadow-brand-gold/40' : 'text-brand-platinum/30 hover:text-white'}`}
                        >TPV</button>
                        <button
                           onClick={() => { setActualPaymentMethod('Mixto'); }}
                           className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${actualPaymentMethod === 'Mixto' ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/40' : 'text-brand-platinum/30 hover:text-white'}`}
                        >Mixto</button>
                     </div>

                     <div className="space-y-4">
                        {(actualPaymentMethod === 'Efectivo' || actualPaymentMethod === 'Mixto') && (
                           <div className="animate-in slide-in-from-left duration-300">
                              <label className="text-[10px] font-black text-emerald-500 uppercase tracking-widest block mb-2">Efectivo (€)</label>
                              <input
                                 type="number"
                                 value={cashAmount}
                                 onChange={(e) => setCashAmount(e.target.value)}
                                 className="w-full bg-brand-black border border-white/5/50 rounded-2xl px-5 py-4 text-xl font-black text-white focus:border-emerald-500 outline-none transition-all"
                                 placeholder="0.00"
                              />
                           </div>
                        )}

                        {(actualPaymentMethod === 'TPV' || actualPaymentMethod === 'Mixto') && (
                           <div className="animate-in slide-in-from-right duration-300">
                              <label className="text-[10px] font-black text-brand-gold uppercase tracking-widest block mb-2">TPV - Tarjeta (€)</label>
                              <input
                                 type="number"
                                 value={tpvAmount}
                                 onChange={(e) => setTpvAmount(e.target.value)}
                                 className="w-full bg-brand-black border border-white/5/50 rounded-2xl px-5 py-4 text-xl font-black text-white focus:border-blue-500 outline-none transition-all"
                                 placeholder="0.00"
                              />
                           </div>
                        )}

                        {actualPaymentMethod === 'Mixto' && (
                           <div className="pt-2 border-t border-white/5/50 flex justify-between items-center">
                              <span className="text-[10px] font-black text-brand-platinum/30 uppercase">Total a Cobrar</span>
                              <span className="text-lg font-black text-white">{(parseFloat(cashAmount || '0') + parseFloat(tpvAmount || '0')).toFixed(2)}€</span>
                           </div>
                        )}
                     </div>

                     <div className="pt-4 space-y-3">
                        <button
                           onClick={finalizeService}
                           disabled={!(parseFloat(cashAmount || '0') + parseFloat(tpvAmount || '0') > 0)}
                           className="w-full py-5 bg-gradient-to-r from-emerald-600 to-blue-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:scale-[1.02] active:scale-95 shadow-xl shadow-emerald-900/40 transition-all disabled:opacity-50 disabled:grayscale"
                        >
                           Finalizar y Guardar Cobro
                        </button>
                        <button
                           onClick={() => setPaymentModalOpen(false)}
                           className="w-full py-4 text-brand-platinum/30 hover:text-white font-black uppercase text-[10px] tracking-widest transition-all"
                        >
                           Volver
                        </button>
                     </div>
                  </div>
               </div>
            </div>
         )}

         {/* KM Prompt Modal */}
         {kmModalOpen && (
            <div className="fixed inset-0 z-[100] bg-brand-black/95 backdrop-blur-xl flex items-center justify-center p-4">
               <div className="bg-brand-charcoal w-full max-w-sm rounded-[32px] border border-white/5/50 shadow-2xl p-8 animate-in zoom-in-95 duration-200">
                  <div className="text-center mb-6">
                     <div className="w-16 h-16 bg-blue-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="material-icons-round text-blue-500 text-3xl">speed</span>
                     </div>
                     <h2 className="text-xl font-black text-white px-4">Actualizar Kilometraje</h2>
                     <p className="text-xs text-brand-platinum/50 mt-2">Por favor, indica los kilómetros actuales del vehículo antes de fichar.</p>
                  </div>

                  <div className="space-y-4">
                     <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-brand-platinum/30 uppercase text-xs">KM</span>
                        <input
                           type="number"
                           value={currentKm}
                           onChange={(e) => setCurrentKm(e.target.value)}
                           className="w-full bg-brand-black border border-white/5/50 rounded-2xl pl-12 pr-5 py-4 text-xl font-black text-white focus:border-blue-500 outline-none transition-all placeholder-white/10"
                           placeholder="0"
                        />
                     </div>

                     <div className="pt-2 grid gap-3">
                        <button
                           onClick={confirmKmAndProceed}
                           className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-blue-500 active:scale-95 shadow-lg shadow-blue-900/40 transition-all"
                        >
                           Confirmar y Fichar
                        </button>
                        <button
                           onClick={() => { setKmModalOpen(false); setPendingAction(null); }}
                           className="w-full py-3 text-brand-platinum/50 hover:text-white font-bold uppercase text-[10px] tracking-widest transition-all"
                        >
                           Cancelar
                        </button>
                     </div>
                  </div>
               </div>
            </div>
         )}
      </div>
   );
};
