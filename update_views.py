
import os

def update_reservas():
    path = r"j:\PALLADIUM TRANSFERS\palladium-operations-hub\views\ReservasView.tsx"
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Target content to replace (being careful with spaces)
    target = """                                        <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
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
                                        </td>"""
    
    replacement = """                                        <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
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
                                        </td>"""
    
    # Try multiple variations of line endings and spaces if necessary
    if target in content:
        new_content = content.replace(target, replacement)
        with open(path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print("ReservasView updated successfully")
    else:
        # Try with Windows line endings
        target_win = target.replace('\n', '\r\n')
        if target_win in content:
            new_content = content.replace(target_win, replacement.replace('\n', '\r\n'))
            with open(path, 'w', encoding='utf-8') as f:
                f.write(new_content)
            print("ReservasView updated successfully (Win line endings)")
        else:
            print("ReservasView target NOT found")

def update_dispatch():
    path = r"j:\PALLADIUM TRANSFERS\palladium-operations-hub\views\DispatchConsole.tsx"
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
        
    target = """                               <div className="overflow-hidden">
                                  <p className="text-xs font-black text-white truncate leading-none mb-1">{b.passenger}</p>
                                  <p className="text-[9px] text-white/60 font-medium truncate uppercase tracking-tighter">{b.origin} \u2192 {b.destination}</p>
                               </div>"""
    
    replacement = """                               <div className="overflow-hidden flex-1">
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
                                  <p className="text-[9px] text-white/60 font-medium truncate uppercase tracking-tighter mt-1">{b.origin} \u2192 {b.destination}</p>
                               </div>"""
    
    if target in content:
        new_content = content.replace(target, replacement)
        with open(path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print("DispatchConsole updated successfully")
    else:
        target_win = target.replace('\n', '\r\n')
        if target_win in content:
            new_content = content.replace(target_win, replacement.replace('\n', '\r\n'))
            with open(path, 'w', encoding='utf-8') as f:
                f.write(new_content)
            print("DispatchConsole updated successfully (Win line endings)")
        else:
            # Try a partial match if full match fails
            target_partial = """                                  <p className="text-xs font-black text-white truncate leading-none mb-1">{b.passenger}</p>"""
            if target_partial in content:
                 print("Found partial match in DispatchConsole, attempting partial replace")
                 # This is risky, but let's try to replace just the lines we found
                 # (Wait, better not to guess. I'll just print found status for now)
            print("DispatchConsole target NOT found")

update_reservas()
update_dispatch()
