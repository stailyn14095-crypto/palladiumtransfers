import React, { useState, useEffect } from 'react';
import { useSupabaseData } from '../hooks/useSupabaseData';
import { DataEntryModal } from '../components/DataEntryModal';
import { supabase } from '../services/supabase';

export const TurnosView: React.FC = () => {
   const [activeTab, setActiveTab] = useState<'daily' | 'monthly' | 'config'>('monthly');
   const [currentDate, setCurrentDate] = useState(new Date());
   const { data: drivers, loading: loadingDrivers } = useSupabaseData('drivers');
   const { data: vehicles } = useSupabaseData('vehicles');
   const { data: shifts, loading: loadingShifts, addItem: addShift, deleteItem: deleteShift, refresh: refreshShifts } = useSupabaseData('shifts');
   const { data: shiftTypes, loading: loadingTypes, addItem: addType, deleteItem: deleteType } = useSupabaseData('shift_types');
   const { data: maintenance } = useSupabaseData('vehicle_maintenance');

   const [isModalOpen, setIsModalOpen] = useState(false);
   const [selectedDay, setSelectedDay] = useState<number | null>(null);
   const [selectedDriver, setSelectedDriver] = useState<any>(null);

   const daysInMonth = (month: number, year: number) => new Date(year, month + 1, 0).getDate();
   const monthName = currentDate.toLocaleString('es-ES', { month: 'long', year: 'numeric' });

   const getShiftForDriverAndDay = (driverId: any, day: number) => {
      const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      return shifts?.find((s: any) => s.driver_id === driverId && s.date === dateStr);
   };

   const handleDayClick = (driver: any, day: number) => {
      setSelectedDriver(driver);
      setSelectedDay(day);
      setIsModalOpen(true);
   };

   const changeMonth = (offset: number) => {
      setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + offset, 1));
   };

   const handleSaveShift = async (data: any) => {
      if (!selectedDriver || !selectedDay) return;
      const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`;

      // Check vehicle status warning (Global + Specific Date)
      if (data.vehicle_id) {
         const selectedVehicle = vehicles?.find((v: any) => v.id === data.vehicle_id);

         // 1. Check if vehicle is globally marked as 'Taller'
         let listingWarning = selectedVehicle && selectedVehicle.status === 'Taller';

         // 2. Check if there is a specific maintenance entry for this date/time
         // Determine shift start/end for the selected day
         // Defaulting shift hours to 00:00-23:59 if no specific hours, just to be safe, or use the type's hours
         let shiftStart = new Date(`${dateStr}T00:00:00`);
         let shiftEnd = new Date(`${dateStr}T23:59:59`);

         if (data.hours && data.hours.includes('-')) {
            const [startH, endH] = data.hours.split('-');
            shiftStart = new Date(`${dateStr}T${startH}:00`);
            // Handle night shifts crossing midnight? For now, assume simple same-day or next-day overlap check
            // If endH < startH, it ends next day.
            shiftEnd = new Date(`${dateStr}T${endH}:00`);
            if (shiftEnd < shiftStart) {
               shiftEnd.setDate(shiftEnd.getDate() + 1);
            }
         }

         const activeMaintenance = maintenance?.find((m: any) => {
            if (m.vehicle_id !== data.vehicle_id) return false;

            const mStart = new Date(m.entry_time);
            const mEnd = m.exit_time ? new Date(m.exit_time) : new Date(9999, 11, 31); // Open-ended

            // Check overlap
            return (shiftStart < mEnd && shiftEnd > mStart);
         });

         if (listingWarning || activeMaintenance) {
            const reason = activeMaintenance
               ? `Tiene un registro de taller activo de ${new Date(activeMaintenance.entry_time).toLocaleString()} a ${activeMaintenance.exit_time ? new Date(activeMaintenance.exit_time).toLocaleString() : 'Indefinido'}`
               : 'Consta globalmente como "En Taller"';

            if (!confirm(`⚠️ ADVERTENCIA: El vehículo ${selectedVehicle.plate} (${selectedVehicle.model}) podría no estar disponible.\n\nMotivo: ${reason}\n\n¿Estás seguro de asignarlo?`)) {
               return;
            }
         }

         // 3. Check for specific shift conflict (Vehicle already assigned to another driver in this same shift)
         const shiftConflict = shifts?.find((s: any) =>
            s.date === dateStr &&
            s.vehicle_id === data.vehicle_id &&
            s.driver_id !== selectedDriver.id &&
            s.type === data.type
         );

         if (shiftConflict) {
            const otherDriver = drivers?.find((d: any) => d.id === shiftConflict.driver_id);
            if (!confirm(`⚠️ CONFLICTO: El vehículo ${selectedVehicle.plate} ya está asignado a ${otherDriver?.name || 'otro conductor'} en el turno de ${data.type}.\n\n¿Deseas duplicar la asignación de todos modos?`)) {
               return;
            }
         }
      }
      const existing = getShiftForDriverAndDay(selectedDriver.id, selectedDay);
      if (existing) await deleteShift(existing.id);

      // Find selected shift type to get default hours if not provided or to enforce standard
      const selectedType = shiftTypes?.find((t: any) => t.name === data.type);
      let hours = data.hours;

      // Auto-set hours from type if not manually overridden (or always enforce?)
      // For now, if user didn't type hours, use the type's default
      if (selectedType && (!hours || hours === selectedType.start_time + '-' + selectedType.end_time)) {
         hours = `${selectedType.start_time}-${selectedType.end_time}`;
      }

      // If "Libre", maybe clear hours?
      if (data.type === 'Libre') hours = null;

      await addShift({
         driver_id: selectedDriver.id,
         date: dateStr,
         type: data.type,
         hours: hours,
         vehicle_id: data.vehicle_id
      });
      refreshShifts();
   };

   const handleAddType = async (e: React.FormEvent) => {
      e.preventDefault();
      const form = e.target as HTMLFormElement;
      const name = (form.elements.namedItem('name') as HTMLInputElement).value;
      const start = (form.elements.namedItem('start') as HTMLInputElement).value;
      const end = (form.elements.namedItem('end') as HTMLInputElement).value;
      const color = (form.elements.namedItem('color') as HTMLInputElement).value;

      if (name && start && end) {
         await addType({ name, start_time: start, end_time: end, color });
         form.reset();
      }
   };

   const numDays = daysInMonth(currentDate.getMonth(), currentDate.getFullYear());
   const DAYS_ARRAY = Array.from({ length: numDays }, (_, i) => i + 1);

   const vehicleOptions = vehicles?.map((v: any) => ({
      value: v.id,
      label: `${v.model} (${v.plate})${v.status === 'Taller' ? ' ⚠️ EN TALLER' : ''}`
   })) || [];

   // Prepare options for Types from DB
   const typeOptions = shiftTypes?.map((t: any) => t.name) || ['Morning', 'Afternoon', 'Night', 'OFF']; // Fallback

   // --- BULK ASSIGNMENT LOGIC ---
   const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
   const [bulkData, setBulkData] = useState({
      driverIds: [] as string[],
      type: '',
      vehicle_id: '',
      daysOff: [] as number[], // 0=Sunday, 1=Monday...
      hours: ''
   });

   const toggleBulkDriver = (id: string) => {
      setBulkData(prev => ({
         ...prev,
         driverIds: prev.driverIds.includes(id)
            ? prev.driverIds.filter(d => d !== id)
            : [...prev.driverIds, id]
      }));
   };

   const toggleBulkDayOff = (dayIndex: number) => {
      setBulkData(prev => ({
         ...prev,
         daysOff: prev.daysOff.includes(dayIndex)
            ? prev.daysOff.filter(d => d !== dayIndex)
            : [...prev.daysOff, dayIndex]
      }));
   };

   const handleBulkAssign = async () => {
      if (bulkData.driverIds.length === 0 || !bulkData.type) {
         alert('Por favor selecciona al menos un conductor y un turno.');
         return;
      }

      const targetMonth = currentDate.getMonth();
      const targetYear = currentDate.getFullYear();
      const numDays = daysInMonth(targetMonth, targetYear);

      let createdCount = 0;
      let skippedCount = 0; // Maintenance
      let conflictCount = 0; // Vehicle Occupied
      let skippedDetails: string[] = [];
      let conflictDetails: string[] = [];

      const selectedVehicle = vehicles?.find((v: any) => v.id === bulkData.vehicle_id);

      const selectedType = shiftTypes?.find((t: any) => t.name === bulkData.type);
      let hours = bulkData.hours;
      if (selectedType && (!hours || hours === selectedType.start_time + '-' + selectedType.end_time)) {
         hours = `${selectedType.start_time}-${selectedType.end_time}`;
      }

      // Track newly assigned vehicles in this batch to prevent self-collisions [date_vehicleId]
      const newAssignments = new Set<string>();

      // Iterate Drivers
      for (const driverId of bulkData.driverIds) {
         const driverName = drivers?.find((d: any) => d.id === driverId)?.name || 'Conductor';

         for (let day = 1; day <= numDays; day++) {
            const dateObj = new Date(targetYear, targetMonth, day);
            const dayOfWeek = dateObj.getDay(); // 0=Sun, 1=Mon...
            const dateStr = `${targetYear}-${String(targetMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

            const isDayOff = bulkData.daysOff.includes(dayOfWeek);

            let typeToAssign = isDayOff ? 'Libre' : bulkData.type;
            let vehicleToAssign = isDayOff ? null : bulkData.vehicle_id;
            let hoursToAssign = isDayOff ? null : hours;

            // Checks for Working Days with Vehicle
            if (!isDayOff && vehicleToAssign) {
               // 1. Maintenance Check
               let isMaintenance = false;
               if (selectedVehicle) {
                  let shiftStart = new Date(`${dateStr}T00:00:00`);
                  let shiftEnd = new Date(`${dateStr}T23:59:59`);

                  if (hoursToAssign && hoursToAssign.includes('-')) {
                     const [startH, endH] = hoursToAssign.split('-');
                     shiftStart = new Date(`${dateStr}T${startH}:00`);
                     shiftEnd = new Date(`${dateStr}T${endH}:00`);
                     if (shiftEnd < shiftStart) shiftEnd.setDate(shiftEnd.getDate() + 1);
                  }

                  const activeMaintenance = maintenance?.find((m: any) => {
                     if (m.vehicle_id !== vehicleToAssign) return false;
                     const mStart = new Date(m.entry_time);
                     const mEnd = m.exit_time ? new Date(m.exit_time) : new Date(9999, 11, 31);
                     return (shiftStart < mEnd && shiftEnd > mStart);
                  });

                  if (activeMaintenance) isMaintenance = true;
               }

               if (isMaintenance) {
                  skippedCount++;
                  skippedDetails.push(`${dateStr}: ${driverName} (Taller)`);
                  continue; // Skip creating this shift -> Or create without vehicle? User implied "skip/warn". Let's skip to be safe.
               }

               // 2. Conflict Check (Vehicle already assigned in the SAME SHIFT?)
               // Check against DB shifts (excluding current driver's existing shift which we will overwrite)
               const isOccupiedInDB = shifts?.some((s: any) =>
                  s.date === dateStr &&
                  s.vehicle_id === vehicleToAssign &&
                  s.driver_id !== driverId &&
                  s.type === typeToAssign // Must be same shift to be a true conflict
               );

               // Check against batch assignments we just made
               const isOccupiedInBatch = newAssignments.has(`${dateStr}_${vehicleToAssign}_${typeToAssign}`);

               if (isOccupiedInDB || isOccupiedInBatch) {
                  conflictCount++;
                  conflictDetails.push(`${dateStr}: ${driverName} (Vehículo Ocupado en ${typeToAssign})`);
                  // Fallback: Assign shift WITHOUT vehicle
                  vehicleToAssign = null;
               } else {
                  // Track this assignment including shift type
                  newAssignments.add(`${dateStr}_${vehicleToAssign}_${typeToAssign}`);
               }
            }

            // Delete existing
            const existing = getShiftForDriverAndDay(driverId, day);
            if (existing) await deleteShift(existing.id);

            await addShift({
               driver_id: driverId,
               date: dateStr,
               type: typeToAssign,
               hours: hoursToAssign,
               vehicle_id: vehicleToAssign || null
            });
            createdCount++;
         }
      }

      setIsBulkModalOpen(false);
      refreshShifts();

      let msg = `✅ Proceso Completado:\n• Turnos creados: ${createdCount}`;
      if (skippedCount > 0) {
         msg += `\n\n⚠️ Omitidos por Taller (${skippedCount})`;
      }
      if (conflictCount > 0) {
         msg += `\n\n⚠️ Vehículo Ocupado (${conflictCount}): Se asignó turno SIN vehículo.`;
      }
      alert(msg);
   };

   return (
      <div className="flex-1 flex flex-col h-full bg-[#101822] overflow-hidden">
         <header className="min-h-[5rem] border-b border-slate-800 bg-[#1a2533] px-4 md:px-8 py-4 md:py-0 flex flex-col md:flex-row items-start md:items-center justify-between shrink-0 gap-4 md:gap-0">
            <div>
               <h1 className="text-xl font-bold text-white">Turnos y Planificación</h1>
               <p className="text-xs text-slate-500">Gestión de Cuadrantes y Asignación</p>
            </div>
            <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
               <button
                  onClick={() => {
                     setBulkData({ driverIds: [], type: '', vehicle_id: '', daysOff: [0, 6], hours: '' }); // Default Sat/Sun off
                     setIsBulkModalOpen(true);
                  }}
                  className="flex justify-center items-center gap-2 px-4 py-2 md:py-0 h-10 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-bold shadow-lg shadow-indigo-900/20 transition-all w-full md:w-auto"
               >
                  <span className="material-icons-round text-sm">auto_fix_high</span>
                  Planificar Mes
               </button>
               <div className="flex bg-[#101822] p-1 rounded-lg border border-slate-700 overflow-x-auto custom-scrollbar w-full md:w-auto">
                  <button onClick={() => setActiveTab('daily')} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${activeTab === 'daily' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}>Registro Diario</button>
                  <button onClick={() => setActiveTab('monthly')} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${activeTab === 'monthly' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}>Planificador Mensual</button>
                  <button onClick={() => setActiveTab('config')} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${activeTab === 'config' ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}>Configuración</button>
               </div>
            </div>
         </header>

         <div className="flex-1 overflow-hidden flex flex-col">
            {activeTab === 'monthly' && (
               <>
                  <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-[#1a2533]">
                     <div className="flex items-center gap-4">
                        <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-slate-700 rounded-full text-white transition-colors">
                           <span className="material-icons-round">chevron_left</span>
                        </button>
                        <h2 className="text-lg font-bold text-white capitalize">{monthName}</h2>
                        <button onClick={() => changeMonth(1)} className="p-2 hover:bg-slate-700 rounded-full text-white transition-colors">
                           <span className="material-icons-round">chevron_right</span>
                        </button>
                     </div>
                  </div>

                  <div className="flex-1 overflow-auto custom-scrollbar bg-[#101822] p-6">
                     {loadingDrivers || loadingShifts ? (
                        <div className="text-center text-slate-400 mt-10">Cargando datos...</div>
                     ) : (
                        <div className="min-w-max">
                           <div className="grid grid-cols-[180px_repeat(31,minmax(40px,1fr))] mb-2 bg-[#141e2b] p-2 rounded-t-lg border-b border-slate-700">
                              <div className="text-[10px] font-bold text-slate-500 uppercase flex items-center">Conductor</div>
                              {DAYS_ARRAY.map(d => {
                                 const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), d);
                                 const isSunday = date.getDay() === 0;
                                 return (
                                    <div key={d} className={`text-center text-[10px] font-bold text-slate-500 ${isSunday ? 'border-r-2 border-slate-600' : ''}`}>
                                       {d}
                                    </div>
                                 );
                              })}
                           </div>

                           <div className="space-y-1">
                              {drivers?.map((driver: any) => (
                                 <div key={driver.id} className="grid grid-cols-[180px_repeat(31,minmax(40px,1fr))] bg-[#1a2533] border border-slate-800 rounded group hover:border-blue-500/30 transition-all">
                                    <div className="p-3 border-r border-slate-800 bg-[#141e2b] flex items-center gap-2">
                                       <div className="w-6 h-6 rounded-full bg-blue-600/20 text-blue-400 flex items-center justify-center text-[10px] font-bold">{(driver.name || '?')[0]}</div>
                                       <span className="font-bold text-xs text-white truncate">{(driver.name || 'Sin Nombre').split(' ')[0]}</span>
                                    </div>
                                    {DAYS_ARRAY.map(d => {
                                       const shift = getShiftForDriverAndDay(driver.id, d);
                                       const isOff = shift?.type === 'Libre' || shift?.type === 'OFF';

                                       // Tooltip Info
                                       let tooltip = '';
                                       if (shift) {
                                          const v = vehicles?.find((v: any) => v.id === shift.vehicle_id);
                                          tooltip = `Turno: ${shift.type}\nHorario: ${shift.hours || 'N/A'}\nVehículo: ${v ? `${v.plate} (${v.model})` : 'Ninguno'}`;
                                       }

                                       const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), d);
                                       const isSunday = date.getDay() === 0;

                                       return (
                                          <div
                                             key={d}
                                             onClick={() => handleDayClick(driver, d)}
                                             title={tooltip}
                                             className={`h-10 flex items-center justify-center cursor-pointer hover:bg-blue-600/10 transition-colors ${isOff ? 'bg-slate-900/50' : ''} border-r ${isSunday ? 'border-slate-500 border-r-2' : 'border-slate-800/50'}`}
                                          >
                                             {shift ? (
                                                <div className={`w-full h-full flex items-center justify-center p-0.5`}>
                                                   <div className={`w-full h-full rounded text-[8px] flex items-center justify-center font-bold ${isOff ? 'bg-slate-700 text-slate-400' : 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/20'}`}>
                                                      {isOff ? 'X' : (shift.type || '?')[0]}
                                                   </div>
                                                </div>
                                             ) : <span className="text-[9px] text-slate-800 opacity-0 group-hover:opacity-100">+</span>}
                                          </div>
                                       )
                                    })}
                                 </div>
                              ))}
                           </div>
                        </div>
                     )}
                  </div>
               </>
            )}

            {activeTab === 'daily' && (
               <div className="p-8">
                  <div className="bg-[#1a2533] border border-slate-700 rounded-xl p-8 text-center">
                     <span className="material-icons-round text-4xl text-slate-600 mb-2">timer</span>
                     <p className="text-slate-400">Vista de registro diario disponible próximamente.</p>
                  </div>
               </div>
            )}

            {activeTab === 'config' && (
               <div className="p-8 overflow-auto custom-scrollbar">
                  <div className="max-w-4xl mx-auto space-y-6">
                     <div className="bg-[#1a2533] border border-slate-700 rounded-xl p-6">
                        <h3 className="text-lg font-bold text-white mb-4">Añadir Nuevo Tipo de Turno</h3>
                        <form onSubmit={handleAddType} className="flex flex-col md:flex-row gap-4 items-start md:items-end">
                           <div className="flex-1 w-full md:w-auto">
                              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nombre</label>
                              <input name="name" type="text" placeholder="Ej: Mañana Refuerzo" className="w-full bg-[#101822] border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500 outline-none" required />
                           </div>
                           <div className="w-full md:w-32">
                              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Inicio</label>
                              <input name="start" type="time" className="w-full bg-[#101822] border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500 outline-none" required />
                           </div>
                           <div className="w-full md:w-32">
                              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Fin</label>
                              <input name="end" type="time" className="w-full bg-[#101822] border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500 outline-none" required />
                           </div>
                           <div className="w-full md:w-20">
                              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Color</label>
                              <input name="color" type="color" defaultValue="#10b981" className="w-full h-[38px] bg-[#101822] border border-slate-700 rounded-lg cursor-pointer" />
                           </div>
                           <button type="submit" className="w-full md:w-auto bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-bold transition-colors h-[38px]">Añadir</button>
                        </form>
                     </div>

                     <div className="bg-[#1a2533] border border-slate-700 rounded-xl overflow-x-auto custom-scrollbar">
                        <div className="min-w-[600px]">
                           <table className="w-full text-left text-sm text-slate-400">
                              <thead className="bg-[#141e2b] text-slate-400 font-bold uppercase text-xs">
                                 <tr>
                                    <th className="px-6 py-3">Nombre</th>
                                    <th className="px-6 py-3">Horario</th>
                                    <th className="px-6 py-3">Color</th>
                                    <th className="px-6 py-3 text-right">Acciones</th>
                                 </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-800">
                                 {shiftTypes?.map((type: any) => (
                                    <tr key={type.id} className="hover:bg-slate-800/50 transition-colors">
                                       <td className="px-6 py-3 font-medium text-white">{type.name}</td>
                                       <td className="px-6 py-3">{type.start_time} - {type.end_time}</td>
                                       <td className="px-6 py-3">
                                          <div className="w-6 h-6 rounded border border-slate-600" style={{ backgroundColor: type.color }}></div>
                                       </td>
                                       <td className="px-6 py-3 text-right">
                                          <button onClick={() => deleteType(type.id)} className="text-red-400 hover:text-red-300 transition-colors">
                                             <span className="material-icons-round text-sm">delete</span>
                                          </button>
                                       </td>
                                    </tr>
                                 ))}
                                 {(!shiftTypes || shiftTypes.length === 0) && (
                                    <tr>
                                       <td colSpan={4} className="px-6 py-8 text-center text-slate-600">No hay tipos de turno configurados.</td>
                                    </tr>
                                 )}
                              </tbody>
                           </table>
                        </div>
                     </div>
                  </div>
               </div>
            )}
         </div>

         <DataEntryModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            onSubmit={handleSaveShift}
            initialData={selectedDriver && selectedDay ? getShiftForDriverAndDay(selectedDriver.id, selectedDay) : null}
            title={`Asignar Turno: ${selectedDriver?.name} (${selectedDay} ${monthName})`}
            fields={[
               { name: 'type', label: 'Tipo de Turno', type: 'select', options: typeOptions, required: true },
               { name: 'hours', label: 'Horario (Opcional)', type: 'text', placeholder: 'Se usará el del tipo seleccionado' },
               {
                  name: 'vehicle_id',
                  label: 'Vehículo Asignado',
                  type: 'select',
                  options: vehicleOptions.map(o => o.value),
                  optionLabels: vehicleOptions.map(o => o.label)
               }
            ]}
         />

         {/* CUSTOM BULK ASSIGNMENT MODAL */}
         {isBulkModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
               <div className="bg-[#1a2533] border border-slate-700 rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                  <div className="p-6 border-b border-slate-700 flex justify-between items-center bg-[#141e2b]">
                     <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <span className="material-icons-round text-blue-400">auto_fix_high</span>
                        Planificar Mes Completo ({monthName})
                     </h2>
                     <button onClick={() => setIsBulkModalOpen(false)} className="text-slate-400 hover:text-white transition-colors">
                        <span className="material-icons-round">close</span>
                     </button>
                  </div>

                  <div className="p-6 overflow-y-auto custom-scrollbar space-y-6">
                     {/* DRIVERS MULTI-SELECT */}
                     <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">1. Selecciona Conductores ({bulkData.driverIds.length})</label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-40 overflow-y-auto bg-[#101822] p-3 rounded-lg border border-slate-700">
                           {drivers?.map((d: any) => (
                              <div
                                 key={d.id}
                                 onClick={() => toggleBulkDriver(d.id)}
                                 className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-colors border ${bulkData.driverIds.includes(d.id) ? 'bg-blue-600/20 border-blue-500/50' : 'hover:bg-slate-800 border-transparent'}`}
                              >
                                 <div className={`w-4 h-4 rounded border flex items-center justify-center ${bulkData.driverIds.includes(d.id) ? 'bg-blue-500 border-blue-500' : 'border-slate-600'}`}>
                                    {bulkData.driverIds.includes(d.id) && <span className="material-icons-round text-xs text-white">check</span>}
                                 </div>
                                 <span className={`text-sm ${bulkData.driverIds.includes(d.id) ? 'text-white font-medium' : 'text-slate-400'}`}>
                                    {d.name.split(' ')[0]}
                                 </span>
                              </div>
                           ))}
                        </div>
                     </div>

                     {/* DAYS OFF PATTERN */}
                     <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">2. Días Libres (Se asignará 'Libre' automáticamente)</label>
                        <div className="flex flex-wrap gap-2">
                           {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map((dayName, idx) => {
                              // JS Date.getDay(): 0=Sun, 1=Mon...6=Sat
                              const isSelected = bulkData.daysOff.includes(idx);
                              return (
                                 <button
                                    key={idx}
                                    onClick={() => toggleBulkDayOff(idx)}
                                    className={`flex-1 min-w-[60px] py-2 rounded-lg text-sm font-bold border transition-all ${isSelected ? 'bg-rose-600 border-rose-500 text-white' : 'bg-[#101822] border-slate-700 text-slate-400 hover:border-slate-500'}`}
                                 >
                                    {dayName}
                                 </button>
                              )
                           })}
                        </div>
                     </div>

                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* SHIFT TYPE */}
                        <div>
                           <label className="block text-xs font-bold text-slate-500 uppercase mb-2">3. Turno de Trabajo</label>
                           <select
                              value={bulkData.type}
                              onChange={(e) => setBulkData({ ...bulkData, type: e.target.value })}
                              className="w-full bg-[#101822] border border-slate-700 rounded-lg px-4 py-3 text-white focus:border-blue-500 outline-none appearance-none"
                           >
                              <option value="">Seleccionar Turno...</option>
                              {typeOptions.map((opt: string) => (
                                 <option key={opt} value={opt}>{opt}</option>
                              ))}
                           </select>
                        </div>

                        {/* VEHICLE */}
                        <div>
                           <label className="block text-xs font-bold text-slate-500 uppercase mb-2">4. Vehículo Asignado (Opcional)</label>
                           <select
                              value={bulkData.vehicle_id}
                              onChange={(e) => setBulkData({ ...bulkData, vehicle_id: e.target.value })}
                              className="w-full bg-[#101822] border border-slate-700 rounded-lg px-4 py-3 text-white focus:border-blue-500 outline-none appearance-none"
                           >
                              <option value="">-- Sin Vehículo --</option>
                              {vehicleOptions.map((opt: any) => (
                                 <option key={opt.value} value={opt.value}>{opt.label}</option>
                              ))}
                           </select>
                        </div>
                     </div>
                  </div>

                  <div className="p-6 border-t border-slate-800 bg-[#141e2b] flex justify-end gap-3">
                     <button onClick={() => setIsBulkModalOpen(false)} className="px-4 py-2 text-slate-400 hover:text-white font-bold transition-colors">Cancelar</button>
                     <button
                        onClick={handleBulkAssign}
                        className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold shadow-lg shadow-blue-900/20 transition-all flex items-center gap-2"
                     >
                        <span className="material-icons-round">bolt</span>
                        Ejecutar Planificación
                     </button>
                  </div>
               </div>
            </div>
         )}
      </div >
   );
};
