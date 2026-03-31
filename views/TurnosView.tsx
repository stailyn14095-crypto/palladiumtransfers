import React, { useState, useEffect } from 'react';
import { useSupabaseData } from '../hooks/useSupabaseData';
import { DataEntryModal } from '../components/DataEntryModal';
import { supabase } from '../services/supabase';

export const TurnosView: React.FC = () => {
   const [activeTab, setActiveTab] = useState<'daily' | 'monthly' | 'config'>('monthly');
   const [currentDate, setCurrentDate] = useState(new Date());
   const { data: drivers, loading: loadingDrivers, updateItem: updateDriver } = useSupabaseData('drivers');
   const { data: vehicles } = useSupabaseData('vehicles');
   const { data: shifts, loading: loadingShifts, addItem: addShift, deleteItem: deleteShift, refresh: refreshShifts } = useSupabaseData('shifts');
   const { data: shiftTypes, loading: loadingTypes, addItem: addType, deleteItem: deleteType } = useSupabaseData('shift_types');
   const { data: maintenance } = useSupabaseData('vehicle_maintenance');

   const [isModalOpen, setIsModalOpen] = useState(false);
   const [selectedDay, setSelectedDay] = useState<number | null>(null);
   const [selectedDriver, setSelectedDriver] = useState<any>(null);
   const [plateQuery, setPlateQuery] = useState('');

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

   const vehicleOptions = vehicles?.filter((v: any) => v.status !== 'Baja' && v.status !== 'Inactive').map((v: any) => ({
      value: v.id,
      label: `${v.model} (${v.plate})${v.status === 'Taller' ? ' ⚠️ EN TALLER' : ''}`
   })) || [];

   // Prepare options for Types from DB
   const typeOptions = shiftTypes?.map((t: any) => t.name) || ['Morning', 'Afternoon', 'Night', 'OFF']; // Fallback

   // --- BULK ASSIGNMENT LOGIC ---
   const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
   const [bulkData, setBulkData] = useState({
      driverIds: [] as string[],
      rotationConfig: 'MAÑANA_SIEMPRE',
      patternConfig: 'Siempre 2',
      baseDayOff: 1, // 1 = Monday
      dayShift: '',
      nightShift: '',
      vehicle_id: '',
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

   const handleBulkAssign = async () => {
      if (bulkData.driverIds.length === 0 || !bulkData.dayShift) {
         alert('Por favor selecciona al menos un conductor y un Turno de Día.');
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

      // Track newly assigned vehicles in this batch to prevent self-collisions [date_vehicleId]
      const newAssignments = new Set<string>();

      // Iterate Drivers
      for (const driverId of bulkData.driverIds) {
         const driverName = drivers?.find((d: any) => d.id === driverId)?.name || 'Conductor';

         let contadorSemanas = 1;
         let diaInicioLibre = parseInt(bulkData.baseDayOff as any);

         let turnoActual = "MAÑANA";
         if (bulkData.rotationConfig.includes("NOCHE_SIEMPRE") || bulkData.rotationConfig.includes("NOCHE_PRIMERO")) {
            turnoActual = "NOCHE";
         }
         let alarmaRotacionActivada = false;
         let listoParaRotar = false; 
         let bloquesCompletados = 0;

         for (let day = 1; day <= numDays; day++) {
            const dateObj = new Date(targetYear, targetMonth, day);
            const diaSemana = dateObj.getDay(); // 0=Sun, 1=Mon...
            const dateStr = `${targetYear}-${String(targetMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

            if (day > 1 && diaSemana === diaInicioLibre) contadorSemanas++;

            let esLibre = false;
            if (diaSemana === diaInicioLibre) {
               esLibre = true; // El día base siempre es libre
            } else if (diaSemana === (diaInicioLibre + 1) % 7) {
               // Evaluar el patrón para el segundo día consecutivo
               if (bulkData.patternConfig.includes("Siempre 2")) esLibre = true;
               else if (bulkData.patternConfig === "1-2" && contadorSemanas % 2 === 0) esLibre = true;
               else if (bulkData.patternConfig === "2-1" && contadorSemanas % 2 !== 0) esLibre = true;
            }

            // Cada bloque de 14 días activa la alarma de rotación
            const currentBlock = Math.floor((day - 1) / 14);
            if (currentBlock > bloquesCompletados && bulkData.rotationConfig.includes("PRIMERO") && bulkData.nightShift) {
               alarmaRotacionActivada = true;
               bloquesCompletados = currentBlock;
            }

            if (esLibre) {
               // Si descansa mientras la alarma suena, está listo para rotar al volver
               if (alarmaRotacionActivada) {
                  listoParaRotar = true;
               }
            } else {
               // Si vuelve a trabajar y estaba listo para rotar, cambiamos el turno
               if (listoParaRotar) {
                  turnoActual = (turnoActual === "MAÑANA") ? "NOCHE" : "MAÑANA";
                  alarmaRotacionActivada = false;
                  listoParaRotar = false;
               }
            }

            let typeToAssign = esLibre ? 'Libre' : (turnoActual === "MAÑANA" ? bulkData.dayShift : (bulkData.nightShift || bulkData.dayShift));
            let vehicleToAssign = esLibre ? null : bulkData.vehicle_id;
            let hoursToAssign = esLibre ? null : bulkData.hours;

            // Resolve hours dynamically from the selected type
            if (!hoursToAssign && typeToAssign !== 'Libre') {
               const tType = shiftTypes?.find((t: any) => t.name === typeToAssign);
               if (tType) hoursToAssign = `${tType.start_time}-${tType.end_time}`;
            }

            // Checks for Working Days with Vehicle
            if (!esLibre && vehicleToAssign) {
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
                  continue; // Skip creating this shift
               }

               // 2. Conflict Check (Vehicle already assigned in the SAME SHIFT?)
               const isOccupiedInDB = shifts?.some((s: any) =>
                  s.date === dateStr &&
                  s.vehicle_id === vehicleToAssign &&
                  s.driver_id !== driverId &&
                  s.type === typeToAssign // Must be same shift to be a true conflict
               );

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

   const handleGenerateAll = async (activeDrivers: any[]) => {
      const targetMonth = currentDate.getMonth();
      const targetYear = currentDate.getFullYear();
      const numDays = daysInMonth(targetMonth, targetYear);

      let createdCount = 0;

      // Find best match for Day/Night shifts from DB
      const dayShiftStr = shiftTypes?.find((t: any) => t.name.toLowerCase().includes('mañana') || t.name.toLowerCase().includes('día') || t.name.toLowerCase().includes('dia'))?.name || 'Mañana';
      const nightShiftStr = shiftTypes?.find((t: any) => t.name.toLowerCase().includes('noche'))?.name || 'Noche';

      for (const driver of activeDrivers) {
         let diaInicioLibre = parseInt(driver.rest_day); 
         if (isNaN(diaInicioLibre)) diaInicioLibre = 1; // Default Lunes si no existe
         let patternConfig = driver.pattern || 'Siempre 2';
         let rotationConfig = driver.rotation || 'MAÑANA_SIEMPRE';

         const blockOffset = (diaInicioLibre + 6) % 7; // Map 0=Sun..6=Sat such that Mon=0, Tue=1... Sun=6
         const rotationFrequency = parseInt(driver.rotation_freq) || 2; 

         // Epoch Monday Jan 1 2024 UTC
         const utcEpoch = Date.UTC(2024, 0, 1);

         for (let day = 1; day <= numDays; day++) {
            const dateObj = new Date(targetYear, targetMonth, day);
            const diaSemana = dateObj.getDay(); 
            const dateStr = `${targetYear}-${String(targetMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

            // Calculate absolute day ensuring no TimeZone DST bugs
            const utcCurrent = Date.UTC(targetYear, targetMonth, day);
            const absoluteDay = Math.floor((utcCurrent - utcEpoch) / (1000 * 3600 * 24));
            
            const adjustedDay = absoluteDay - blockOffset;
            const currentWeek = Math.floor(adjustedDay / 7);
            const currentBlock = Math.floor(adjustedDay / (rotationFrequency * 7));

            let esLibre = false;
            let diaSiguienteInicio = (diaInicioLibre + 1) % 7;

            if (diaSemana === diaInicioLibre) {
               esLibre = true;
            } else if (diaSemana === diaSiguienteInicio) {
               // El patrón de libranza define si el segundo día también libras
               if (patternConfig.includes("Siempre 2")) esLibre = true;
               else if (patternConfig === "1-2" && (Math.abs(currentWeek) % 2) === 1) esLibre = true; // Impar -> 2 días
               else if (patternConfig === "2-1" && (Math.abs(currentWeek) % 2) === 0) esLibre = true; // Par -> 2 días
            }

            let typeToAssign = 'Libre';
            if (!esLibre) {
               if (rotationConfig === "MAÑANA_SIEMPRE") typeToAssign = dayShiftStr;
               else if (rotationConfig === "NOCHE_SIEMPRE") typeToAssign = nightShiftStr;
               else {
                  // ROTATIVO
                  const isNoche = (rotationConfig === "MAÑANA_PRIMERO") 
                                    ? ((Math.abs(currentBlock) % 2) !== 0) 
                                    : ((Math.abs(currentBlock) % 2) === 0);
                  typeToAssign = isNoche ? nightShiftStr : dayShiftStr;
               }
            }

            let hoursToAssign = null;
            if (typeToAssign !== 'Libre') {
               const tType = shiftTypes?.find((t: any) => t.name === typeToAssign);
               if (tType) hoursToAssign = `${tType.start_time}-${tType.end_time}`;
            }

            const existing = getShiftForDriverAndDay(driver.id, day);
            if (existing) await deleteShift(existing.id);

            await addShift({
               driver_id: driver.id,
               date: dateStr,
               type: typeToAssign,
               hours: hoursToAssign,
               vehicle_id: null // No vehicle preassigned in global auto-gen
            });
            createdCount++;
         }
      }
      
      refreshShifts();
      alert(`🚀 Planificación completada.\nSe han generado/reemplazado ${createdCount} turnos para toda la flota en ${currentDate.toLocaleString('es-ES', { month: 'long' })}.`);
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
                     setBulkData({ driverIds: [], rotationConfig: 'MAÑANA_SIEMPRE', patternConfig: 'Siempre 2', baseDayOff: 1, dayShift: '', nightShift: '', vehicle_id: '', hours: '' });
                     setIsBulkModalOpen(true);
                  }}
                  className="flex justify-center items-center gap-2 px-4 py-2 md:py-0 h-10 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-bold shadow-lg shadow-indigo-900/20 transition-all w-full md:w-auto"
               >
                  <span className="material-icons-round text-sm">auto_fix_high</span>
                  Planificar Mes
               </button>
               <div className="flex bg-[#101822] p-1 rounded-lg border border-slate-700 overflow-x-auto custom-scrollbar w-full md:w-auto">
                  <button onClick={() => setActiveTab('daily')} className={`px-4 py-1.5 rounded-md text-sm font-medium flex items-center gap-2 transition-colors whitespace-nowrap ${activeTab === 'daily' ? 'bg-orange-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}><span className="material-icons-round text-sm">settings_suggest</span> Config. Flota</button>
                  <button onClick={() => setActiveTab('monthly')} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${activeTab === 'monthly' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}>Planificador Mensual</button>
                  <button onClick={() => setActiveTab('config')} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${activeTab === 'config' ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}>Parámetros Base</button>
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
                     <div className="flex items-center gap-2">
                        <span className="material-icons-round text-slate-400">search</span>
                        <input
                           type="text"
                           placeholder="Buscar por matrícula..."
                           value={plateQuery}
                           onChange={e => setPlateQuery(e.target.value)}
                           className="bg-[#101822] border border-slate-700 rounded-md px-3 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500 w-48"
                        />
                     </div>
                  </div>

                  <div className="flex-1 overflow-auto custom-scrollbar bg-[#101822] p-6">
                     {loadingDrivers || loadingShifts ? (
                        <div className="text-center text-slate-400 mt-10">Cargando datos...</div>
                     ) : (
                        <div className="min-w-max">
                           <div className="grid grid-cols-[220px_repeat(31,minmax(35px,1fr))] mb-2 bg-[#141e2b] p-2 rounded-t-lg border-b border-slate-700">
                              <div className="text-[10px] font-bold text-slate-500 uppercase flex items-center pl-2">Conductor</div>
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
                              {drivers?.filter((d: any) => {
                                 if (d.status === 'Inactive') return false;
                                 if (plateQuery) {
                                    const v = vehicles?.find((veh: any) => veh.id === d.default_vehicle_id);
                                    if (!v || !v.plate.toLowerCase().includes(plateQuery.toLowerCase())) {
                                       return false;
                                    }
                                 }
                                 return true;
                              }).map((driver: any) => (
                                 <div key={driver.id} className="grid grid-cols-[220px_repeat(31,minmax(35px,1fr))] bg-[#1a2533] border border-slate-800 rounded group hover:border-blue-500/30 transition-all">
                                    <div className="p-2 border-r border-slate-800 bg-[#141e2b] flex items-center justify-between gap-2 overflow-hidden">
                                       <div className="flex items-center gap-2 overflow-hidden flex-1">
                                          <div className="w-6 h-6 rounded-full bg-blue-600/20 text-blue-400 flex items-center justify-center text-[10px] font-bold shrink-0">{(driver.name || '?')[0]}</div>
                                          <span className="font-bold text-[11px] text-white truncate w-full" title={driver.name || 'Sin Nombre'}>{driver.name || 'Sin Nombre'}</span>
                                       </div>
                                       {(() => {
                                          const v = vehicles?.find((v: any) => v.id === driver.default_vehicle_id);
                                          return v ? (
                                             <div className="shrink-0 flex items-center pr-1">
                                                <span className="text-[9px] font-black text-white/90 bg-white/10 px-1 py-0.5 rounded shadow-sm border border-white/5">{v.plate}</span>
                                             </div>
                                          ) : null;
                                       })()}
                                    </div>
                                    {DAYS_ARRAY.map(d => {
                                       const shift = getShiftForDriverAndDay(driver.id, d);
                                       const isOff = shift?.type === 'Libre' || shift?.type === 'OFF';
                                       const isNight = shift?.type?.toLowerCase().includes('noche') || shift?.type === 'N';

                                       // Tooltip Info
                                       let tooltip = '';
                                       if (shift) {
                                          const v = vehicles?.find((v: any) => v.id === shift.vehicle_id);
                                          tooltip = `Turno: ${shift.type}\nHorario: ${shift.hours || 'N/A'}\nVehículo: ${v ? `${v.plate} (${v.model})` : 'Ninguno'}`;
                                       }

                                       const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), d);
                                       const isSunday = date.getDay() === 0;

                                       let bgColor = 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/20';
                                       if (isOff) bgColor = 'bg-slate-700 text-slate-400';
                                       else if (isNight) bgColor = 'bg-orange-600/20 text-orange-400 border border-orange-500/20';

                                       return (
                                          <div
                                             key={d}
                                             onClick={() => handleDayClick(driver, d)}
                                             title={tooltip}
                                             className={`h-10 flex items-center justify-center cursor-pointer hover:bg-blue-600/10 transition-colors ${isOff ? 'bg-slate-900/50' : ''} border-r ${isSunday ? 'border-slate-500 border-r-2' : 'border-slate-800/50'}`}
                                          >
                                             {shift ? (
                                                <div className={`w-full h-full flex items-center justify-center p-0.5`}>
                                                   <div className={`w-full h-full rounded text-[8px] flex items-center justify-center font-bold ${bgColor}`}>
                                                      {isOff ? 'X' : (shift.type || '?')[0].toUpperCase()}
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
               <div className="p-8 overflow-auto custom-scrollbar">
                  <div className="max-w-6xl mx-auto space-y-6">
                     <div className="flex items-center justify-between mb-2">
                        <div>
                           <h2 className="text-xl font-bold text-white flex items-center gap-2">
                              <span className="material-icons-round text-orange-400">tune</span>
                              Configuración Maestra de Rotación
                           </h2>
                           <p className="text-sm text-slate-400">Ajusta cómo rotarán los conductores automáticamente.</p>
                        </div>
                        <button
                           className="flex items-center gap-2 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white px-5 py-2.5 rounded-lg font-black uppercase text-sm tracking-wide shadow-[0_0_20px_rgba(234,88,12,0.3)] transition-all"
                           onClick={() => {
                              // We will trigger a macro function here that reads all drivers and handles all at once
                              // This will be added below.
                              if (confirm('¿Estás seguro de que deseas EJECUTAR EL MES COMPLETO para todos los conductores listados? Esto sobreescribirá la planificación actual de las fechas generadas.')) {
                                 const activeDrivers = drivers?.filter((d: any) => d.status === 'Active') || [];
                                 handleGenerateAll(activeDrivers);
                              }
                           }}
                        >
                           <span className="material-icons-round">rocket_launch</span>
                           EJECUTAR MES COMPLETO
                        </button>
                     </div>

                     <div className="bg-[#1a2533] border border-slate-700 rounded-xl overflow-visible shadow-2xl mt-6">
                        <div className="overflow-x-auto w-full pb-4">
                           <table className="w-full text-left text-sm text-slate-300 min-w-[1100px]">
                              <thead className="bg-[#141e2b] border-b border-slate-700">
                                 <tr>
                                    <th className="px-5 py-4 font-bold text-xs uppercase tracking-widest">Conductor</th>
                                    <th className="px-5 py-4 font-bold text-xs uppercase tracking-widest">Vehículo Habitual</th>
                                    <th className="px-5 py-4 font-bold text-xs uppercase tracking-widest">Turno / Rotación</th>
                                    <th className="px-5 py-4 font-bold text-xs uppercase tracking-widest text-center">Frecuencia</th>
                                    <th className="px-5 py-4 font-bold text-xs uppercase tracking-widest text-center">Día Base</th>
                                    <th className="px-5 py-4 font-bold text-xs uppercase tracking-widest">Patrón de Libranza</th>
                                 </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-800/50">
                                 {drivers?.filter((d: any) => d.status === 'Active').map((driver: any) => (
                                    <tr key={driver.id} className="hover:bg-slate-800/80 transition-colors">
                                       <td className="px-5 py-4 font-bold text-indigo-300 flex items-center gap-3">
                                          <div className="w-8 h-8 rounded-full bg-[#101822] border border-slate-700 flex items-center justify-center font-bold text-slate-400">
                                             {driver.name.charAt(0)}
                                          </div>
                                          {driver.name}
                                       </td>
                                       <td className="px-5 py-4">
                                          <select 
                                             value={driver.default_vehicle_id || ''} 
                                             onChange={(e) => updateDriver(driver.id, { default_vehicle_id: e.target.value || null })}
                                             className="w-full bg-[#101822] border border-slate-700 rounded-lg px-3 py-2.5 text-sm focus:border-orange-500 outline-none cursor-pointer shadow-inner"
                                          >
                                             <option value="">Ninguno</option>
                                             {vehicles?.map((v: any) => (
                                                <option key={v.id} value={v.id}>{v.plate} - {v.model}</option>
                                             ))}
                                          </select>
                                       </td>
                                       <td className="px-5 py-4">
                                          <select 
                                             value={driver.rotation || 'MAÑANA_SIEMPRE'} 
                                             onChange={(e) => updateDriver(driver.id, { rotation: e.target.value })}
                                             className="w-full bg-[#101822] border border-slate-700 rounded-lg px-3 py-2.5 text-sm focus:border-orange-500 outline-none cursor-pointer shadow-inner"
                                          >
                                             <option value="MAÑANA_SIEMPRE">DÍA FIJO</option>
                                             <option value="NOCHE_SIEMPRE">NOCHE FIJA</option>
                                             <option value="MAÑANA_PRIMERO">ROTATIVO (EMPIEZA DÍA)</option>
                                             <option value="NOCHE_PRIMERO">ROTATIVO (EMPIEZA NOCHE)</option>
                                          </select>
                                       </td>
                                       <td className="px-5 py-4 text-center">
                                          <select 
                                             value={driver.rotation_freq || 2} 
                                             onChange={(e) => updateDriver(driver.id, { rotation_freq: parseInt(e.target.value) })}
                                             className="w-[140px] bg-[#101822] border border-slate-700 rounded-lg px-3 py-2.5 text-sm focus:border-orange-500 outline-none text-center cursor-pointer shadow-inner"
                                             disabled={driver.rotation?.includes("SIEMPRE")}
                                          >
                                             <option value="1">1 Semana</option>
                                             <option value="2">2 Semanas</option>
                                             <option value="3">3 Semanas</option>
                                             <option value="4">4 Semanas</option>
                                          </select>
                                       </td>
                                       <td className="px-5 py-4 text-center">
                                          <select 
                                             value={driver.rest_day || '1'} 
                                             onChange={(e) => updateDriver(driver.id, { rest_day: e.target.value })}
                                             className="w-[140px] bg-[#101822] border border-slate-700 rounded-lg px-3 py-2.5 text-sm focus:border-orange-500 outline-none text-center cursor-pointer shadow-inner"
                                          >
                                             <option value="1">Lunes</option>
                                             <option value="2">Martes</option>
                                             <option value="3">Miércoles</option>
                                             <option value="4">Jueves</option>
                                             <option value="5">Viernes</option>
                                             <option value="6">Sábado</option>
                                             <option value="0">Domingo</option>
                                          </select>
                                       </td>
                                       <td className="px-5 py-4">
                                          <select 
                                             value={driver.pattern || 'Siempre 2'} 
                                             onChange={(e) => updateDriver(driver.id, { pattern: e.target.value })}
                                             className="w-full bg-[#101822] border border-slate-700 rounded-lg px-3 py-2.5 text-sm focus:border-orange-500 outline-none cursor-pointer shadow-inner"
                                          >
                                             <option value="Siempre 1">Siempre 1 Día Libre</option>
                                             <option value="Siempre 2">Siempre 2 Días Seguidos</option>
                                             <option value="1-2">Alterna: 1 Día (Sem 1) / 2 Días (Sem 2)</option>
                                             <option value="2-1">Alterna: 2 Días (Sem 1) / 1 Día (Sem 2)</option>
                                          </select>
                                       </td>
                                    </tr>
                                 ))}
                                 {(!drivers || drivers.length === 0) && (
                                    <tr><td colSpan={4} className="p-8 text-center text-slate-500">Cargando conductores...</td></tr>
                                 )}
                              </tbody>
                           </table>
                        </div>
                     </div>
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
                           {drivers?.filter((driver: any) => driver.status !== 'Inactive').map((d: any) => (
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

                     {/* ROTATION AND PATTERNS */}
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* ROTATION CONFIG */}
                        <div>
                           <label className="block text-xs font-bold text-slate-500 uppercase mb-2">2. Tipo de Rotación</label>
                           <select
                              value={bulkData.rotationConfig}
                              onChange={(e) => setBulkData({ ...bulkData, rotationConfig: e.target.value })}
                              className="w-full bg-[#101822] border border-slate-700 rounded-lg px-4 py-3 text-white focus:border-blue-500 outline-none appearance-none"
                           >
                              <option value="MAÑANA_SIEMPRE">Siempre Día</option>
                              <option value="NOCHE_SIEMPRE">Siempre Noche</option>
                              <option value="MAÑANA_PRIMERO">Rotativo (Empieza Día)</option>
                              <option value="NOCHE_PRIMERO">Rotativo (Empieza Noche)</option>
                           </select>
                        </div>
                        {/* PATTERN CONFIG */}
                        <div>
                           <label className="block text-xs font-bold text-slate-500 uppercase mb-2">3. Patrón de Libranza</label>
                           <select
                              value={bulkData.patternConfig}
                              onChange={(e) => setBulkData({ ...bulkData, patternConfig: e.target.value })}
                              className="w-full bg-[#101822] border border-slate-700 rounded-lg px-4 py-3 text-white focus:border-blue-500 outline-none appearance-none"
                           >
                              <option value="Siempre 1">Siempre 1 día libre</option>
                              <option value="Siempre 2">Siempre 2 días libres</option>
                              <option value="1-2">Alterna 1 día libre / 2 días libres</option>
                              <option value="2-1">Alterna 2 días libres / 1 día libre</option>
                           </select>
                        </div>
                     </div>

                     <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* BASE DAY OFF */}
                        <div>
                           <label className="block text-xs font-bold text-slate-500 uppercase mb-2">4. Día Base Libranza</label>
                           <select
                              value={bulkData.baseDayOff}
                              onChange={(e) => setBulkData({ ...bulkData, baseDayOff: parseInt(e.target.value) })}
                              className="w-full bg-[#101822] border border-slate-700 rounded-lg px-4 py-3 text-white focus:border-blue-500 outline-none appearance-none"
                           >
                              <option value={1}>Lunes</option>
                              <option value={2}>Martes</option>
                              <option value={3}>Miércoles</option>
                              <option value={4}>Jueves</option>
                              <option value={5}>Viernes</option>
                              <option value={6}>Sábado</option>
                              <option value={0}>Domingo</option>
                           </select>
                        </div>

                        {/* SHIFT TYPE MAÑANA */}
                        <div>
                           <label className="block text-xs font-bold text-slate-500 uppercase mb-2">5. Turno de Día</label>
                           <select
                              value={bulkData.dayShift}
                              onChange={(e) => setBulkData({ ...bulkData, dayShift: e.target.value })}
                              className="w-full bg-[#101822] border border-slate-700 rounded-lg px-4 py-3 text-white focus:border-blue-500 outline-none appearance-none"
                           >
                              <option value="">-- Seleccionar --</option>
                              {typeOptions.map((opt: string) => (
                                 <option key={opt} value={opt}>{opt}</option>
                              ))}
                           </select>
                        </div>

                        {/* SHIFT TYPE NOCHE */}
                        <div>
                           <label className="block text-xs font-bold text-slate-500 uppercase mb-2">6. Turno Noche (Rotativo)</label>
                           <select
                              value={bulkData.nightShift}
                              onChange={(e) => setBulkData({ ...bulkData, nightShift: e.target.value })}
                              disabled={bulkData.rotationConfig.includes('SIEMPRE')}
                              className={`w-full bg-[#101822] border border-slate-700 rounded-lg px-4 py-3 text-white focus:border-blue-500 outline-none appearance-none ${bulkData.rotationConfig.includes('SIEMPRE') ? 'opacity-50 cursor-not-allowed' : ''}`}
                           >
                              <option value="">-- Seleccionar --</option>
                              {typeOptions.map((opt: string) => (
                                 <option key={opt} value={opt}>{opt}</option>
                              ))}
                           </select>
                        </div>
                     </div>

                     <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">7. Asignar Vehículo Fijo (Opcional)</label>
                        <select
                           value={bulkData.vehicle_id}
                           onChange={(e) => setBulkData({ ...bulkData, vehicle_id: e.target.value })}
                           className="w-full bg-[#101822] border border-slate-700 rounded-lg px-4 py-3 text-white focus:border-blue-500 outline-none appearance-none"
                        >
                           <option value="">-- Sin Vehículo Fijo --</option>
                           {vehicleOptions.map((opt: any) => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                           ))}
                        </select>
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
