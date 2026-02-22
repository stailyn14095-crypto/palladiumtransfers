
import os

def clean_reservas():
    path = r"j:\PALLADIUM TRANSFERS\palladium-operations-hub\views\ReservasView.tsx"
    with open(path, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    # We will reconstruct the file line by line to ensure no double-tags or missing tags
    # Focus on the 'Despacho' column which is the one we touched
    
    new_lines = []
    in_despacho_td = False
    skip_until_next_td = False
    
    for line in lines:
        if skip_until_next_td:
            if '<td className="px-6 py-4">' in line and 'Status' not in line: # Try to find the next td (Status)
                skip_until_next_td = False
                # fall through to append this line
            else:
                continue
        
        # Check if we are at the start of the Despacho TD
        if 'text-brand-gold">Despacho</th>' in line:
            # We are near the target. The next TD after Pickup info is our target.
            pass
            
        if '<td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>' in line and '<select' in lines[lines.index(line)+1 if lines.index(line)+1 < len(lines) else 0]:
            # This is the Despacho TD
            indent = "                                        "
            new_lines.append(indent + '<td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>\n')
            new_lines.append(indent + '   <div className="flex flex-col gap-1.5">\n')
            new_lines.append(indent + '      <select\n')
            new_lines.append(indent + '         className={`w-full max-w-[140px] bg-brand-black border border-white/5/50 rounded-lg px-2 py-1.5 text-xs text-white outline-none focus:border-brand-gold ${!b.driver_id ? \'border-amber-500/30\' : \'text-emerald-400\'}`}\n')
            new_lines.append(indent + '         value={b.driver_id || \'\'}\n')
            new_lines.append(indent + '         onChange={(e) => handleAssignDriver(b.id, e.target.value)}\n')
            new_lines.append(indent + '      >\n')
            new_lines.append(indent + '         <option value="">-- Sin Asignar --</option>\n')
            new_lines.append(indent + '         {drivers?.map((d: any) => (\n')
            new_lines.append(indent + '            <option key={d.id} value={d.id}>{d.name}</option>\n')
            new_lines.append(indent + '         ))}\n')
            new_lines.append(indent + '      </select>\n')
            new_lines.append(indent + '      {b.driver_id && (\n')
            new_lines.append(indent + '         <div className="flex items-center gap-1.5 px-2 py-1 bg-white/5 rounded-md border border-white/5 w-fit">\n')
            new_lines.append(indent + '            <span className="material-icons-round text-[10px] text-brand-gold">directions_car</span>\n')
            new_lines.append(indent + '            {(() => {\n')
            new_lines.append(indent + '               const bDate = b.pickup_date ? b.pickup_date.split("T")[0] : null;\n')
            new_lines.append(indent + '               const svcShift = bDate && shifts ? shifts.find((s: any) => s.driver_id === b.driver_id && s.date === bDate) : null;\n')
            new_lines.append(indent + '               const svcVehicle = svcShift && vehicles ? vehicles.find((v: any) => v.id === svcShift.vehicle_id) : null;\n')
            new_lines.append(indent + '               return svcVehicle ? (\n')
            new_lines.append(indent + '                  <span className="text-[10px] font-bold text-brand-gold/70">{svcVehicle.plate} <span className="text-brand-platinum/30 font-medium whitespace-nowrap">({svcVehicle.model})</span></span>\n')
            new_lines.append(indent + '               ) : (\n')
            new_lines.append(indent + '                  <span className="text-[9px] text-brand-platinum/30 italic">Sin coche</span>\n')
            new_lines.append(indent + '               );\n')
            new_lines.append(indent + '            })()}\n')
            new_lines.append(indent + '         </div>\n')
            new_lines.append(indent + '      )}\n')
            new_lines.append(indent + '   </div>\n')
            new_lines.append(indent + '</td>\n')
            
            # Now skip the old lines until the next TD
            skip_until_next_td = True
            continue
            
        new_lines.append(line)

    with open(path, 'w', encoding='utf-8') as f:
        f.writelines(new_lines)
    print("ReservasView cleaned and updated")

def clean_dispatch():
    path = r"j:\PALLADIUM TRANSFERS\palladium-operations-hub\views\DispatchConsole.tsx"
    with open(path, 'r', encoding='utf-8') as f:
        lines = f.readlines()
        
    new_lines = []
    skip_p = False
    
    for line in lines:
        if skip_p:
            if '</div>' in line:
                 skip_p = False
                 continue
            continue
            
        if '<div className="overflow-hidden flex-1">' in line:
            indent = "                               " # 31 spaces
            new_lines.append(indent + '<div className="overflow-hidden flex-1">\n')
            new_lines.append(indent + '   <div className="flex justify-between items-center gap-2">\n')
            new_lines.append(indent + '      <p className="text-xs font-black text-white truncate leading-none">{b.passenger}</p>\n')
            new_lines.append(indent + '      {(() => {\n')
            new_lines.append(indent + '         const bDate = b.pickup_date ? b.pickup_date.split("T")[0] : null;\n')
            new_lines.append(indent + '         const svcShift = bDate && shifts ? shifts.find((s: any) => s.driver_id === b.driver_id && s.date === bDate) : null;\n')
            new_lines.append(indent + '         const svcVehicle = svcShift && vehicles ? vehicles.find((v: any) => v.id === svcShift.vehicle_id) : null;\n')
            new_lines.append(indent + '         return svcVehicle ? (\n')
            new_lines.append(indent + '            <span className="text-[8px] font-black bg-white/20 px-1 rounded text-white whitespace-nowrap">{svcVehicle.plate}</span>\n')
            new_lines.append(indent + '         ) : null;\n')
            new_lines.append(indent + '      })()}\n')
            new_lines.append(indent + '   </div>\n')
            new_lines.append(indent + '   <p className="text-[9px] text-white/60 font-medium truncate uppercase tracking-tighter mt-1">{b.origin} -> {b.destination}</p>\n')
            new_lines.append(indent + '</div>\n')
            
            # Skip until the end of the original div
            skip_p = True
            continue
            
        new_lines.append(line)
        
    with open(path, 'w', encoding='utf-8') as f:
        f.writelines(new_lines)
    print("DispatchConsole cleaned and updated")

clean_reservas()
clean_dispatch()
