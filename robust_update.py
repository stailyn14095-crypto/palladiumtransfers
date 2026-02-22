
import os

def update_reservas():
    path = r"j:\PALLADIUM TRANSFERS\palladium-operations-hub\views\ReservasView.tsx"
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Using a smaller, more reliable target for ReservasView
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
    
    # The hex debug showed 42 spaces for ReservasView. Let's make sure our target uses that.
    # I'll use a dynamic approach: find the select, then find the parent td.
    
    if target in content:
        new_content = content.replace(target, replacement)
        with open(path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print("ReservasView updated successfully")
    elif target.replace('\n', '\r\n') in content:
        new_content = content.replace(target.replace('\n', '\r\n'), replacement.replace('\n', '\r\n'))
        with open(path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print("ReservasView updated successfully (Win)")
    else:
        # Final attempt: regex-like replacement for whitespace
        import re
        # Escape special characters but replace spaces with \s+
        pattern = re.escape(target).replace(r'\ ', r'\s+')
        new_content, count = re.subn(pattern, replacement, content, flags=re.MULTILINE)
        if count > 0:
            with open(path, 'w', encoding='utf-8') as f:
                f.write(new_content)
            print(f"ReservasView updated successfully (Regex, {count} matches)")
        else:
            print("ReservasView target NOT found even with regex")

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
                               
    import re
    pattern = re.escape(target).replace(r'\ ', r'\s+').replace(r'\\u2192', r'.') # use . for the arrow
    new_content, count = re.subn(pattern, replacement, content, flags=re.MULTILINE)
    
    if count > 0:
        with open(path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"DispatchConsole updated successfully ({count} matches)")
    else:
        print("DispatchConsole target NOT found with regex")

update_reservas()
update_dispatch()
