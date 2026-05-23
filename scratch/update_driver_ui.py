import re

filepath = r"j:\PALLADIUM TRANSFERS\palladium-operations-hub\views\DriverAppView.tsx"

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add expandedBookingId state
state_search = "const [upcomingCollapsed, setUpcomingCollapsed] = useState(false);"
if "expandedBookingId" not in content:
    content = content.replace(state_search, state_search + "\n   const [expandedBookingId, setExpandedBookingId] = useState<string | null>(null);")

# 2. Modify the grouping logic and rendering
render_search = """                  const currentBooking = sortedActiveBookings[0];
                  const upcomingBookings = sortedActiveBookings.slice(1);
                  const todayDateStr = new Date().toISOString().split('T')[0];"""

render_replace = """                  const currentBooking = sortedActiveBookings.length > 0 ? sortedActiveBookings[0] : null;
                  const upcomingBookings = sortedActiveBookings.slice(1);
                  
                  // Split into Ayer and Future (Hoy, Mañana)
                  const ayerBookings = upcomingBookings.filter((b: any) => b.pickup_date.split('T')[0] === yesterdayStr);
                  const futureBookings = upcomingBookings.filter((b: any) => b.pickup_date.split('T')[0] === todayStr || b.pickup_date.split('T')[0] === tomorrowStr);
                  
                  const todayDateStr = new Date().toISOString().split('T')[0];"""

content = content.replace(render_search, render_replace)

# Render Helper for Folded Card Details
helper_code = """
                  // Render helper for expanded folded cards
                  const renderExpandedDetails = (b: any) => (
                     <div className="mt-4 pt-4 border-t border-white/5 space-y-4 animate-in fade-in slide-in-from-top-2">
                        <div className="grid grid-cols-2 gap-4">
                           <div>
                              <p className="text-[8px] font-bold text-brand-platinum/40 uppercase tracking-[0.3em] mb-1">Recogida</p>
                              <p className="text-xs text-white font-light">{b.origin_address || b.origin}</p>
                           </div>
                           <div>
                              <p className="text-[8px] font-bold text-brand-gold/40 uppercase tracking-[0.3em] mb-1">Destino</p>
                              <p className="text-xs text-white font-light">{b.destination_address || b.destination}</p>
                           </div>
                        </div>
                        <div className="flex gap-4">
                           <div className="bg-brand-black/40 px-3 py-2 rounded-xl flex items-center gap-2">
                              <span className="material-icons-round text-sm text-brand-platinum/50">groups</span>
                              <span className="text-[10px] font-bold text-white uppercase">{b.pax || 1} PAX</span>
                           </div>
                           {b.flight_number && (
                              <div className="bg-brand-black/40 px-3 py-2 rounded-xl flex items-center gap-2">
                                 <span className="material-icons-round text-sm text-brand-platinum/50">flight</span>
                                 <span className="text-[10px] font-bold text-white uppercase">{b.flight_number}</span>
                              </div>
                           )}
                           <div className="bg-brand-black/40 px-3 py-2 rounded-xl flex items-center gap-2">
                              <span className="material-icons-round text-sm text-brand-platinum/50">phone</span>
                              <span className="text-[10px] font-bold text-white uppercase">{b.phone || 'N/A'}</span>
                           </div>
                        </div>
                        {b.notes && (
                           <div className="p-3 bg-brand-platinum/5 rounded-xl border border-white/5">
                              <p className="text-[8px] font-bold text-brand-gold uppercase tracking-widest mb-1">NOTAS:</p>
                              <p className="text-[10px] text-brand-platinum/70 italic">{b.notes}</p>
                           </div>
                        )}
                     </div>
                  );
"""

# Find where to inject the helper. Right before "if (!currentBooking && completedToday.length === 0)"
inject_point = "if (!currentBooking && completedToday.length === 0) {"
if "renderExpandedDetails" not in content:
    content = content.replace(inject_point, helper_code + "\n                  " + inject_point)

# Let's rebuild the main layout inside the return (
layout_search_start = "{/* CURRENT BOOKING */}"
layout_search_end = "{/* PAST BOOKINGS TODAY */}"

# We use regex to replace everything from CURRENT BOOKING to PAST BOOKINGS TODAY
import re

pattern = re.compile(r'\{\/\*\s*CURRENT BOOKING\s*\*\/\}.*?\{\/\*\s*PAST BOOKINGS TODAY\s*\*\/\}', re.DOTALL)

new_layout = """{/* AYER BOOKINGS (ABOVE CURRENT) */}
                        {ayerBookings.length > 0 && (
                           <div className="mb-8">
                              <div className="flex items-center gap-4 mb-4">
                                 <div className="w-8 h-px bg-brand-platinum opacity-30"></div>
                                 <h2 className="text-[9px] font-bold text-brand-platinum uppercase tracking-[0.5em]">Servicios de Ayer</h2>
                              </div>
                              <div className="space-y-3">
                                 {ayerBookings.map((b: any) => (
                                    <div key={b.id} className="flex flex-col p-4 bg-brand-charcoal/20 border border-white/5 rounded-2xl relative transition-all">
                                       <div className="flex items-center justify-between">
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
                                          <div className="flex items-center gap-3">
                                             <span className="px-2 py-1 bg-white/5 rounded-lg text-[8px] uppercase tracking-widest text-brand-platinum">{b.status}</span>
                                             <button 
                                                onClick={() => setExpandedBookingId(expandedBookingId === b.id ? null : b.id)}
                                                className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-brand-gold/20 hover:text-brand-gold text-brand-platinum transition-colors"
                                             >
                                                <span className="material-icons-round text-sm">{expandedBookingId === b.id ? 'expand_less' : 'visibility'}</span>
                                             </button>
                                          </div>
                                       </div>
                                       {expandedBookingId === b.id && renderExpandedDetails(b)}
                                    </div>
                                 ))}
                              </div>
                           </div>
                        )}

                        {/* CURRENT BOOKING */}
                        {currentBooking ? (
                           <div className="mb-8">
                              <div className="flex items-center gap-4 mb-4">
                                 <div className="w-8 h-px bg-brand-gold opacity-50"></div>
                                 <h2 className="text-[9px] font-bold text-brand-gold uppercase tracking-[0.5em] animate-pulse">Servicio Actual</h2>
                              </div>
                              <div className="group relative bg-brand-charcoal/30 backdrop-blur-md border border-white/5 border-l-brand-gold/50 border-l-4 rounded-3xl md:rounded-[2.5rem] p-5 md:p-8 overflow-hidden transition-all duration-500 hover:bg-brand-charcoal/50 shadow-[0_0_40px_rgba(197,160,89,0.05)]">
                                 <div className="flex justify-between items-start mb-10">
                                    <div className="space-y-1">
                                       <div className="flex flex-wrap items-center gap-3 mb-2">
                                          <div className="flex items-center gap-2 bg-brand-gold/10 px-4 py-2 rounded-xl border border-brand-gold/20">
                                             <span className="material-icons-round text-brand-gold text-sm">event</span>
                                             <p className="text-brand-gold font-bold text-sm tracking-widest uppercase">
                                                {new Date(currentBooking.pickup_date).toLocaleDateString('es-ES')} {currentBooking.pickup_time}h
                                             </p>
                                          </div>
                                          {getTimeRemaining(currentBooking.pickup_date, currentBooking.pickup_time) && (
                                             <div className="flex items-center gap-2 bg-emerald-500/10 px-4 py-2 rounded-xl border border-emerald-500/20 animate-pulse">
                                                <span className="material-icons-round text-emerald-500 text-sm">schedule</span>
                                                <p className="text-emerald-500 font-bold text-[10px] tracking-widest uppercase">
                                                   {getTimeRemaining(currentBooking.pickup_date, currentBooking.pickup_time)}
                                                </p>
                                             </div>
                                          )}
                                       </div>
                                       <h3 className="text-lg font-bold text-white tracking-widest uppercase group-hover:platinum-text transition-all leading-tight">{currentBooking.passenger}</h3>
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
                                          onClick={() => generatePDF(currentBooking)}
                                          className="flex items-center gap-1.5 px-4 py-2 bg-brand-gold/10 border border-brand-gold/20 text-brand-gold rounded-full hover:bg-brand-gold hover:text-black transition-all shadow-[0_0_15px_rgba(197,160,89,0.2)]"
                                       >
                                          <span className="text-[10px] font-black uppercase tracking-widest">LETRERO</span>
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
                                 </div>

                                 {currentBooking.notes && (
                                    <div className="mb-8 p-6 bg-brand-platinum/5 border border-brand-platinum/10 rounded-[2rem] relative overflow-hidden">
                                       <div className="absolute top-0 right-0 p-3 opacity-10">
                                          <span className="material-icons-round text-4xl">info</span>
                                       </div>
                                       <p className="text-[8px] font-bold text-brand-platinum uppercase tracking-[0.4em] mb-3 flex justify-between">
                                          NOTAS DEL SERVICIO
                                       </p>
                                       <p className="text-[11px] text-slate-300 leading-relaxed font-light italic uppercase tracking-wider">{currentBooking.notes}</p>
                                    </div>
                                 )}

                                 <div className="grid grid-cols-1 gap-3">
                                    {currentBooking.status === 'Pending' && (
                                       <button onClick={() => updateStatus(currentBooking.id, 'Confirmed')} className="w-full py-5 bg-white text-brand-black rounded-2xl text-[10px] font-bold uppercase tracking-[0.3em] shadow-xl hover:bg-slate-200 transition-all">Confirmar Recepción</button>
                                    )}
                                    {currentBooking.status === 'Confirmed' && (
                                       <button onClick={() => { updateStatus(currentBooking.id, 'En Route'); openGoogleMaps(currentBooking.origin_address || currentBooking.origin); }} className="w-full py-5 bg-white/5 border border-white/10 text-white rounded-2xl text-[10px] font-bold uppercase tracking-[0.3em] hover:bg-white/10 transition-all">De Camino</button>
                                    )}
                                    {currentBooking.status === 'En Route' && (
                                       <button onClick={() => updateStatus(currentBooking.id, 'At Origin')} className="w-full py-5 bg-white/5 border border-white/10 text-white rounded-2xl text-[10px] font-bold uppercase tracking-[0.3em] hover:bg-white/10 transition-all">En Origen</button>
                                    )}
                                    {currentBooking.status === 'At Origin' && (
                                       <button onClick={() => updateStatus(currentBooking.id, 'In Progress')} className="w-full py-5 bg-brand-gold text-brand-black rounded-2xl text-[10px] font-bold uppercase tracking-[0.3em] hover:bg-brand-gold/90 transition-all shadow-lg shadow-brand-gold/20">Pasajero a Bordo</button>
                                    )}
                                    {currentBooking.status === 'In Progress' && (
                                       <button onClick={() => initiateCollection(currentBooking)} className="w-full py-5 bg-emerald-600 text-white rounded-2xl text-[10px] font-bold uppercase tracking-[0.3em] hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-900/40">Finalizar Traslado</button>
                                    )}
                                 </div>
                              </div>
                           </div>
                        ) : null}

                        {/* UPCOMING BOOKINGS (Future) */}
                        {futureBookings.length > 0 && (
                           <div>
                              <div 
                                 className="flex items-center justify-between mb-4 cursor-pointer group"
                                 onClick={() => setUpcomingCollapsed(!upcomingCollapsed)}
                              >
                                 <div className="flex items-center gap-4">
                                    <div className="w-8 h-px bg-brand-platinum opacity-30 group-hover:bg-brand-gold transition-colors"></div>
                                    <h2 className="text-[9px] font-bold text-brand-platinum group-hover:text-brand-gold transition-colors uppercase tracking-[0.5em]">
                                       Próximos Servicios ({futureBookings.length})
                                    </h2>
                                 </div>
                                 <span className="material-icons-round text-brand-platinum/50 group-hover:text-brand-gold text-sm transition-all">
                                    {upcomingCollapsed ? 'expand_more' : 'expand_less'}
                                 </span>
                              </div>
                              
                              {!upcomingCollapsed && (
                                 <div className="space-y-6">
                                    {['Hoy', 'Mañana'].map(dayGroup => {
                                       const targetStr = dayGroup === 'Hoy' ? todayStr : tomorrowStr;
                                       const groupBookings = futureBookings.filter((b: any) => b.pickup_date.split('T')[0] === targetStr);
                                       if (groupBookings.length === 0) return null;
                                       
                                       return (
                                          <div key={dayGroup} className="space-y-3">
                                             <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest pl-2">
                                                {dayGroup} - {new Date(targetStr).toLocaleDateString('es-ES')}
                                             </p>
                                             {groupBookings.map((b: any) => (
                                                <div key={b.id} className="flex flex-col p-4 bg-brand-charcoal/20 border border-white/5 rounded-2xl relative transition-all">
                                                   <div className="flex items-center justify-between">
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
                                                      <div className="flex flex-col items-end gap-2">
                                                         <div className="flex items-center gap-3">
                                                            <span className="px-2 py-1 bg-white/5 rounded-lg text-[8px] uppercase tracking-widest text-brand-platinum">{b.status}</span>
                                                            <button 
                                                               onClick={() => setExpandedBookingId(expandedBookingId === b.id ? null : b.id)}
                                                               className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-brand-gold/20 hover:text-brand-gold text-brand-platinum transition-colors"
                                                            >
                                                               <span className="material-icons-round text-sm">{expandedBookingId === b.id ? 'expand_less' : 'visibility'}</span>
                                                            </button>
                                                         </div>
                                                         {getTimeRemaining(b.pickup_date, b.pickup_time) && (
                                                            <span className="text-[8px] font-bold text-emerald-500 uppercase tracking-widest bg-emerald-500/10 px-2 py-1 rounded">
                                                               {getTimeRemaining(b.pickup_date, b.pickup_time)}
                                                            </span>
                                                         )}
                                                      </div>
                                                   </div>
                                                   {expandedBookingId === b.id && renderExpandedDetails(b)}
                                                </div>
                                             ))}
                                          </div>
                                       );
                                    })}
                                 </div>
                              )}
                           </div>
                        )}

                        {/* PAST BOOKINGS TODAY */}"""

content = re.sub(pattern, new_layout, content)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated successfully")
