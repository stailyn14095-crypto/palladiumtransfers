import React, { useState, useMemo } from 'react';
import { useSupabaseData } from '../hooks/useSupabaseData';
import { DataEntryModal } from '../components/DataEntryModal';
import { suggestDriver, detectScheduleConflicts } from '../services/autoAssignment';

export const ReservasView: React.FC = () => {
   const [activeTab, setActiveTab] = useState<'list' | 'availability'>('list');
   const { data: bookings, loading, addItem, updateItem, deleteItem } = useSupabaseData('bookings');
   const { data: drivers } = useSupabaseData('drivers');
   const { data: tariffs } = useSupabaseData('tariffs');
   const { data: vehicles } = useSupabaseData('vehicles');
   const { data: shifts } = useSupabaseData('shifts');
   const { data: clients } = useSupabaseData('clients');
   // Fetch municipalities for type lookup
   const { data: municipalities } = useSupabaseData('municipalities');
   const TOTAL_FLEET = vehicles?.length || 12;

   // Local State for Filters
   const [searchQuery, setSearchQuery] = useState('');
   const [statusFilter, setStatusFilter] = useState('Todos');
   const [hideCompleted, setHideCompleted] = useState(false); // Changed initial value
   const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]); // Changed initial value
   const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]); // Changed initial value
   const [driverFilter, setDriverFilter] = useState('Todos');
   const [vehicleIdFilter, setVehicleIdFilter] = useState('Todos'); // Filter by specific vehicle (plate)
   const [showInactive, setShowInactive] = useState(false); // Toggle for old bookings (> 1 day)

   const [expandedRowId, setExpandedRowId] = useState<string | null>(null);

   const [isModalOpen, setIsModalOpen] = useState(false);
   const [editingItem, setEditingItem] = useState<any>(null);
   // State to hold the current form data, used for dynamic field labels/options
   const [currentFormData, setCurrentFormData] = useState<any>({});

   // Auto-fill logic passed to Modal
   const handleFormDataChange = (newData: any) => {
      // Prevent infinite loop: Only update if strictly necessary
      // We check if relevant fields have actually changed
      if (JSON.stringify(currentFormData) === JSON.stringify(newData)) return;

      if (!municipalities) return;

      // Update local state for dynamic fields
      setCurrentFormData(newData);

      // Handle Client Changes
      if (newData.client_id && newData.client_id !== currentFormData.client_id) {
         const client = (clients as any[])?.find((c: any) => c.id === newData.client_id);
         if (client) {
            newData.client_name = client.name;
         }
      }

      // Price Calculation Logic
      // Only run if origin/dest actually changed to avoid cycles
      if (newData.origin && newData.destination && tariffs &&
         (newData.origin !== currentFormData.origin || newData.destination !== currentFormData.destination)) {
         // Default to Standard if not selected yet, or use current selection
         const vehicleClass = newData.vehicle_class || 'Standard';

         // Find matching tariff
         // We assume tariff has origin, destination, and vehicle_class (or similar)
         // If vehicle_class is not in tariff schema, we just match origin/dest
         const tariff = tariffs.find((t: any) =>
            t.origin === newData.origin &&
            t.destination === newData.destination &&
            // Check for class match if available in tariff object. 
            // Case insensitive check just in case.
            (t.vehicle_class?.toLowerCase() === vehicleClass.toLowerCase() ||
               t.vehicle_type?.toLowerCase() === vehicleClass.toLowerCase() ||
               !t.vehicle_class) // Fallback if no class in tariff
         );

         if (tariff) {
            console.log("Tariff found:", tariff); // Debug
            newData.price = tariff.price;
         }
      }

      // Handle Origin Changes (Address Auto-fill if needed, currently disabled per previous logic)
      if (newData.origin) {
         const originMuni = municipalities.find((m: any) => m.name === newData.origin);
         if (originMuni) {
            newData.origin_municipality = originMuni.name;
         }
      }

      // Handle Destination Changes
      if (newData.destination) {
         const destMuni = municipalities.find((m: any) => m.name === newData.destination);
         if (destMuni) {
            newData.destination_municipality = destMuni.name;
         }
      }
   };

   // Listen for AI Assistant Events


   // Listen for AI Assistant Events
   React.useEffect(() => {
      const handleOpenBookingModal = (event: any) => {
         const data = event.detail;
         console.log("AI Booking Request received:", data);

         // Switch to list view to show the modal context properly
         setActiveTab('list');

         // Pre-fill modal
         setEditingItem({
            passenger: data.passenger || '',
            phone: data.phone || '',
            email: data.email || '',
            pickup_date: data.pickup_date || new Date().toISOString().split('T')[0],
            pickup_time: data.pickup_time || '12:00',
            origin: data.origin || '',
            origin_address: data.origin || '', // Default address to origin name
            destination: data.destination || '',
            destination_address: data.destination || '', // Default address to dest name
            pax_count: data.pax_count || 1,
            notes: data.notes || '',
            status: 'Pending',
            client_name: 'Palladium Transfers S.L.',
            payment_method: 'Efectivo', // Default to Cash
            vehicle_class: 'Standard', // Default to Standard
            // Add other defaults as needed
         });
         setIsModalOpen(true);
      };

      window.addEventListener('open-booking-modal', handleOpenBookingModal);
      return () => window.removeEventListener('open-booking-modal', handleOpenBookingModal);
   }, []);

   // FILTER LOGIC
   const filteredBookings = useMemo(() => {
      if (!bookings) return [];

      // Calculate 1 day ago for "Inactive" logic
      const oneDayAgo = new Date();
      oneDayAgo.setDate(oneDayAgo.getDate() - 1);
      const oneDayAgoStr = oneDayAgo.toISOString().split('T')[0];

      const filtered = bookings.filter((b: any) => {
         // 1. Text Search
         const matchesSearch = !searchQuery ||
            (b.passenger?.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (b.display_id?.toString().includes(searchQuery)) ||
            (b.id?.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (b.email?.toLowerCase().includes(searchQuery.toLowerCase()));

         // 2. Status Filter
         let matchesStatus = statusFilter === 'Todos' || b.status === statusFilter;
         if (hideCompleted && b.status === 'Completed') matchesStatus = false;

         // 3. Date Filter (Fix: Compare YYYY-MM-DD strings)
         const bDate = b.pickup_date ? b.pickup_date.split('T')[0] : '';
         const matchesStartDate = !startDate || (bDate && bDate >= startDate);
         const matchesEndDate = !endDate || (bDate && bDate <= endDate);

         // 4. Inactive Filter (Hide older than 1 day unless showInactive is true)
         let isActive = true;
         if (!showInactive && bDate < oneDayAgoStr) {
            isActive = false;
         }

         const matchesDriver = driverFilter === 'Todos' || b.driver_id === driverFilter;

         let matchesVehicle = true;
         if (vehicleIdFilter !== 'Todos' && vehicles) {
            // Check if the booking's driver_id had this vehicle assigned on the pickup_date
            if (shifts && b.pickup_date) {
               const bDate = b.pickup_date.split('T')[0];
               const serviceShift = shifts.find((s: any) => s.driver_id === b.driver_id && s.date === bDate);
               matchesVehicle = serviceShift?.vehicle_id === vehicleIdFilter;
            } else {
               matchesVehicle = false;
            }
         }

         return matchesSearch && matchesStatus && matchesStartDate && matchesEndDate && matchesDriver && matchesVehicle && isActive;
      });

      // Sort by date and time
      return filtered.sort((a: any, b: any) => {
         const dateA = a.pickup_date || '';
         const dateB = b.pickup_date || '';
         if (dateA !== dateB) return dateA.localeCompare(dateB);

         const timeA = a.pickup_time || '';
         const timeB = b.pickup_time || '';
         return timeA.localeCompare(timeB);
      });
   }, [bookings, searchQuery, statusFilter, hideCompleted, showInactive, startDate, endDate, driverFilter, vehicleIdFilter, vehicles]);

   const handleAssignDriver = async (bookingId: string, driverId: string) => {
      // Handle unassignment
      if (!driverId) {
         try {
            await updateItem(bookingId, {
               driver_id: null,
               assigned_driver_name: null,
               status: 'Pending' // Reset status to Pending when unassigned
            });
         } catch (error) {
            console.error('Error unassigning driver:', error);
            alert('Error al desasignar conductor');
         }
         return;
      }

      const selectedDriver = drivers.find((d: any) => d.id === driverId);
      if (!selectedDriver) return;

      // Conflict Check for manual assignment
      const updatedBookings = bookings.map(b =>
         b.id === bookingId
            ? { ...b, driver_id: driverId, assigned_driver_name: (selectedDriver as any).name }
            : b
      );

      const { messages } = detectScheduleConflicts(updatedBookings);
      if (messages.length > 0) {
         const msg = "⚠️ ATENCIÓN - POSIBLES CONFLICTOS:\n\n" +
            messages.join("\n") +
            "\n\n¿Deseas continuar con la asignación?";
         if (!confirm(msg)) return;
      }

      try {
         await updateItem(bookingId, {
            driver_id: driverId,
            assigned_driver_name: (selectedDriver as any).name,
            status: 'Pending'
         });
      } catch (error) {
         console.error('Error assigning driver:', error);
         alert('Error al asignar conductor');
      }
   };

   const handleBulkUnassign = async () => {
      if (!bookings) return;

      // Target only assigned bookings that are not cancelled or completed (optional, but safer)
      // We use filteredBookings to respect the current view
      const toUnassign = filteredBookings.filter(b => b.driver_id && b.status !== 'Cancelled' && b.status !== 'Completed');

      if (toUnassign.length === 0) {
         alert("No hay reservas asignadas en la vista actual (pendientes de realizar) para desasignar.");
         return;
      }

      const confirmMsg = `¿⚠️ ESTÁS SEGURO?\n\nVas a DESASIGNAR ${toUnassign.length} reservas visibles en este filtro.\n\nEsto dejará las reservas en estado 'Pending' y sin conductor.\n¿Continuar?`;

      if (!confirm(confirmMsg)) return;

      let count = 0;
      for (const booking of toUnassign) {
         try {
            await updateItem(booking.id, {
               driver_id: null,
               assigned_driver_name: null,
               status: 'Pending'
            });
            count++;
         } catch (e) {
            console.error("Error unassigning:", e);
         }
      }

      alert(`✅ Se han desasignado ${count} reservas correctamente.`);
   };

   const handleAutoAssign = async () => {
      if (!bookings || !drivers) return;

      // 0. Detect existing conflicts
      const { messages, conflictIds } = detectScheduleConflicts(filteredBookings);

      if (messages.length > 0) {
         let msg = "";
         let shouldConfirm = false;

         if (conflictIds.length > 0) {
            msg = "🛑 SE HAN DETECTADO CONFLICTOS GRAVES:\n\n" +
               messages.filter(m => m.includes('🛑')).slice(0, 5).join("\n") +
               "\n\n¿Deseas DESASIGNAR las reservas conflictivas y continuar?";
            shouldConfirm = true;
         } else {
            msg = "⚠️ ADVERTENCIA (RETRASOS PERMITIDOS):\n\n" +
               messages.slice(0, 5).join("\n") +
               "\n\nLos retrasos en Aeropuerto (<20 min) se consideran aceptables.\n¿Deseas continuar con la auto-asignación?";
            shouldConfirm = true;
         }

         if (shouldConfirm && !confirm(msg)) return;

         // Unassign only REAL conflicting bookings
         if (conflictIds.length > 0) {
            let unassignedCount = 0;
            for (const id of conflictIds) {
               try {
                  await updateItem(id, {
                     driver_id: null,
                     assigned_driver_name: null,
                     status: 'Pending'
                  });
                  unassignedCount++;
               } catch (e) {
                  console.error("Error unassigning conflict:", e);
               }
            }
            alert(`✅ Se han liberado ${unassignedCount} reservas conflictivas. Procediendo...`);
         }
      }

      // Re-calculate unassigned bookings (Note: filteredBookings might be stale if we just updated. 
      // ideally we wait for Supabase subscription, but that's async. 
      // The user might need to click Auto-Assign again to catch the newly freed ones if they don't appear instantly.
      // To improve this, we can assume the ones we just unassigned are now candidates.)

      // Let's re-fetch or just proceed with what we have known + conflicting ones
      const currentUnassigned = filteredBookings.filter(b => !b.driver_id && b.status !== 'Cancelled');

      // Add the ones we just unassigned (conflictIds) to the list of candidates manually to ensure they are processed
      // We find them in filteredBookings
      const justFreed = filteredBookings.filter(b => conflictIds.includes(b.id));

      const candidates = [...currentUnassigned, ...justFreed];
      // Remove duplicates just in case
      const uniqueCandidates = Array.from(new Set(candidates.map(b => b.id)))
         .map(id => candidates.find(b => b.id === id));

      if (uniqueCandidates.length === 0) {
         alert("No hay reservas pendientes de asignar.");
         return;
      }

      let assignedCount = 0;
      // create a local copy of bookings that we can update in real-time as we assign
      // this ensures that the next iteration sees the driver's new workload/schedule
      let workingBookings = [...(bookings || [])];

      for (const booking of uniqueCandidates) {
         // Force status to Pending for the logic if it was Confirmed
         const bookingToAssign = { ...booking, driver_id: null };

         const suggestion = suggestDriver(bookingToAssign, drivers, workingBookings, vehicles || [], shifts || []);
         if (suggestion) {
            try {
               await updateItem(booking.id, {
                  driver_id: suggestion.id,
                  assigned_driver_name: suggestion.name,
                  status: 'Pending'
               });

               // Update our local working copy so the next iteration knows this driver is busy/has +1 load
               workingBookings = workingBookings.map(b =>
                  b.id === booking.id
                     ? { ...b, driver_id: suggestion.id, assigned_driver_name: suggestion.name, status: 'Pending' }
                     : b
               );

               assignedCount++;
            } catch (err) {
               console.error(`Error auto-asignando reserva ${booking.id}:`, err);
            }
         }
      }

      alert(`✅ Proceso completado.\n\nSe han asignado ${assignedCount} de ${uniqueCandidates.length} reservas automáticamente.`);
   };

   const exportToExcel = () => {
      if (!filteredBookings.length) return;

      // Define all headers
      const headers = [
         'ID', 'Referencia', 'Estado', 'Cliente',
         'Fecha Recogida', 'Hora Recogida',
         'Pasajero', 'Email', 'Teléfono', 'Pax',
         'Origen', 'Dirección Origen', 'Destino', 'Dirección Destino',
         'Vuelo', 'Cartel', 'Categoría Vehículo',
         'Conductor Asignado', 'ID Conductor', 'Vehículo ID',
         'Precio', 'Método Pago', 'Precio Colaborador', 'Cobro Conductor', 'Comisión Agencia', 'Comisión Stripe', 'Código Promo',
         'Notas Oficina', 'Notas Conductor', 'Etiquetas',
         'Creado', 'Lat Origen', 'Lng Origen', 'Lat Destino', 'Lng Destino'
      ];

      const rows = filteredBookings.map((b: any) => [
         b.id,
         b.display_id || '',
         b.status,
         b.client_name,
         // Format date to DD/MM/YYYY to force Excel to treat it as text or correct date without time
         `"${b.pickup_date ? b.pickup_date.split('T')[0].split('-').reverse().join('/') : ''}"`,
         b.pickup_time,
         b.passenger,
         b.email,
         b.phone || '',
         b.pax_count || 1,
         `"${b.origin || ''}"`, // Wrap in quotes to avoid CSV issues with commas
         `"${b.origin_address || ''}"`,
         `"${b.destination || ''}"`,
         `"${b.destination_address || ''}"`,
         b.flight_number || '',
         `"${b.sign_board || ''}"`,
         b.vehicle_class,
         `"${b.assigned_driver_name || ''}"`,
         b.driver_id || '',
         b.vehicle_id || '',
         b.price,
         b.payment_method,
         b.collaborator_price || 0,
         b.driver_price || 0,
         b.agency_commission || 0,
         b.stripe_commission || 0,
         b.promo_code || '',
         `"${(b.office_notes || '').replace(/"/g, '""')}"`, // Escape quotes
         `"${(b.notes || '').replace(/"/g, '""')}"`,
         b.tags || '',
         b.created_at,
         b.origin_lat || '',
         b.origin_lng || '',
         b.destination_lat || '',
         b.destination_lng || ''
      ]);

      // BOM for Excel to read UTF-8 correctly
      const BOM = "\uFEFF";
      const csvContent = BOM + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `reservas_completo_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
   };

   const handleCreateTestBooking = async () => {
      try {
         // Check availability for today at 12:00
         const pickup_date = new Date().toISOString().split('T')[0];
         const pickup_time = "12:00";
         const hour = 12;

         const bookingsAtHour = bookings?.filter((b: any) =>
            b.pickup_date === pickup_date &&
            b.pickup_time && parseInt(b.pickup_time.split(':')[0]) === hour &&
            b.status !== 'Cancelled'
         ).length || 0;

         if (bookingsAtHour >= TOTAL_FLEET) {
            alert(`⚠️ No hay disponibilidad para las ${hour}:00. Capacidad máxima (${TOTAL_FLEET} vehículos) alcanzada.`);
            return;
         }

         const testData = {
            passenger: "TEST - " + Math.floor(Math.random() * 1000),
            email: "test@example.com",
            origin: "Aeropuerto (ALC)",
            origin_address: "Terminal de Llegadas, Aeropuerto (ALC)",
            destination: "Calpe",
            destination_address: "Hotel Test Suite",
            route: "Aeropuerto (ALC) - Calpe",
            pickup_date,
            pickup_time,
            time: new Date(`${pickup_date}T${pickup_time}`).toISOString(),
            client_name: 'Palladium Transfers S.L.',
            status: "Pending",
            price: 120,
            trip_type: "One Way",
            created_at: new Date().toISOString()
         };
         await addItem(testData);
         alert("✅ Reserva de prueba creada con éxito");
      } catch (err: any) {
         console.error(err);
         alert("❌ Error al crear reserva de prueba: " + (err.message || "Error desconocido"));
      }
   };

   // Logic: Availability
   const today = new Date().toISOString().split('T')[0];
   const bookingsToday = bookings ? bookings.filter((b: any) => b.pickup_date && b.pickup_date.startsWith(today)) : [];
   const getSlotStatus = (hour: number) => {
      const timeString = `${hour < 10 ? '0' : ''}${hour}:00`;
      const activeBookings = bookingsToday.filter((b: any) => {
         try {
            if (!b.pickup_time) return false;
            return parseInt(b.pickup_time.split(':')[0]) === hour;
         } catch (e) { return false; }
      }).length;
      const available = TOTAL_FLEET - activeBookings;
      let status: 'OPEN' | 'LIMITED' | 'CLOSED' = 'OPEN';
      if (available <= 0) status = 'CLOSED';
      else if (available <= 3) status = 'LIMITED';
      return { time: timeString, active: activeBookings, available: Math.max(0, available), status };
   };
   const slots = Array.from({ length: 13 }, (_, i) => i + 8).map(h => getSlotStatus(h));

   const fields = useMemo(() => {
      const clientOptions = clients?.map((c: any) => c.id) || [];
      const clientLabels = clients?.map((c: any) => c.name) || [];
      const muniOptions = municipalities?.map((m: any) => m.name) || [];

      return [
         { name: 'passenger', label: 'Pasajero', type: 'text', required: true, section: 'Información Básica' },
         { name: 'email', label: 'Email', type: 'email', required: true, section: 'Información Básica' },
         { name: 'phone', label: 'Teléfono', type: 'text', section: 'Información Básica' },
         { name: 'pax_count', label: 'Pasajeros', type: 'number', required: true, section: 'Información Básica' },

         { name: 'trip_type', label: 'Tipo de Viaje', type: 'select', options: ['One Way', 'Round Trip'], optionLabels: ['Solo Ida', 'Ida y Vuelta'], required: true, section: 'Trayecto e Ida' },
         { name: 'pickup_date', label: 'Fecha Recogida (Ida)', type: 'date', required: true, section: 'Trayecto e Ida' },
         { name: 'pickup_time', label: 'Hora Recogida (Ida)', type: 'time', required: true, section: 'Trayecto e Ida' },
         { name: 'flight_number', label: 'Nº Vuelo / Tren', type: 'text', section: 'Trayecto e Ida' },
         { name: 'origin', label: 'Ciudad Origen', type: 'searchable-select', options: muniOptions, required: true, section: 'Trayecto e Ida' },
         { name: 'origin_address', label: 'Dirección Origen / Hotel / Terminal', type: 'text', required: true, section: 'Trayecto e Ida' },
         { name: 'pickup_address', label: 'Dirección Exacta Recogida', type: 'text', section: 'Trayecto e Ida' },

         { name: 'return_date', label: 'Fecha Vuelta', type: 'date', section: 'Trayecto de Vuelta', hidden: currentFormData.trip_type !== 'Round Trip' },
         { name: 'return_time', label: 'Hora Vuelta', type: 'time', section: 'Trayecto de Vuelta', hidden: currentFormData.trip_type !== 'Round Trip' },

         { name: 'destination', label: 'Ciudad Destino', type: 'searchable-select', options: muniOptions, required: true, section: 'Destino' },
         { name: 'destination_address', label: 'Dirección Destino / Hotel / Terminal', type: 'text', required: true, section: 'Destino' },

         { name: 'vehicle_class', label: 'Categoría Vehículo', type: 'select', options: ['Standard', 'Luxury', 'Van', 'Bus'], required: true, section: 'Despacho' },
         { name: 'status', label: 'Estado', type: 'select', options: ['Pending', 'Confirmed', 'En Route', 'At Origin', 'In Progress', 'Completed', 'Cancelled'], required: true, section: 'Despacho' },
         { name: 'client_id', label: 'Cliente (Agencia/Empresa)', type: 'select', options: ['', ...clientOptions], optionLabels: ['Directo', ...clientLabels], section: 'Despacho' },

         { name: 'payment_method', label: 'Método de Pago', type: 'select', options: ['Efectivo', 'Tarjeta (TPV Conductor)', 'Pre-pagado (Stripe)', 'Facturación Mensual'], required: true, section: 'Precios y Comisiones' },
         { name: 'price', label: 'Precio Total (€)', type: 'number', required: true, section: 'Precios y Comisiones' },
         { name: 'driver_price', label: 'Pago Conductor (€)', type: 'number', section: 'Precios y Comisiones' },
         { name: 'collaborator_price', label: 'Precio Colaborador (€)', type: 'number', section: 'Precios y Comisiones' },
         { name: 'agency_commission', label: 'Comisión Agencia (€)', type: 'number', section: 'Precios y Comisiones' },
         { name: 'stripe_commission', label: 'Comisión Stripe (€)', type: 'number', section: 'Precios y Comisiones' },
         { name: 'promo_code', label: 'Código Promo', type: 'text', section: 'Precios y Comisiones' },

         { name: 'notes', label: 'Notas para Conductor', type: 'textarea', section: 'Notas y Otros' },
         { name: 'office_notes', label: 'Notas de Oficina', type: 'textarea', section: 'Notas y Otros' },
         { name: 'tags', label: 'Etiquetas', type: 'text', section: 'Notas y Otros' },
      ] as any[];
   }, [clients, municipalities, currentFormData.trip_type]);

   const handleSaveBooking = async (data: any) => {
      try {
         // Auto-generate route
         data.route = `${data.origin} - ${data.destination}`;

         if (editingItem) {
            await updateItem(editingItem.id, data);
            alert('✅ Reserva actualizada con éxito');
         } else {
            await addItem({
               ...data,
               created_at: new Date().toISOString()
            });
            alert('✅ Reserva creada con éxito');
         }
         setIsModalOpen(false);
         setEditingItem(null);
         setCurrentFormData({});
      } catch (err: any) {
         console.error('Error saving booking:', err);
         alert('❌ Error al guardar: ' + (err.message || 'Error desconocido'));
      }
   };

   return (
      <div className="flex-1 flex flex-col h-full bg-brand-black overflow-hidden">
         <header className="min-h-[5rem] border-b border-white/5 bg-brand-charcoal px-4 md:px-8 py-4 md:py-0 flex flex-col md:flex-row items-start md:items-center justify-between shrink-0 gap-4 md:gap-0">
            <div>
               <h1 className="text-xl font-bold text-white">Gestión de Reservas</h1>
               <p className="text-xs text-brand-platinum/30">Panel Central de Operaciones</p>
            </div>

            <div className="flex flex-wrap items-center gap-2 md:gap-4 w-full md:w-auto">
               <div className="flex bg-brand-black p-1 rounded-lg border border-white/5 w-full md:w-auto">
                  <button onClick={() => setActiveTab('list')} className={`flex-1 md:flex-none px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${activeTab === 'list' ? 'bg-slate-700 text-white shadow-sm' : 'text-brand-platinum/50 hover:text-white'}`}>Listado</button>
                  <button onClick={() => setActiveTab('availability')} className={`flex-1 md:flex-none px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${activeTab === 'availability' ? 'bg-brand-gold text-white shadow-sm' : 'text-brand-platinum/50 hover:text-white'}`}>Control Flota</button>
               </div>

               <button
                  onClick={() => { setEditingItem(null); setIsModalOpen(true); }}
                  className="w-full md:w-auto px-4 py-2 bg-brand-gold hover:bg-brand-gold/80 text-black rounded-lg text-sm font-bold flex flex-center items-center justify-center gap-2 shadow-lg transition-all active:scale-95"
               >
                  <span className="material-icons-round text-sm">add</span> Nueva Reserva
               </button>
            </div>
         </header>

         <div className="p-4 md:p-8 pb-24 overflow-y-auto custom-scrollbar">
            {activeTab === 'list' ? (
               <>
                  <div className="flex flex-wrap items-end gap-4 mb-6 bg-brand-charcoal p-4 md:p-6 rounded-2xl border border-white/5 shadow-xl">
                     <div className="flex-1 min-w-[100%] sm:min-w-[200px]">
                        <label className="text-[10px] text-brand-platinum/30 font-black uppercase tracking-widest block mb-1.5">Búsqueda Inteligente</label>
                        <input
                           type="text"
                           value={searchQuery}
                           onChange={(e) => setSearchQuery(e.target.value)}
                           placeholder="Nombre, ID, Email..."
                           className="w-full bg-brand-black border border-white/5 rounded-xl px-4 py-2.5 text-sm text-white focus:border-brand-gold outline-none transition-all"
                        />
                     </div>
                     <div className="w-full sm:w-1/3 md:w-32">
                        <label className="text-[10px] text-brand-platinum/30 font-black uppercase tracking-widest block mb-1.5">Estado</label>
                        <select
                           value={statusFilter}
                           onChange={(e) => setStatusFilter(e.target.value)}
                           className="w-full bg-brand-black border border-white/5 rounded-xl px-3 py-2.5 text-sm text-brand-platinum/80 outline-none"
                        >
                           <option className="bg-brand-black text-white">Todos</option>
                           <option className="bg-brand-black text-white">Pending</option>
                           <option className="bg-brand-black text-white">Confirmed</option>
                           <option className="bg-brand-black text-white">En Route</option>
                           <option className="bg-brand-black text-white">At Origin</option>
                           <option className="bg-brand-black text-white">In Progress</option>
                           <option className="bg-brand-black text-white">Completed</option>
                           <option className="bg-brand-black text-white">Cancelled</option>
                        </select>
                     </div>
                     <div className="flex bg-brand-black border border-white/5 rounded-xl overflow-hidden divide-x divide-slate-700 w-full sm:w-auto">
                        <div className="w-1/2 sm:w-32 px-3 py-2">
                           <label className="text-[9px] text-brand-platinum/30 font-black uppercase tracking-widest block mb-0.5">Desde</label>
                           <input
                              type="date"
                              value={startDate}
                              onChange={(e) => setStartDate(e.target.value)}
                              className="w-full bg-brand-black text-xs text-white outline-none"
                              style={{ colorScheme: 'dark' }}
                           />
                        </div>
                        <div className="w-1/2 sm:w-32 px-3 py-2">
                           <label className="text-[9px] text-brand-platinum/30 font-black uppercase tracking-widest block mb-0.5">Hasta</label>
                           <input
                              type="date"
                              value={endDate}
                              onChange={(e) => setEndDate(e.target.value)}
                              className="w-full bg-brand-black text-xs text-white outline-none"
                              style={{ colorScheme: 'dark' }}
                           />
                        </div>
                     </div>

                     <div className="w-full sm:w-auto md:w-40 flex-1 min-w-[140px]">
                        <label className="text-[10px] text-brand-platinum/30 font-black uppercase tracking-widest block mb-1.5">Conductor</label>
                        <select
                           value={driverFilter}
                           onChange={(e) => setDriverFilter(e.target.value)}
                           className="w-full bg-brand-black border border-white/5 rounded-xl px-3 py-2.5 text-sm text-brand-platinum/80 outline-none"
                        >
                           <option value="Todos" className="bg-brand-black text-white">Todos</option>
                           {drivers?.map((d: any) => (
                              <option key={d.id} value={d.id} className="bg-brand-black text-white">{d.name}</option>
                           ))}
                        </select>
                     </div>
                     <div className="w-full sm:w-auto md:w-40 flex-1 min-w-[140px]">
                        <label className="text-[10px] text-brand-platinum/30 font-black uppercase tracking-widest block mb-1.5">Matrícula</label>
                        <select
                           value={vehicleIdFilter}
                           onChange={(e) => setVehicleIdFilter(e.target.value)}
                           className="w-full bg-brand-black border border-white/5 rounded-xl px-3 py-2.5 text-sm text-brand-platinum/80 outline-none"
                        >
                           <option value="Todos" className="bg-brand-black text-white">Todas</option>
                           {vehicles?.map((v: any) => (
                              <option key={v.id} value={v.id} className="bg-brand-black text-white">{v.plate} - {v.model}</option>
                           ))}
                        </select>
                     </div>

                     <div className="flex flex-col gap-1 w-full sm:w-auto md:ml-auto">
                        <div className="flex h-8 items-center gap-2 bg-brand-black border border-white/5 rounded-lg px-3 select-none">
                           <input
                              type="checkbox"
                              id="hideCompleted"
                              checked={hideCompleted}
                              onChange={(e) => setHideCompleted(e.target.checked)}
                              className="w-3.5 h-3.5 rounded border-white/5 bg-slate-800 text-brand-gold focus:ring-blue-500"
                           />
                           <label htmlFor="hideCompleted" className="text-[10px] text-brand-platinum/50 font-bold cursor-pointer uppercase">Ocultar Completadas</label>
                        </div>
                        <div className="flex h-8 items-center gap-2 bg-brand-black border border-white/5 rounded-lg px-3 select-none">
                           <input
                              type="checkbox"
                              id="showInactive"
                              checked={showInactive}
                              onChange={(e) => setShowInactive(e.target.checked)}
                              className="w-3.5 h-3.5 rounded border-white/5 bg-slate-800 text-amber-500 focus:ring-amber-500"
                           />
                           <label htmlFor="showInactive" className="text-[10px] text-amber-500/70 font-bold cursor-pointer uppercase">Mostrar Antiguas</label>
                        </div>
                     </div>
                     <div className="flex flex-wrap gap-2 w-full mt-2 sm:mt-0">
                        <button
                           onClick={exportToExcel}
                           className="flex-1 sm:flex-none h-10 px-4 bg-slate-800 hover:bg-slate-700 text-brand-platinum/80 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all border border-white/5"
                        >
                           <span className="material-icons-round text-sm">download</span> Excel
                        </button>
                        <button
                           onClick={handleAutoAssign}
                           className="flex-1 sm:flex-none h-10 px-4 bg-brand-gold/10 hover:bg-brand-gold/20 text-brand-gold rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all border border-blue-500/20"
                        >
                           <span className="material-icons-round text-sm">auto_fix_high</span> Auto-Asignar
                        </button>
                        <button
                           onClick={handleBulkUnassign}
                           className="flex-1 sm:flex-none h-10 px-4 bg-red-600/10 hover:bg-red-600/20 text-red-400 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all border border-red-500/20"
                           title="Desasignar todas las reservas visibles"
                        >
                           <span className="material-icons-round text-sm">person_off</span> Desasignar Todo
                        </button>
                        <button
                           onClick={handleCreateTestBooking}
                           className="flex-1 sm:flex-none h-10 px-4 bg-purple-600/10 hover:bg-purple-600/20 text-purple-400 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all border border-purple-500/20"
                        >
                           <span className="material-icons-round text-sm">bug_report</span> Test
                        </button>
                     </div>
                  </div>

                  <div className="bg-brand-charcoal border border-white/5 rounded-2xl overflow-hidden shadow-2xl relative">
                     {loading ? (
                        <div className="p-20 text-center text-brand-platinum/50">
                           <div className="animate-spin h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
                           Sincronizando con base de datos...
                        </div>
                     ) : (
                        <div className="overflow-x-auto custom-scrollbar w-full">
                           <div className="min-w-[1000px]">
                              <table className="w-full text-left">
                                 <thead>
                                    <tr className="bg-brand-charcoal/80 text-brand-platinum/30 text-[10px] font-black uppercase tracking-widest border-b border-white/5">
                                       <th className="px-6 py-5">ID / Vuelo</th>
                                       <th className="px-6 py-5">Pasajero</th>
                                       <th className="px-6 py-5">Cliente</th>
                                       <th className="px-6 py-5">Trayecto</th>
                                       <th className="px-6 py-5">Cita</th>
                                       <th className="px-6 py-5 text-brand-gold">Despacho</th>
                                       <th className="px-6 py-5">Estado</th>
                                       <th className="px-6 py-5 text-right">Acciones</th>
                                    </tr>
                                 </thead>
                                 <tbody className="divide-y divide-slate-800 text-sm">
                                    {filteredBookings.length > 0 ? filteredBookings.map((b: any) => (
                                       <React.Fragment key={b.id}>
                                          <tr
                                             className={`transition-colors group cursor-pointer ${expandedRowId === b.id ? 'bg-slate-800/50' : 'hover:bg-slate-800/30'}`}
                                             onClick={() => setExpandedRowId(expandedRowId === b.id ? null : b.id)}
                                          >
                                             <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                   <span className="font-mono text-brand-gold text-xs text-nowrap">#{b.display_id || b.id.slice(0, 6)}</span>
                                                   <span className="text-[10px] text-brand-platinum/30">{b.flight_number || 'S/V'}</span>
                                                </div>
                                             </td>
                                             <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                   <span className="font-bold text-white text-nowrap">{b.passenger}</span>
                                                   <span className="text-[10px] text-brand-platinum/30 truncate max-w-[120px]">{b.email}</span>
                                                </div>
                                             </td>
                                             <td className="px-6 py-4">
                                                <span className="text-brand-platinum/80 text-xs font-semibold">{b.client_name || 'Palladium Transfers S.L.'}</span>
                                             </td>
                                             <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                   <span className="text-slate-200 text-xs">{b.origin}</span>
                                                   <span className="text-[10px] text-brand-platinum/30">{"-> "} {b.destination}</span>
                                                </div>
                                             </td>
                                             <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                   <span className="font-bold text-white text-xs">{b.pickup_date?.split('T')[0]}</span>
                                                   <span className="text-[10px] text-brand-gold">{b.pickup_time}h</span>
                                                </div>
                                             </td>
                                             <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
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
                                             <td className="px-6 py-4">
                                                <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border ${b.status === 'Pending' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
                                                   b.status === 'Confirmed' ? 'bg-blue-500/10 text-brand-gold border-blue-500/20' :
                                                      b.status === 'En Route' || b.status === 'At Origin' || b.status === 'In Progress' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
                                                         b.status === 'Completed' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                                                            'bg-red-500/10 text-red-500 border-red-500/20'
                                                   }`}>{b.status}</span>
                                             </td>
                                             <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                                                <div className="flex justify-end gap-2">
                                                   <button
                                                      onClick={() => { setEditingItem(b); setIsModalOpen(true); }}
                                                      className="w-9 h-9 rounded-xl bg-slate-800 text-brand-platinum/50 hover:text-white hover:bg-slate-700 flex items-center justify-center transition-all"
                                                   >
                                                      <span className="material-icons-round text-base">edit</span>
                                                   </button>
                                                   <button
                                                      onClick={() => { if (confirm('¿Seguro?')) deleteItem(b.id); }}
                                                      className="w-9 h-9 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white flex items-center justify-center transition-all"
                                                   >
                                                      <span className="material-icons-round text-base">delete</span>
                                                   </button>
                                                </div>
                                             </td>
                                          </tr>

                                          {/* EXPANDED ROW DETAIL */}
                                          {expandedRowId === b.id && (
                                             <tr className="bg-[#151e29] border-b border-white/5/50 animate-fadeIn">
                                                <td colSpan={8} className="p-0">
                                                   <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-8">
                                                      {/* 1. Passenger Info */}
                                                      <div className="space-y-4">
                                                         <h4 className="text-xs font-black text-brand-gold uppercase tracking-widest border-b border-white/5 pb-2">Información del Viajero</h4>
                                                         <div className="space-y-2 text-sm text-brand-platinum/80">
                                                            <p><span className="text-brand-platinum/30 text-xs block mb-0.5">Nombre Completo:</span> <span className="font-bold text-white">{b.passenger}</span></p>
                                                            <p><span className="text-brand-platinum/30 text-xs block mb-0.5">Teléfono:</span> {b.phone || 'No registrado'}</p>
                                                            <p><span className="text-brand-platinum/30 text-xs block mb-0.5">Email:</span> {b.email}</p>
                                                            <p><span className="text-brand-platinum/30 text-xs block mb-0.5">Pasajeros:</span> {b.pax_count || 1}</p>
                                                         </div>
                                                      </div>

                                                      {/* 2. Locations */}
                                                      <div className="space-y-4">
                                                         <h4 className="text-xs font-black text-emerald-400 uppercase tracking-widest border-b border-white/5 pb-2">Ubicaciones</h4>
                                                         <div className="space-y-3 text-sm">
                                                            <div>
                                                               <span className="text-brand-platinum/30 text-xs block mb-0.5">Dirección de Recogida:</span>
                                                               <p className="text-white">{b.origin_address || b.origin}</p>
                                                            </div>
                                                            <div>
                                                               <span className="text-brand-platinum/30 text-xs block mb-0.5">Dirección de Destino:</span>
                                                               <p className="text-white">{b.destination_address || b.destination}</p>
                                                            </div>
                                                            {b.notes && (
                                                               <div className="bg-amber-500/10 p-3 rounded-lg border border-amber-500/20 mt-2">
                                                                  <span className="text-amber-500 text-[10px] font-bold uppercase block mb-1">Notas para conductor</span>
                                                                  <p className="text-amber-200 text-xs italic">"{b.notes}"</p>
                                                               </div>
                                                            )}
                                                         </div>
                                                      </div>

                                                      {/* 3. Actions & Meta */}
                                                      <div className="space-y-4">
                                                         <h4 className="text-xs font-black text-purple-400 uppercase tracking-widest border-b border-white/5 pb-2">Gestión</h4>
                                                         <div className="space-y-3">
                                                            {b.driver_id && (
                                                               <div className="bg-brand-black p-3 rounded-lg border border-white/5 mb-3">
                                                                  <span className="text-brand-platinum/30 text-[10px] uppercase tracking-widest font-bold block mb-1">Vehículo Asignado (Día del Servicio)</span>
                                                                  {(() => {
                                                                     const bDate = b.pickup_date ? b.pickup_date.split("T")[0] : null;
                                                                     const svcShift = bDate && shifts ? shifts.find((s: any) => s.driver_id === b.driver_id && s.date === bDate) : null;
                                                                     const svcVehicle = svcShift && vehicles ? vehicles.find((v: any) => v.id === svcShift.vehicle_id) : null;
                                                                     return svcVehicle ? (
                                                                        <span className="text-sm font-bold text-brand-gold flex items-center gap-2">
                                                                           <span className="material-icons-round text-sm">directions_car</span>
                                                                           {svcVehicle.model} - {svcVehicle.plate}
                                                                        </span>
                                                                     ) : (
                                                                        <span className="text-sm text-brand-platinum/30 italic">No asignado en turnos</span>
                                                                     );
                                                                  })()}
                                                               </div>
                                                            )}
                                                            <div className="flex items-center gap-3">
                                                               <div className="flex-1 bg-brand-black p-3 rounded-lg border border-white/5">
                                                                  <span className="text-brand-platinum/30 text-xs block mb-1">Precio</span>
                                                                  <span className="text-xl font-bold text-white">{b.price}€</span>
                                                               </div>
                                                               <div className="flex-1 bg-brand-black p-3 rounded-lg border border-white/5">
                                                                  <span className="text-brand-platinum/30 text-xs block mb-1">Método de Pago</span>
                                                                  <span className="text-sm font-medium text-white">{b.payment_method}</span>
                                                               </div>
                                                               <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5">
                                                                  <div>
                                                                     <span className="text-brand-platinum/30 text-[10px] uppercase font-bold tracking-widest block mb-0.5">Cobro Conductor</span>
                                                                     <span className="text-sm font-medium text-white">
                                                                        {b.actual_payment_method ? (
                                                                           <span className="flex gap-2">
                                                                              <span className="text-emerald-400">Efectivo: {b.cash_amount || 0}€</span> |
                                                                              <span className="text-brand-gold">TPV: {b.tpv_amount || 0}€</span>
                                                                              <span className="text-brand-platinum/30 ml-2">({b.actual_payment_method})</span>
                                                                           </span>
                                                                        ) : (
                                                                           <span className="text-amber-500/50 italic">Pendiente</span>
                                                                        )}
                                                                     </span>
                                                                  </div>
                                                                  <div className="text-right">
                                                                     <span className="text-brand-platinum/30 text-[10px] uppercase font-bold tracking-widest block mb-0.5">Total Cobrado</span>
                                                                     <span className={`text-lg font-black ${b.collected_amount >= b.price ? 'text-emerald-400' : b.collected_amount > 0 ? 'text-amber-400' : 'text-brand-platinum/30'}`}>
                                                                        {b.collected_amount || 0}€
                                                                     </span>
                                                                  </div>
                                                               </div>
                                                            </div>

                                                            <div className="pt-2">
                                                               <label className="flex items-center gap-3 bg-slate-800/50 p-3 rounded-lg cursor-pointer hover:bg-slate-800 transition-colors">
                                                                  <input type="checkbox" className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-brand-gold" defaultChecked />
                                                                  <span className="text-sm text-brand-platinum/80 font-medium">Visible para conductores</span>
                                                               </label>
                                                            </div>

                                                            <div className="flex gap-2 mt-4">
                                                               <button className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold rounded-lg transition-colors">
                                                                  Ver Voucher
                                                               </button>
                                                               <button className="flex-1 py-2 bg-brand-gold/20 hover:bg-brand-gold/30 text-brand-gold text-xs font-bold rounded-lg transition-colors border border-blue-500/20">
                                                                  Email Cliente
                                                               </button>
                                                            </div>
                                                         </div>
                                                      </div>
                                                   </div>
                                                </td>
                                             </tr>
                                          )}
                                       </React.Fragment>
                                    )) : (
                                       <tr><td colSpan={8} className="p-20 text-center text-brand-platinum/30 font-medium">No se encontraron reservas con los filtros actuales</td></tr>
                                    )}
                                 </tbody>
                              </table>
                           </div>
                        </div>
                     )}
                  </div>
               </>
            ) : (
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-20">
                  {slots.map(slot => (
                     <div key={slot.time} className={`bg-brand-charcoal border rounded-2xl p-6 transition-all ${slot.status === 'CLOSED' ? 'border-red-500/20 ring-1 ring-red-500/10' :
                        slot.status === 'LIMITED' ? 'border-amber-500/20 ring-1 ring-amber-500/10' :
                           'border-white/5'
                        }`}>
                        <div className="flex justify-between items-start mb-4">
                           <span className="text-xl font-black text-white">{slot.time}</span>
                           <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest ${slot.status === 'CLOSED' ? 'bg-red-500/10 text-red-500' :
                              slot.status === 'LIMITED' ? 'bg-amber-500/10 text-amber-500' :
                                 'bg-emerald-500/10 text-emerald-500'
                              }`}>{slot.status}</span>
                        </div>
                        <div className="space-y-3">
                           <div className="flex justify-between text-xs">
                              <span className="text-brand-platinum/30">Ocupación</span>
                              <span className="text-white font-bold">{slot.active} Serv.</span>
                           </div>
                           <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                              <div className={`h-full transition-all duration-1000 ${slot.status === 'CLOSED' ? 'bg-red-500' :
                                 slot.status === 'LIMITED' ? 'bg-amber-500' :
                                    'bg-emerald-500'
                                 }`} style={{ width: `${(slot.active / TOTAL_FLEET) * 100}%` }}></div>
                           </div>
                           <div className="flex justify-between text-[10px] font-black uppercase">
                              <span className="text-brand-platinum/30">Disponibles</span>
                              <span className="text-brand-gold">{slot.available} / {TOTAL_FLEET}</span>
                           </div>
                        </div>
                     </div>
                  ))}
               </div>
            )}
         </div>

         <DataEntryModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            onSubmit={handleSaveBooking}
            initialData={editingItem}
            title={editingItem ? 'Editar Reserva' : 'Nueva Reserva Manual'}
            fields={fields}
            onFormDataChange={handleFormDataChange}
         />
      </div>
   );
};
