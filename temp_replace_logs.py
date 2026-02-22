import sys

path = "j:/PALLADIUM TRANSFERS/palladium-operations-hub/views/ReservasView.tsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

target = """                                                                 const bDate = b.pickup_date ? b.pickup_date.split('T')[0] : null;
                                                                 const svcShift = bDate && shifts ? shifts.find((s: any) => s.driver_id === b.driver_id && s.shift_date === bDate) : null;
                                                                 const svcVehicle = svcShift && vehicles ? vehicles.find((v: any) => v.id === svcShift.vehicle_id) : null;"""

replacement = """                                                                 const bDate = b.pickup_date ? b.pickup_date.split('T')[0] : null;
                                                                 console.log('--- Checking Vehicle for Booking ---');
                                                                 console.log('Booking Driver ID:', b.driver_id);
                                                                 console.log('Booking Date:', bDate);
                                                                 
                                                                 let svcShift = null;
                                                                 if (bDate && shifts) {
                                                                     svcShift = shifts.find((s: any) => {
                                                                         const sDate = s.shift_date ? s.shift_date.split('T')[0] : null;
                                                                         console.log('Comparing with shift:', s.id, 'Driver:', s.driver_id, 'Date:', sDate);
                                                                         return s.driver_id === b.driver_id && sDate === bDate;
                                                                     });
                                                                 }
                                                                 console.log('Found Shift:', svcShift);
                                                                 const svcVehicle = svcShift && vehicles ? vehicles.find((v: any) => v.id === svcShift.vehicle_id) : null;
                                                                 console.log('Found Vehicle:', svcVehicle);"""

if target in content:
    with open(path, "w", encoding="utf-8") as f:
        f.write(content.replace(target, replacement))
    print("SUCCESS")
else:
    print("NOT FOUND")
