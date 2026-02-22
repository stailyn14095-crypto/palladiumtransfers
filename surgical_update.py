
import os

def update_file(path, start_marker, end_marker, replacement):
    with open(path, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    start_idx = -1
    end_idx = -1
    
    for i, line in enumerate(lines):
        if start_marker in line and start_idx == -1:
            start_idx = i
        if end_marker in line and start_idx != -1:
            end_idx = i
            break
            
    if start_idx != -1 and end_idx != -1:
        head = lines[0:start_idx]
        tail = lines[end_idx+1:]
        new_lines = head + [replacement] + tail
        with open(path, 'w', encoding='utf-8') as f:
            f.writelines(new_lines)
        print(f"Updated {os.path.basename(path)} successfully")
    else:
        print(f"Failed to find markers in {os.path.basename(path)}")

# Update ReservasView.tsx
reservas_path = r"j:\PALLADIUM TRANSFERS\palladium-operations-hub\views\ReservasView.tsx"
reservas_replacement = """                                        <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                                           <div className="flex flex-col gap-1.5">
                                              <select
                                                 className={`w-full max-w-[140px] bg-brand-black border border-white/5/50 rounded-lg px-2 py-1.5 text-xs text-white outline-none focus:border-brand-gold ${!b.driver_id ? 'border-amber-500/30' : 'text-emerald-400'}`}
                                                 value={b.driver_id || ''}
                                                 onChange={(e) => handleAssignDriver(b.id, e.target.value)}
                                              >
                                                 <option value="">-- Sin Asignar --</option>
                                                 {drivers?.map((d: any) => (
                                                    <option key={d.id} value={d.id}>{d.name}</option>
                                                 ))}
                                              </select>
                                              {b.driver_id && (
                                                 <div className="flex items-center gap-1.5 px-2 py-1 bg-white/5 rounded-md border border-white/5 w-fit">
                                                    <span className="material-icons-round text-[10px] text-brand-gold">directions_car</span>
                                                    {(() => {
                                                       const bDate = b.pickup_date ? b.pickup_date.split("T")[0] : null;
                                                       const svcShift = bDate && shifts ? shifts.find((s: any) => s.driver_id === b.driver_id && s.date === bDate) : null;
                                                       const svcVehicle = svcShift && vehicles ? vehicles.find((v: any) => v.id === svcShift.vehicle_id) : null;
                                                       return svcVehicle ? (
                                                          <span className="text-[10px] font-bold text-brand-gold/70">{svcVehicle.plate} <span className="text-brand-platinum/30 font-medium whitespace-nowrap">({svcVehicle.model})</span></span>
                                                       ) : (
                                                          <span className="text-[9px] text-brand-platinum/30 italic">Sin coche</span>
                                                       );
                                                    })()}
                                                 </div>
                                              )}
                                           </div>
                                        </td>
"""
update_file(reservas_path, '<td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>', '</select>', reservas_replacement)

# Update DispatchConsole.tsx
dispatch_path = r"j:\PALLADIUM TRANSFERS\palladium-operations-hub\views\DispatchConsole.tsx"
dispatch_replacement = """                               <div className="overflow-hidden flex-1">
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
"""
# Using -> instead of arrow in replacement to be safe with display, but target needs to be literal
# Wait, I'll just match on the Passenger line which is unique enough
update_file(dispatch_path, '<div className="overflow-hidden">', '</div>', dispatch_replacement)
