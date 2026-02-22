import sys

path = "j:/PALLADIUM TRANSFERS/palladium-operations-hub/views/ReservasView.tsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

target = """                                                   <div className="space-y-3">
                                                      <div className="flex items-center gap-3">"""

replacement = """                                                   <div className="space-y-3">
                                                      {b.driver_id && (
                                                         <div className="bg-[#101822] p-3 rounded-lg border border-slate-700 mb-3">
                                                            <span className="text-slate-500 text-[10px] uppercase tracking-widest font-bold block mb-1">Vehículo Asignado (Día del Servicio)</span>
                                                            {(() => {
                                                                const bDate = b.pickup_date ? b.pickup_date.split("T")[0] : null;
                                                                const svcShift = bDate && shifts ? shifts.find((s: any) => s.driver_id === b.driver_id && s.shift_date === bDate) : null;
                                                                const svcVehicle = svcShift && vehicles ? vehicles.find((v: any) => v.id === svcShift.vehicle_id) : null;
                                                                return svcVehicle ? (
                                                                    <span className="text-sm font-bold text-blue-400 flex items-center gap-2">
                                                                       <span className="material-icons-round text-sm">directions_car</span>
                                                                       {svcVehicle.model} - {svcVehicle.plate}
                                                                    </span>
                                                                ) : (
                                                                    <span className="text-sm text-slate-500 italic">No asignado en turnos</span>
                                                                );
                                                            })()}
                                                         </div>
                                                      )}
                                                      <div className="flex items-center gap-3">"""

if target in content:
    with open(path, "w", encoding="utf-8") as f:
        f.write(content.replace(target, replacement))
    print("SUCCESS")
else:
    print("NOT FOUND")
