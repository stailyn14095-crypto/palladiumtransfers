import React, { useState, useMemo } from 'react';
import { useSupabaseData } from '../hooks/useSupabaseData';
import { DataEntryModal } from '../components/DataEntryModal';

const getTodayLocal = () => {
   const date = new Date();
   return date.toLocaleDateString('sv-SE', { timeZone: 'Europe/Madrid' });
};

const getYesterdayLocal = () => {
   const date = new Date();
   date.setDate(date.getDate() - 1);
   return date.toLocaleDateString('sv-SE', { timeZone: 'Europe/Madrid' });
};

const getTomorrowLocal = () => {
   const date = new Date();
   date.setDate(date.getDate() + 1);
   return date.toLocaleDateString('sv-SE', { timeZone: 'Europe/Madrid' });
};

import { suggestDriver, detectScheduleConflicts, getAssignedVehicleForBooking, calculateAvailableAt } from '../services/autoAssignment';
import { supabase } from '../services/supabase';
import { sendCancellationEmail } from '../services/emailService';

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
   const { data: settings, updateItem: updateSetting } = useSupabaseData('system_settings');
   const TOTAL_FLEET = vehicles?.length || 12;

   // Local State for Filters
   const [searchQuery, setSearchQuery] = useState('');
   const [statusFilter, setStatusFilter] = useState('Todos');
   const [hideCompleted, setHideCompleted] = useState(false); // Changed initial value
   const [hideCancelled, setHideCancelled] = useState(true);
   const [startDate, setStartDate] = useState(getYesterdayLocal()); // Default to yesterday
   const [endDate, setEndDate] = useState(getTomorrowLocal()); // Default to tomorrow
   const [driverFilter, setDriverFilter] = useState('Todos');
   const [clientFilter, setClientFilter] = useState('Todos');
   const [vehicleIdFilter, setVehicleIdFilter] = useState('Todos'); // Filter by specific vehicle (plate)
   const [showInactive, setShowInactive] = useState(false); // Toggle for old bookings (> 1 day)

   const [expandedRowId, setExpandedRowId] = useState<string | null>(null);

   const [isModalOpen, setIsModalOpen] = useState(false);
   const [editingItem, setEditingItem] = useState<any>(null);
   // State to hold the current form data, used for dynamic field labels/options
   const [currentFormData, setCurrentFormData] = useState<any>({});

   // Cancel Modal State
   const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
   const [bookingToCancel, setBookingToCancel] = useState<any>(null);
   const [cancelOptions, setCancelOptions] = useState({
      hasCost: false, // false = sin coste (0€), true = con coste (mantiene price)
      unassignDriver: true // true = desasignar y precio colaborador 0€, false = mantener
   });

   // Helper to get prices from tariffs (checks both directions)
   const getTariffPrices = (booking: any) => {
      if (!tariffs || !booking.origin || !booking.destination) return null;

      const vehicleClass = (booking.vehicle_class || 'Standard').toLowerCase();
      // 'class' is the column name in the tariffs table
      const classMatch = (t: any) =>
         !t.class || t.class.toLowerCase() === vehicleClass;

      // Search in both directions: origin->dest and dest->origin
      const routeMatch = (t: any, orig: string, dest: string) =>
         (t.origin === orig && t.destination === dest) ||
         (t.origin === dest && t.destination === orig);

      // Find client-facing tariff for price
      const clientTariff = tariffs.find((t: any) =>
         routeMatch(t, booking.origin, booking.destination) &&
         t.audience_type !== 'Conductor' &&
         classMatch(t)
      );

      // Find driver tariff for collaborator_price
      const driverTariff = tariffs.find((t: any) =>
         routeMatch(t, booking.origin, booking.destination) &&
         t.audience_type === 'Conductor' &&
         classMatch(t)
      );

      if (!clientTariff && !driverTariff) return null;

      let price = clientTariff ? parseFloat(clientTariff.base_price || clientTariff.price || 0) : 0;
      let collabPrice = driverTariff ? parseFloat(driverTariff.base_price || driverTariff.price || 0) : 0;

      const roundTripMultiplier = parseFloat(settings?.find((s: any) => s.key === 'round_trip_multiplier')?.value || '1.8');

      if (booking.trip_type === 'Round Trip') {
         price = Math.round((price * roundTripMultiplier) / 2);
         collabPrice = Math.round((collabPrice * roundTripMultiplier) / 2);
      }

      return { price, collaborator_price: collabPrice };
   };

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
      const hasLocationChanged = newData.origin !== currentFormData.origin || newData.destination !== currentFormData.destination;
      const hasCategoryChanged = newData.vehicle_class !== currentFormData.vehicle_class;
      const hasTripTypeChanged = newData.trip_type !== currentFormData.trip_type;
      const hasDriverAssigned = newData.driver_id && !currentFormData.driver_id;

      if (hasLocationChanged || hasCategoryChanged || hasTripTypeChanged || (hasDriverAssigned && (!newData.collaborator_price || newData.collaborator_price === 0))) {
         const prices = getTariffPrices(newData);
         if (prices) {
            // Only overwrite price if locations/category/trip changed
            if (hasLocationChanged || hasCategoryChanged || hasTripTypeChanged) {
               newData.price = prices.price;
            }
            // Always fill collaborator_price if it's empty and a driver is assigned or route changed
            if (!newData.collaborator_price || newData.collaborator_price === 0 || hasLocationChanged || hasCategoryChanged || hasTripTypeChanged) {
               newData.collaborator_price = prices.collaborator_price;
            }
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
            pickup_date: data.pickup_date || getTodayLocal(),
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

      // Check for pending bookings from other views (lazy loading failsafe)
      if ((window as any).__pendingAiBooking) {
         handleOpenBookingModal({ detail: (window as any).__pendingAiBooking });
         (window as any).__pendingAiBooking = null;
      }

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
         if (hideCancelled && b.status === 'Cancelled') matchesStatus = false;

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
         const matchesClient = clientFilter === 'Todos' || (clientFilter === 'Directo' ? !b.client_id : b.client_id === clientFilter);

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

         return matchesSearch && matchesStatus && matchesStartDate && matchesEndDate && matchesDriver && matchesVehicle && matchesClient && isActive;
      });

      // Sort by date and time
      return filtered.sort((a: any, b: any) => {
         // Sort explicitly by the numeric part if they have one or ID as string
         // This is useful for placing newest at the top, or ordered by pickup
         const dateA = a.pickup_date || '';
         const dateB = b.pickup_date || '';
         if (dateA !== dateB) return dateA.localeCompare(dateB);

         const timeA = a.pickup_time || '';
         const timeB = b.pickup_time || '';
         return timeA.localeCompare(timeB);
      });
   }, [bookings, searchQuery, statusFilter, hideCompleted, hideCancelled, showInactive, startDate, endDate, driverFilter, clientFilter, vehicleIdFilter, vehicles]);

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
         const updates: any = {
            driver_id: driverId,
            assigned_driver_name: (selectedDriver as any).name,
            status: 'Pending'
         };

         // If collaborator_price is 0 or null, try to auto-fill it from tariffs
         const booking = bookings.find(b => b.id === bookingId);
         if (booking && (!booking.collaborator_price || booking.collaborator_price === 0)) {
            const prices = getTariffPrices(booking);
            if (prices && prices.collaborator_price) {
               updates.collaborator_price = prices.collaborator_price;
            }
         }

         await updateItem(bookingId, updates);
         
         supabase.functions.invoke('notify-driver', {
             body: {
                 driver_id: driverId,
                 message: `Tienes un nuevo servicio asignado el ${booking?.pickup_date} a las ${booking?.pickup_time}. Confírmalo en la App.`
             }
         });

         // Advanced RVTC Sync Logic: Handle changes in communications
         const autoSync = settings?.find((s: any) => s.key === 'fomento_auto_sync')?.value === 'true';
         if (autoSync) {
            const updatedBooking = { ...booking, ...updates };
            
            // If already communicated, check if we need to re-sync (plate change)
            if (booking.fomento_status === 'COMUNICADO' && booking.fomento_idservicio) {
               // Determine current and new plates
               const getPlate = (driverId: string) => {
                  const bDate = booking.pickup_date?.split('T')[0];
                  const svcShift = bDate ? shifts?.find((s: any) => s.driver_id === driverId && s.date === bDate) : null;
                  const svcVehicle = svcShift ? vehicles?.find((v: any) => v.id === svcShift.vehicle_id) : null;
                  return svcVehicle?.plate?.replace(/[^a-zA-Z0-9]/g, '') || null;
               };

               const oldPlate = getPlate(booking.driver_id);
               const newPlate = getPlate(driverId);

               if (oldPlate !== newPlate) {
                  console.log("[FOMENTO SYNC] Plate changed, re-syncing...");
                  // 1. Anular old communication
                  await handleAnularFomento(booking, true);
                  // 2. Send new communication
                  await handleComunicarFomento(updatedBooking, true);
               }
            } else {
               // First time communication
               handleComunicarFomento(updatedBooking, true);
            }
         }
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
               const updates: any = {
                  driver_id: suggestion.id,
                  assigned_driver_name: suggestion.name,
                  status: 'Pending'
               };

               // Auto-fill collaborator_price if empty during auto-assign
               if (!booking.collaborator_price || booking.collaborator_price === 0) {
                  const prices = getTariffPrices(booking);
                  if (prices && prices.collaborator_price) {
                     updates.collaborator_price = prices.collaborator_price;
                  }
               }

               await updateItem(booking.id, updates);

               // Update our local working copy so the next iteration knows this driver is busy/has +1 load
               workingBookings = workingBookings.map(b =>
                  b.id === booking.id
                     ? { ...b, driver_id: suggestion.id, assigned_driver_name: suggestion.name, status: 'Pending' }
                     : b
               );

               assignedCount++;

               // Auto-sync RVTC if setting is enabled
               const autoSync = settings?.find((s: any) => s.key === 'fomento_auto_sync')?.value === 'true';
               if (autoSync) {
                  const updatedBooking = { ...booking, ...updates };
                  handleComunicarFomento(updatedBooking, true);
               }
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
      link.setAttribute("download", `reservas_completo_${getTodayLocal()}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
   };

   const handleCreateTestBooking = async () => {
      try {
         // Check availability for today at 12:00 (Local Spanish Time)
         const pickup_date = getTodayLocal();
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

   const handleComunicarFomento = async (booking: any, silent: boolean = false) => {
      console.log("[FOMENTO DEBUG] Iniciando comunicación para reserva:", booking.id);
      try {
         // ✅ FIX: Force name to match Ministry portal exactly (Uppercase, no dots in SL)
         const companyName = (settings?.find((s: any) => s.key === 'company_legal_name')?.value || 'PALLADIUM TRANSFERS SL')
            .toUpperCase()
            .replace(/\./g, '')
            .trim();
         const companyNif = settings?.find((s: any) => s.key === 'company_nif')?.value || 'B26816025';

         // Helper to find municipality codes with robust fallback
         const findMuniCodes = (locName: string, muniName?: string, addressText?: string) => {
            const upper = (locName || '').toUpperCase();
            const upperMuni = (muniName || '').toUpperCase();
            const upperAddress = (addressText || '').toUpperCase();
            
            // 0. Priority for Hubs (Airport/Train/Port)
            if (upper.includes('AEROPUERTO') || upper.includes('AIRPORT') || upperAddress.includes('AEROPUERTO') || upperAddress.includes('AIRPORT')) {
               return { prov: '03', muni: '065' }; // Elche (ALC Airport)
            }

            // 1. Try to find by the specific municipality field if it exists
            let match = (municipalities as any[])?.find(m => 
               m.cod_mun && m.name.toUpperCase() === upperMuni
            );

            // 2. If no match, try to find by the location text
            if (!match && upper) {
               const matches = (municipalities as any[])?.filter(m => 
                  m.cod_mun && (upper.includes(m.name.toUpperCase()) || 
                  m.name.toUpperCase().includes(upper))
               ) || [];
               if (matches.length > 0) {
                  matches.sort((a, b) => {
                     const idxA = upper.indexOf(a.name.toUpperCase());
                     const idxB = upper.indexOf(b.name.toUpperCase());
                     const realA = idxA !== -1 ? idxA : 999;
                     const realB = idxB !== -1 ? idxB : 999;
                     return realA - realB;
                  });
                  match = matches[0];
               }
            }

            // 3. If still no match, try to find in the address text
            if (!match && upperAddress) {
               const matches = (municipalities as any[])?.filter(m => 
                  m.cod_mun && upperAddress.includes(m.name.toUpperCase())
               ) || [];
               if (matches.length > 0) {
                  matches.sort((a, b) => {
                     const idxA = upperAddress.indexOf(a.name.toUpperCase());
                     const idxB = upperAddress.indexOf(b.name.toUpperCase());
                     const realA = idxA !== -1 ? idxA : 999;
                     const realB = idxB !== -1 ? idxB : 999;
                     return realA - realB;
                  });
                  match = matches[0];
               }
            }

            if (match) {
               return { 
                  prov: match.cod_prov || '03', 
                  muni: match.cod_mun || '014' 
               };
            }

            // Fallbacks for common cases if not found
            if (upper.includes('ELCHE') || upper.includes('ELX') || upperAddress.includes('ELCHE') || upperAddress.includes('ELX')) return { prov: '03', muni: '065' };
            if (upper.includes('CAMPELLO') || upperAddress.includes('CAMPELLO')) return { prov: '03', muni: '050' };
            if (upper.includes('BENIDORM') || upperAddress.includes('BENIDORM')) return { prov: '03', muni: '031' };
            if (upper.includes('ALTEA') || upperAddress.includes('ALTEA')) return { prov: '03', muni: '018' };
            if (upper.includes('ALICANTE') || upper.includes('ALC') || upperAddress.includes('ALICANTE') || upperAddress.includes('ALC')) return { prov: '03', muni: '014' };
            
            return { prov: '03', muni: '014' }; 
         };

         const originCodes = findMuniCodes(booking.origin, booking.origin_municipality, booking.origin_address);
         const destCodes = findMuniCodes(booking.destination, booking.destination_municipality, booking.destination_address);
         
         // ✅ FORCE Company NIF for ALL services to avoid Error 51 (unregistered agency NIF)
         // The Ministry requires the contracting party NIF to be in their registry. 
         // By using the company's own NIF, we ensure the communication is always accepted.
         const clientNif = companyNif.replace(/[^a-zA-Z0-9]/g, '');
         let clientContractDate = null;
         
         if (booking.client_id) {
            const client = (clients as any[])?.find(c => c.id === booking.client_id);
            if (client) {
               // We still fetch the contract_date if available
               clientContractDate = client.contract_date;
            }
         }

         // Helper to format plate with hyphen (e.g. 1234ABC -> 1234-ABC)
         const formatPlate = (p: string) => {
            if (!p) return "PENDING";
            const clean = p.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
            // Standard Spanish plate: 4 digits + 3 letters
            if (clean.length === 7 && /^\d{4}[A-Z]{3}$/.test(clean)) {
               return `${clean.slice(0, 4)}-${clean.slice(4)}`;
            }
            return p.trim().toUpperCase();
         };

         // 📍 Location code normalization (ensure 3 digits)
         const formatCode = (c: any) => String(c || '').padStart(3, '0').slice(-3);
         
         const originMuni = formatCode(originCodes.muni);
         let destMuni = formatCode(destCodes.muni);

         // ✅ FIX: Force Elche (065) for Alicante Airport if detected
         if (booking.destination?.toUpperCase().includes('AEROPUERTO') || 
             booking.destination?.toUpperCase().includes('AIRPORT') ||
             booking.destination_address?.toUpperCase().includes('AEROPUERTO')) {
            destMuni = '065';
         }

         // Create the payload for AltaDeServicio based on Fomento requirements (Manual v2.4)
         const payload: any = {
            cgmunicontrato: originMuni, 
            cgmunifin: destMuni,
            cgmuniinicio: originMuni,
            cgprovcontrato: originCodes.prov || '03',
            cgprovfin: destCodes.prov || '03',
            cgprovinicio: originCodes.prov || '03',
            direccionfin: (booking.destination_address || booking.destination || "").substring(0, 100),
            direccioninicio: (booking.origin_address || booking.origin || "").substring(0, 100),
            // ✅ FIX: Use numeric only ID for idcomunica (Max 10 digits for safety)
            idcomunica: `${Math.floor(Math.random() * 1000000000)}`, 
            niftitular: companyNif.replace(/[^A-Z0-9]/g, '').toUpperCase(),
            nombtitular: companyName.toUpperCase(),
            nif: clientNif.replace(/[^A-Z0-9]/g, '').toUpperCase(),
            // ✅ FIX: If we are using the company NIF as contracting party, the name MUST match (Company Name)
            nom: (clientNif === companyNif.replace(/[^a-zA-Z0-9]/g, '') ? companyName.toUpperCase() : (booking.client_name || booking.passenger || "CLIENTE")).substring(0, 50),
            matricula: "PENDING",
            // ✅ FIX: Smart date parsing:
            // - If pickup_date has time component ("T"), parse to local date
            // - If it's a date-only string ("2026-05-17"), use as-is (parsing would give UTC midnight → wrong local date)
            fecinicio: booking.pickup_date ? (
               booking.pickup_date.includes('T')
                  ? new Date(booking.pickup_date).toLocaleDateString('sv-SE')
                  : booking.pickup_date.substring(0, 10)
            ) : "",
            horinicio: booking.pickup_time || "00:00",
            fecfin: booking.pickup_date ? (
               booking.pickup_date.includes('T')
                  ? new Date(booking.pickup_date).toLocaleDateString('sv-SE')
                  : booking.pickup_date.substring(0, 10)
            ) : "",
            horfin: "23:59",
            // ✅ FIX: Force recent contract date and strip timezone
            fcontrato: (() => {
               const baseDate = clientContractDate || booking.created_at || new Date().toISOString();
               const d = new Date(baseDate);
               const now = new Date();
               // If more than 30 days old or in the future, use NOW
               const targetDate = (Math.abs(now.getTime() - d.getTime()) > 30 * 24 * 60 * 60 * 1000) ? now : d;
               return targetDate.toISOString().split('.')[0];
            })()
         };

         // Look up assigned vehicle — multi-tier fallback strategy
         if (booking.driver_id && shifts && vehicles) {
            const bDate = booking.pickup_date
               ? (booking.pickup_date.includes('T')
                  ? new Date(booking.pickup_date).toLocaleDateString('sv-SE')
                  : booking.pickup_date.substring(0, 10))
               : null;

            // Tier 1: Shift on exact booking date
            const exactShift = bDate ? shifts.find((s: any) => s.driver_id === booking.driver_id && s.date === bDate) : null;
            // Tier 2: Any shift for this driver
            const anyShift = !exactShift ? shifts.find((s: any) => s.driver_id === booking.driver_id && s.vehicle_id) : null;
            const targetShift = exactShift || anyShift;
            const svcVehicle = targetShift ? vehicles.find((v: any) => v.id === targetShift.vehicle_id) : null;

            if (svcVehicle?.plate) {
               payload.matricula = formatPlate(svcVehicle.plate);
               if (!exactShift) console.warn(`[FOMENTO] No shift on ${bDate}, using vehicle from other shift: ${payload.matricula}`);
            } else {
               // Tier 3: First vehicle in fleet with a plate (fallback)
               const fallbackVehicle = (vehicles as any[]).find(v => v.plate && v.plate.trim());
               if (fallbackVehicle) {
                  payload.matricula = formatPlate(fallbackVehicle.plate);
                  console.warn(`[FOMENTO] No driver vehicle found, using fleet default: ${payload.matricula}`);
               }
            }
         }


         console.log("[FOMENTO DEBUG] Payload bruto:", JSON.stringify({
            fecinicio: payload.fecinicio,
            horinicio: payload.horinicio,
            fecfin: payload.fecfin,
            matricula: payload.matricula,
            niftitular: payload.niftitular,
         }));
         console.log("[FOMENTO DEBUG] Empresa NIF:", companyNif, "Cliente NIF:", clientNif);

         // ⚠️ VALIDACIÓN: El Ministerio rechaza comunicaciones demasiado próximas al inicio (código 79)
         // Normalizar fecinicio a ISO yyyy-mm-dd para construir el Date correctamente
         const normalizeDateToISO = (d: string): string => {
            if (!d) return d;
            if (d.includes('/')) {
               const parts = d.split('/');
               // dd/mm/yyyy → yyyy-mm-dd
               if (parts[0].length <= 2) return `${parts[2]}-${parts[1].padStart(2,'0')}-${parts[0].padStart(2,'0')}`;
            }
            return d.substring(0, 10);
         };
         const fecinicioISO = normalizeDateToISO(payload.fecinicio);
         console.log(`[FOMENTO DEBUG] fecinicio normalizado: "${fecinicioISO}", horinicio: "${payload.horinicio}", matricula: "${payload.matricula}"`);

         if (fecinicioISO && payload.horinicio) {
            const tripDateStr = `${fecinicioISO}T${payload.horinicio}:00`;
            const tripStart = new Date(tripDateStr);
            const now = new Date();
            const minutesUntilTrip = (tripStart.getTime() - now.getTime()) / 60000;
            console.log(`[FOMENTO DEBUG] tripStart: ${tripStart.toISOString()}, minutesUntilTrip: ${minutesUntilTrip}`);
            
            if (isNaN(minutesUntilTrip)) {
               console.error("[FOMENTO] Invalid tripStart date, check fecinicio format:", payload.fecinicio);
            } else if (minutesUntilTrip < 0) {
               if (!silent) {
                  const proceed = window.confirm(
                     `⚠️ ATENCIÓN: El viaje ya ha comenzado o está en curso.\n\n` +
                     `El Ministerio rechazará esta comunicación (el servicio debe comunicarse ANTES del inicio).\n\n` +
                     `¿Deseas intentarlo igualmente?`
                  );
                  if (!proceed) return;
               } else {

                  return; // En modo silencioso, no enviar viajes pasados
               }
            } else if (minutesUntilTrip < 15) {
               if (!silent) {
                  const proceed = window.confirm(
                     `⚠️ AVISO: El viaje comienza en ${Math.round(minutesUntilTrip)} minutos.\n\n` +
                     `El Ministerio puede rechazar la comunicación si el tiempo es demasiado escaso.\n\n` +
                     `¿Deseas comunicarlo igualmente?`
                  );
                  if (!proceed) return;
               }
            }
         }

         // Get current session for Authorization (with timeout to prevent hanging)
         console.log("[FOMENTO DEBUG] Fetching session...");
         const sessionPromise = supabase.auth.getSession();
         const timeoutPromise = new Promise<{data: any}>((resolve) => setTimeout(() => resolve({ data: { session: null } }), 3000));
         const { data: sessionData } = await Promise.race([sessionPromise, timeoutPromise]);
         const token = sessionData?.session?.access_token;
         console.log("[FOMENTO DEBUG] Session fetch complete, token attached:", !!token);
         
         const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || (window as any)._env_?.VITE_SUPABASE_URL;
         const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || (window as any)._env_?.VITE_SUPABASE_ANON_KEY;

         const fomentoEnvSetting = settings?.find((s: any) => s.key === 'fomento_env');
         const isTestMode = fomentoEnvSetting ? fomentoEnvSetting.value === 'test' : false;
         
         console.log("[FOMENTO DEBUG] Enviando petición a Edge Function...");
         const controller = new AbortController();
         const timeoutId = setTimeout(() => controller.abort(), 20000); // 20s timeout
         
         const response = await fetch(`${supabaseUrl}/functions/v1/fomento-vtc`, {
            method: 'POST',
            signal: controller.signal,
            headers: {
               'Content-Type': 'application/json',
               'Authorization': `Bearer ${token || supabaseAnonKey}`,
               'apikey': supabaseAnonKey
            },
            body: JSON.stringify({ 
               action: 'alta', 
               payload: {
                  ...payload,
                  is_test: isTestMode
               }
            })
         });
         clearTimeout(timeoutId);

         const data = await response.json();
         console.log("[FOMENTO DEBUG] Respuesta completa:", data);
         if (data.signedXml) {
            console.log("[FOMENTO DEBUG] XML ENVIADO:", data.signedXml);
         }

         if (!response.ok || !data.success) {
            const errorDetail = data.body || data.error || data.resultado || "Error desconocido";
            console.error("📄 [FOMENTO ERROR DATA]", data);
            console.error("📄 [FOMENTO RAW XML RESPUESTA]", data.rawResponse || "(vacío)");
            console.error("📄 [FOMENTO RESULTADO]", data.resultado, "| iderror implícito en rawResponse");
            throw new Error(`Error RVTC: ${errorDetail}`);
         }

         // Update local and remote state
         console.log("[FOMENTO DEBUG] Guardando ID de servicio:", data.idservicio);
         await updateItem(booking.id, {
            fomento_status: 'COMUNICADO',
            fomento_idservicio: data.idservicio,
            fomento_idcomunica: data.idcomunica,
            fomento_error: null
         });

         if (!silent) alert("✅ Comunicación con Fomento RVTC exitosa.\nID Servicio: " + data.idservicio);

      } catch (err: any) {
         console.error("Error Fomento:", err);
         const isTimeout = err.name === 'AbortError';
         const errorMsg = isTimeout ? 'Tiempo de espera agotado (el Ministerio o el proxy no responde)' : (err.message || 'Error desconocido');
         
         await updateItem(booking.id, {
            fomento_status: 'ERROR',
            fomento_error: errorMsg
         });
         if (!silent) alert("❌ Error al comunicar con Fomento:\n" + errorMsg);
      }
   };



   const handleAnularFomento = async (booking: any, silent: boolean = false) => {
      console.log("[FOMENTO DEBUG] Iniciando ANULACIÓN para reserva:", booking.id);
      if (!booking.fomento_idservicio) {
         if (!silent) alert("⚠️ Esta reserva no tiene un ID de servicio de Fomento para anular.");
         return;
      }

      try {
         // Get current session for Authorization (with timeout to prevent hanging)
         console.log("[FOMENTO DEBUG] Fetching session...");
         const sessionPromise = supabase.auth.getSession();
         const timeoutPromise = new Promise<{data: any}>((resolve) => setTimeout(() => resolve({ data: { session: null } }), 3000));
         const { data: sessionData } = await Promise.race([sessionPromise, timeoutPromise]);
         const token = sessionData?.session?.access_token;
         console.log("[FOMENTO DEBUG] Session fetch complete, token attached:", !!token);
         
         const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || (window as any)._env_?.VITE_SUPABASE_URL;
         const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || (window as any)._env_?.VITE_SUPABASE_ANON_KEY;

         const fomentoEnvSetting = settings?.find((s: any) => s.key === 'fomento_env');
         const isTestMode = fomentoEnvSetting ? fomentoEnvSetting.value === 'test' : false;
         
         console.log("[FOMENTO DEBUG] Enviando petición de anulación a Edge Function...");
         const controller = new AbortController();
         const timeoutId = setTimeout(() => controller.abort(), 20000); // 20s timeout
         
         const response = await fetch(`${supabaseUrl}/functions/v1/fomento-vtc`, {
            method: 'POST',
            signal: controller.signal,
            headers: {
               'Content-Type': 'application/json',
               'Authorization': `Bearer ${token || supabaseAnonKey}`,
               'apikey': supabaseAnonKey
            },
            body: JSON.stringify({ 
               action: 'anulacion', 
               payload: { 
                  idservicio: booking.fomento_idservicio,
                  is_test: isTestMode
               } 
            })
         });
         clearTimeout(timeoutId);

         const data = await response.json();

         if (data.success) {
            await updateItem(booking.id, {
               fomento_status: 'ANULADO',
               fomento_error: null
            });
            if (!silent) alert("✅ Comunicación ANULADA en Fomento RVTC.");
            return true;
         } else {
            throw new Error(data.error || data.resultado || "Error al anular");
         }
      } catch (err: any) {
         console.error("Error Anulación Fomento:", err);
         if (!silent) alert("❌ Error al anular en Fomento:\n" + err.message);
         return false;
      }
   };

   const confirmCancelBooking = async () => {
      if (!bookingToCancel) return;

      try {
         const updates: any = {
            status: 'Cancelled'
         };

         if (!cancelOptions.hasCost) {
            // Cancelar sin coste: Todos los importes y comisiones a 0
            updates.price = 0;
            updates.agency_commission = 0;
            updates.stripe_commission = 0;
            updates.collected_amount = 0;
         }

         if (cancelOptions.unassignDriver) {
            // Desasignar conductor y no pagarle
            updates.driver_id = null;
            updates.assigned_driver_name = null;
            updates.driver_price = 0;
            updates.collaborator_price = 0;
         } else if (!cancelOptions.hasCost) {
            // Si no desasigna conductor PERO es sin coste general, 
            // probablemente también queramos o no pagarle? Por defecto, si eligen no desasignarlo pero sí "sin coste", 
            // suele implicar que se le paga su "vacío". Mantendremos los importes originales del conductor en ese caso.
         }

         await updateItem(bookingToCancel.id, updates);

         // Auto-Anular in Fomento if previously communicated
         if (bookingToCancel.fomento_status === 'COMUNICADO') {
            handleAnularFomento(bookingToCancel, true);
         }

         setIsCancelModalOpen(false);

         // Send cancellation email in the background
         sendCancellationEmail(bookingToCancel);

         setBookingToCancel(null);

         // Mostrar toast o alert nativo
         alert('✅ Reserva cancelada correctamente.');
      } catch (err: any) {
         console.error('Error canceling booking:', err);
         alert('❌ Error al cancelar reserva: ' + (err.message || 'Desconocido'));
      }
   };

   const openCancelModal = (booking: any) => {
      setBookingToCancel(booking);
      // Reset options to safe defaults
      setCancelOptions({ hasCost: false, unassignDriver: true });
      setIsCancelModalOpen(true);
   };

   // Logic: Availability
   const availabilityConfig = useMemo(() => {
      const selectedDate = startDate;
      const bookingsForDate = bookings ? bookings.filter((b: any) => b.pickup_date && b.pickup_date.startsWith(selectedDate) && b.status !== 'Cancelled') : [];
      
      // Calculate dynamic fleet capacity for the day
      let dayCapacity = vehicles?.filter((v: any) => v.status === 'Operativo').length || 12;
      
      if (shifts) {
          const shiftsThisDay = shifts.filter((s: any) => s.date === selectedDate && s.type !== 'Libre' && s.type !== 'OFF');
          if (shiftsThisDay.length > 0) {
              const uniqueVehicles = new Set(shiftsThisDay.map((s: any) => s.vehicle_id).filter(Boolean));
              const uniqueDrivers = new Set(shiftsThisDay.map((s: any) => s.driver_id).filter(Boolean));
              // Ensure capacity meets at least the hardware allocated or personnel assigned
              dayCapacity = Math.max(uniqueVehicles.size, uniqueDrivers.size, 1);
          }
      }

      const getSlotStatus = (hour: number) => {
         const timeString = `${hour < 10 ? '0' : ''}${hour}:00`;
         const slotStartTs = new Date(`${selectedDate}T${timeString}`).getTime();
         const slotEndTs = slotStartTs + 3600000; // +1 hour

         const activeBookings = bookingsForDate.filter((b: any) => {
            try {
               if (!b.pickup_time) return false;
               const bStart = new Date(`${b.pickup_date.split('T')[0]}T${b.pickup_time}`).getTime();
               let bEnd = bStart + 3600000; // default 1 hour block
               if (b.origin && b.destination) {
                  // Real calculation combining wait times and travel distances from AI Engine
                  const endDate = calculateAvailableAt(b);
                  if (endDate) bEnd = endDate.getTime();
               }
               // Check Overlap: Starts before the slot ends, and ends after the slot starts
               return bStart < slotEndTs && bEnd > slotStartTs;
            } catch (e) { return false; }
         }).length;
         
         const available = dayCapacity - activeBookings;
         let status: 'OPEN' | 'LIMITED' | 'CLOSED' = 'OPEN';
         if (available <= 0) status = 'CLOSED';
         else if (available <= Math.ceil(dayCapacity * 0.2)) status = 'LIMITED'; // Only 20% left
         
         return { time: timeString, active: activeBookings, available: Math.max(0, available), status, capacity: dayCapacity };
      };
      
      const slots = Array.from({ length: 24 }, (_, i) => i).map(h => getSlotStatus(h));
      return { slots, capacity: dayCapacity };
   }, [bookings, startDate, shifts, vehicles]);

   const { slots, capacity: dynamicCapacity } = availabilityConfig;

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

         { name: 'destination', label: 'Ciudad Destino', type: 'searchable-select', options: muniOptions, required: true, section: 'Destino' },
         { name: 'destination_address', label: 'Dirección Destino / Hotel / Terminal', type: 'text', required: true, section: 'Destino' },

         { name: 'vehicle_class', label: 'Categoría Vehículo', type: 'select', options: ['Standard', 'Luxury', 'Van', 'Bus'], required: true, section: 'Despacho' },
         { name: 'status', label: 'Estado', type: 'select', options: ['Pending', 'Confirmed', 'En Route', 'At Origin', 'In Progress', 'Completed', 'Cancelled'], required: true, section: 'Despacho' },
         { name: 'client_id', label: 'Cliente (Agencia/Empresa)', type: 'select', options: ['', ...clientOptions], optionLabels: ['Directo', ...clientLabels], section: 'Despacho' },

         { name: 'payment_method', label: 'Método de Pago', type: 'select', options: ['Efectivo', 'Tarjeta (TPV Conductor)', 'Pre-pagado (Stripe)', 'Facturación Mensual'], required: true, section: 'Precios y Comisiones' },
         { name: 'price', label: 'Precio Total (€)', type: 'number', required: true, section: 'Precios y Comisiones' },
         { name: 'driver_price', label: 'Cobro al Cliente (€)', type: 'number', section: 'Precios y Comisiones' },
         { name: 'collaborator_price', label: 'Comisión Colaborador (€)', type: 'number', section: 'Precios y Comisiones', tooltip: 'Comisión que se llevará el colaborador/conductor por realizar el traslado' },
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
         // Parse tags into array if string
         if (data.tags && typeof data.tags === 'string') {
            data.tags = data.tags.split(',').map((t: string) => t.trim()).filter((t: string) => t.length > 0);
         } else if (!data.tags) {
            data.tags = [];
         }

         // Auto-generate route
         data.route = `${data.origin} - ${data.destination}`;

         // Ensure municipality fields are explicitly populated to prevent null values in DB
         if (data.origin && municipalities) {
            const originMuni = municipalities.find((m: any) => m.name === data.origin);
            if (originMuni) {
               data.origin_municipality = originMuni.name;
            }
         }
         if (data.destination && municipalities) {
            const destMuni = municipalities.find((m: any) => m.name === data.destination);
            if (destMuni) {
               data.destination_municipality = destMuni.name;
            }
         }

         let requiresDriverNotification = false;

         if (editingItem) {
            // Check if fomento needs re-communication due to changes
            if (editingItem.fomento_status === 'COMUNICADO' && editingItem.fomento_idservicio) {
                // If driver changes or pickup time/date changes
                if (data.driver_id !== editingItem.driver_id || data.pickup_time !== editingItem.pickup_time || data.pickup_date !== editingItem.pickup_date) {
                    const confirmRes = window.confirm("La reserva ya está comunicada en Fomento. Al cambiar conductor, fecha u hora, se anulará la comunicación actual y deberás recomunicarla. ¿Proceder?");
                    if (!confirmRes) return; // Abort save
                    
                    const success = await handleAnularFomento(editingItem, true);
                    if (!success) {
                        alert("❌ No se pudo anular en Fomento. El guardado se ha cancelado por seguridad.");
                        return; // Abort save
                    }
                    
                    // Reset Fomento fields in 'data' so it saves as pending
                    data.fomento_status = null;
                    data.fomento_idservicio = null;
                    data.fomento_error = null;
                    requiresDriverNotification = true;
                }
            }

            await updateItem(editingItem.id, data);
            alert('✅ Reserva actualizada con éxito');
            
            if (requiresDriverNotification && data.driver_id) {
               // Notify driver asynchronously
               supabase.functions.invoke('notify-driver', {
                   body: {
                       driver_id: data.driver_id,
                       message: `Tu servicio del ${data.pickup_date} a las ${data.pickup_time} ha sido modificado. Revísalo y confírmalo de nuevo.`
                   }
               });
            }
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

                     <div className="w-full sm:w-auto md:w-32 flex-1 min-w-[120px]">
                        <label className="text-[10px] text-brand-platinum/30 font-black uppercase tracking-widest block mb-1.5">Cliente</label>
                        <select
                           value={clientFilter}
                           onChange={(e) => setClientFilter(e.target.value)}
                           className="w-full bg-brand-black border border-white/5 rounded-xl px-3 py-2.5 text-sm text-brand-platinum/80 outline-none"
                        >
                           <option value="Todos" className="bg-brand-black text-white">Todos</option>
                           <option value="Directo" className="bg-brand-black text-white">Directo</option>
                           {clients?.map((c: any) => (
                              <option key={c.id} value={c.id} className="bg-brand-black text-white">{c.name}</option>
                           ))}
                        </select>
                     </div>
                     <div className="w-full sm:w-auto md:w-40 flex-1 min-w-[140px]">
                        <label className="text-[10px] text-brand-platinum/30 font-black uppercase tracking-widest block mb-1.5">Conductor</label>
                        <select
                           value={driverFilter}
                           onChange={(e) => setDriverFilter(e.target.value)}
                           className="w-full bg-brand-black border border-white/5 rounded-xl px-3 py-2.5 text-sm text-brand-platinum/80 outline-none"
                        >
                           <option value="Todos" className="bg-brand-black text-white">Todos</option>
                           {drivers?.filter((d: any) => d.status !== 'Inactive' && d.status !== 'Baja').map((d: any) => (
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
                              id="hideCancelled"
                              checked={hideCancelled}
                              onChange={(e) => setHideCancelled(e.target.checked)}
                              className="w-3.5 h-3.5 rounded border-white/5 bg-slate-800 text-red-500 focus:ring-red-500"
                           />
                           <label htmlFor="hideCancelled" className="text-[10px] text-red-500/50 font-bold cursor-pointer uppercase hover:text-red-500/80 transition-colors">Ocultar Canceladas</label>
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

                         <button
                            style={{ display: 'none' }}
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
                                       <th className="px-4 py-5 font-medium">ID</th>
                                       <th className="px-4 py-5 font-medium">Cliente</th>
                                       <th className="px-4 py-5 font-medium">Cita</th>
                                       <th className="px-4 py-5 font-medium">Trayecto</th>
                                       <th className="px-4 py-5 font-medium">Nº Vuelo</th>
                                       <th className="px-4 py-5 font-medium">Pasajero</th>
                                       <th className="px-4 py-5 text-brand-gold font-medium">Despacho</th>
                                       <th className="px-4 py-5 font-medium">Estado</th>
                                       <th className="px-4 py-5 text-right font-medium">Acciones</th>
                                    </tr>
                                 </thead>
                                 <tbody className="divide-y divide-slate-800 text-sm">
                                    {filteredBookings.length > 0 ? filteredBookings.map((b: any) => (
                                       <React.Fragment key={b.id}>
                                          <tr
                                             className={`transition-colors group cursor-pointer ${expandedRowId === b.id ? 'bg-slate-800/50' : 'hover:bg-slate-800/30'}`}
                                             onClick={() => setExpandedRowId(expandedRowId === b.id ? null : b.id)}
                                          >
                                             {/* 1. ID */}
                                             <td className="px-4 py-4 align-top">
                                                <div className="flex flex-col gap-1 mt-1">
                                                   <span className="font-mono text-brand-gold text-xs font-bold text-nowrap">#{b.display_id || b.id.slice(0, 6)}</span>
                                                   {b.fomento_status === 'COMUNICADO' && (
                                                      <span className="bg-emerald-500/10 text-emerald-500 text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded w-fit border border-emerald-500/20" title="Comunicado a Fomento">RVTC ✓</span>
                                                   )}
                                                   {b.fomento_status === 'ERROR' && (
                                                      <span className="bg-red-500/10 text-red-500 text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded w-fit border border-red-500/20" title="Error en Fomento">RVTC ✗</span>
                                                   )}
                                                </div>
                                             </td>

                                             {/* 2. Cliente */}
                                             <td className="px-4 py-4 align-top">
                                                <div className="mt-1">
                                                   <span className="text-brand-platinum/90 text-xs font-bold">{b.client_name || 'Palladium Transfers S.L.'}</span>
                                                </div>
                                             </td>

                                             {/* 3. Cita */}
                                             <td className="px-4 py-4 align-top min-w-[100px]">
                                                <div className="flex flex-col gap-0.5">
                                                   <span className="font-mono text-brand-gold text-base font-black tracking-tight">{b.pickup_time}</span>
                                                   <span className="text-[10px] text-brand-platinum/50 font-medium uppercase tracking-widest">
                                                      {b.pickup_date ? new Date(b.pickup_date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }).replace('.', '') : ''}
                                                   </span>
                                                </div>
                                             </td>

                                             {/* 4. Trayecto */}
                                             <td className="px-4 py-4 align-top">
                                                <div className="flex flex-col gap-1.5 w-full max-w-[200px]">
                                                   <div className="flex items-start gap-2">
                                                      <span className="material-icons-round text-[14px] text-emerald-500/50 mt-0.5 flex-shrink-0">trip_origin</span>
                                                      <span className="text-white text-xs leading-tight font-medium truncate" title={b.origin}>{b.origin}</span>
                                                   </div>
                                                   <div className="flex items-start gap-2">
                                                      <span className="material-icons-round text-[14px] text-red-500/50 mt-0.5 flex-shrink-0">place</span>
                                                      <span className="text-brand-platinum/60 text-xs leading-tight truncate" title={b.destination}>{b.destination}</span>
                                                   </div>
                                                </div>
                                             </td>

                                             {/* 5. Vuelo */}
                                             <td className="px-4 py-4 align-top">
                                                <div className="mt-1">
                                                   <span className={`font-mono text-xs font-bold px-2 py-1 rounded border ${b.flight_number ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-white/5 text-brand-platinum/30 border-white/5'}`}>
                                                      {b.flight_number || 'S/V'}
                                                   </span>
                                                </div>
                                             </td>

                                             {/* 6. Pasajero */}
                                             <td className="px-4 py-4 align-top">
                                                <div className="flex flex-col gap-0.5 mt-0.5">
                                                   <span className="font-bold text-white text-sm text-nowrap">{b.passenger}</span>
                                                   <span className="text-[10px] text-brand-platinum/30 truncate max-w-[130px]" title={b.email}>{b.email}</span>
                                                   {b.tags && b.tags.length > 0 && (
                                                      <div className="flex flex-wrap gap-1 mt-1">
                                                         {b.tags.map((tag: string, i: number) => (
                                                            <span key={i} className="bg-amber-500/20 text-amber-500 border border-amber-500/20 text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded" title="Etiqueta">{tag}</span>
                                                         ))}
                                                      </div>
                                                   )}
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
                                                      {drivers?.filter((d: any) => d.status !== 'Inactive' && d.status !== 'Baja').map((d: any) => (
                                                         <option key={d.id} value={d.id}>{d.name}</option>
                                                      ))}
                                                   </select>
                                                   {b.driver_id && (
                                                      <div className="flex items-center gap-1.5 px-2 py-1 bg-white/5 rounded-md border border-white/5 w-fit">
                                                         <span className="material-icons-round text-[10px] text-brand-gold">directions_car</span>
                                                         {(() => {
                                                            const svcVehicle = getAssignedVehicleForBooking(b, shifts || [], vehicles || [], drivers || []);
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
                                                <div className="flex flex-col gap-1.5 items-start">
                                                   <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border ${b.status === 'Pending' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
                                                      b.status === 'Confirmed' ? 'bg-blue-500/10 text-brand-gold border-blue-500/20' :
                                                         b.status === 'En Route' || b.status === 'At Origin' || b.status === 'In Progress' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
                                                            b.status === 'Completed' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                                                               'bg-red-500/10 text-red-500 border-red-500/20'
                                                      }`}>{b.status}</span>
                                                   {b.fomento_status === 'COMUNICADO' && (
                                                      <span className="flex items-center gap-1 text-[8px] bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-1.5 py-0.5 rounded font-bold" title="Registrado en Fomento RVTC">
                                                         <span className="material-icons-round text-[10px]">account_balance</span> RVTC OK
                                                      </span>
                                                   )}
                                                   {b.fomento_status === 'ERROR' && (
                                                      <span className="flex items-center gap-1 text-[8px] bg-red-500/10 text-red-500 border border-red-500/20 px-1.5 py-0.5 rounded font-bold cursor-help" title={b.fomento_error || 'Error al comunicar'}>
                                                         <span className="material-icons-round text-[10px]">error_outline</span> RVTC ERR
                                                      </span>
                                                   )}
                                                </div>
                                             </td>
                                             <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                                                <div className="flex justify-end gap-2">
                                                   <button
                                                      onClick={() => {
                                                         // Always sync collaborator_price from the Conductor tariff
                                                         const bookingToEdit = { ...b };
                                                         const prices = getTariffPrices(bookingToEdit);
                                                         if (prices && prices.collaborator_price) {
                                                            bookingToEdit.collaborator_price = prices.collaborator_price;
                                                         }
                                                         
                                                         // Format tags as comma-separated string for editing
                                                         if (Array.isArray(bookingToEdit.tags)) {
                                                            bookingToEdit.tags = bookingToEdit.tags.join(', ');
                                                         }
                                                         
                                                         setEditingItem(bookingToEdit);
                                                         setIsModalOpen(true);
                                                      }}
                                                   >
                                                      <span className="material-icons-round text-base">edit</span>
                                                   </button>

                                                    <button
                                                       onClick={() => openCancelModal(b)}
                                                      className="w-9 h-9 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white flex items-center justify-center transition-all"
                                                      title="Cancelar Reserva"
                                                   >
                                                      <span className="material-icons-round text-base">cancel</span>
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
                                                         <h4 className="text-xs font-black text-purple-400 uppercase tracking-widest border-b border-white/5 pb-2">Gestión y Despacho</h4>
                                                         <div className="space-y-3">

                                                            {/* Fomento Sync Block */}
                                                            <div className="bg-[#0f1724] border border-emerald-500/20 rounded-xl p-3 flex flex-col gap-2">
                                                               <div className="flex justify-between items-center">
                                                                  <div className="flex items-center gap-2">
                                                                     <span className="material-icons-round text-emerald-500 text-sm">account_balance</span>
                                                                     <span className="text-xs font-bold text-white uppercase tracking-widest">Ministerio de Fomento</span>
                                                                  </div>
                                                                  {b.fomento_status === 'COMUNICADO' || b.fomento_status === 'INICIADO' ? (
                                                                     <span className="text-[9px] font-black bg-emerald-500 text-black px-2 py-0.5 rounded uppercase">{b.fomento_status === 'INICIADO' ? 'Iniciado' : 'Registrado'}</span>
                                                                  ) : b.fomento_status === 'ERROR' ? (
                                                                     <span className="text-[9px] font-black bg-red-500 text-white px-2 py-0.5 rounded uppercase">Fallo</span>
                                                                  ) : (
                                                                     <span className="text-[9px] font-black bg-slate-700 text-slate-300 px-2 py-0.5 rounded uppercase">Pendiente</span>
                                                                  )}
                                                               </div>
                                                               <p className="text-[10px] text-brand-platinum/50 leading-tight">La ley requiere comunicar el servicio antes del viaje.</p>
                                                               {b.fomento_error && <p className="text-[9px] text-red-400 mt-1 italic break-words">{b.fomento_error}</p>}
                                                                                                 {(() => {
                                                                   const envSetting = settings?.find((s: any) => s.key === 'fomento_env');
                                                                   const isProd = envSetting ? envSetting.value !== 'test' : true;
                                                                   return (
                                                                      <div className="mt-2 flex items-center justify-between bg-brand-black p-2 rounded-lg border border-white/5">
                                                                         <span className="text-[10px] text-brand-platinum/70 uppercase font-bold tracking-widest">Entorno:</span>
                                                                         <label className="flex items-center cursor-pointer gap-2">
                                                                            <span className={`text-[10px] font-bold ${!isProd ? 'text-emerald-400' : 'text-brand-platinum/30'}`}>PRUEBAS</span>
                                                                            <div className="relative">
                                                                               <input 
                                                                                  type="checkbox" 
                                                                                  className="sr-only" 
                                                                                  checked={isProd}
                                                                                  onChange={async (e) => {
                                                                                     const newValue = e.target.checked ? 'production' : 'test';
                                                                                     if (envSetting) {
                                                                                        await updateSetting(envSetting.id, { value: newValue, updated_at: new Date().toISOString() });
                                                                                     } else {
                                                                                        await supabase.from('system_settings').insert({
                                                                                           key: 'fomento_env',
                                                                                           value: newValue,
                                                                                           description: 'Entorno de comunicación con RVTC Fomento (test / production)'
                                                                                        });
                                                                                     }
                                                                                  }}
                                                                               />
                                                                               <div className={`block w-8 h-4 rounded-full transition-colors ${isProd ? 'bg-red-500/50' : 'bg-emerald-500/50'}`}></div>
                                                                               <div className={`dot absolute left-0.5 top-0.5 bg-white w-3 h-3 rounded-full transition-transform ${isProd ? 'transform translate-x-4' : ''}`}></div>
                                                                            </div>
                                                                            <span className={`text-[10px] font-bold ${isProd ? 'text-red-400' : 'text-brand-platinum/30'}`}>PRODUCCIÓN</span>
                                                                         </label>
                                                                      </div>
                                                                   );
                                                                })()}

                                                               <div className="flex gap-2 mt-2">
                                                                  <button
                                                                     onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        e.preventDefault();
                                                                        handleComunicarFomento(b);
                                                                     }}
                                                                     disabled={(b.fomento_status === 'COMUNICADO' || b.fomento_status === 'INICIADO') && !!b.fomento_idservicio}
                                                                     className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-colors flex items-center justify-center gap-1 ${(b.fomento_status === 'COMUNICADO' || b.fomento_status === 'INICIADO') && !!b.fomento_idservicio ? 'bg-emerald-500/10 text-emerald-500/50 cursor-not-allowed border border-emerald-500/20' : 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-lg shadow-emerald-500/20'}`}
                                                                  >
                                                                     {((b.fomento_status === 'COMUNICADO' || b.fomento_status === 'INICIADO') && !!b.fomento_idservicio) && <span className="material-icons-round text-sm">check_circle</span>}
                                                                     {(b.fomento_status === 'COMUNICADO' || b.fomento_status === 'INICIADO') && !!b.fomento_idservicio ? `Comunicado a RVTC ${b.fomento_status === 'INICIADO' ? '(INICIADO)' : ''}` : ((b.fomento_status === 'COMUNICADO' || b.fomento_status === 'INICIADO') ? 'Re-comunicar (Falta ID)' : 'Comunicar a RVTC')}
                                                                  </button>

                                                                  {b.fomento_status === 'COMUNICADO' && (
                                                                     <button
                                                                        onClick={(e) => {
                                                                           e.stopPropagation();
                                                                           e.preventDefault();
                                                                           if (confirm("¿Estás seguro de que quieres ANULAR este servicio en el Ministerio de Fomento?")) {
                                                                              handleAnularFomento(b);
                                                                           }
                                                                        }}
                                                                        className="px-3 py-2 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white border border-red-500/20 rounded-lg transition-all"
                                                                        title="Anular en RVTC"
                                                                     >
                                                                        <span className="material-icons-round text-sm">cancel</span>
                                                                     </button>
                                                                  )}
                                                               </div>
                                                            </div>

                                                            {b.driver_id && (
                                                               <div className="bg-brand-black p-3 rounded-lg border border-white/5 mb-3">
                                                                  <span className="text-brand-platinum/30 text-[10px] uppercase tracking-widest font-bold block mb-1">Vehículo Asignado (Día del Servicio)</span>
                                                                  {(() => {
                                                                     const svcVehicle = getAssignedVehicleForBooking(b, shifts || [], vehicles || [], drivers || []);
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

                                                   {/* 4. Telemetría y Rastreo (Full Width) */}
                                                   {(b.max_speed !== undefined || (b.status_logs && b.status_logs.length > 0)) && (
                                                      <details className="mt-8 border-t border-white/5 pt-6 pb-2 group">
                                                         <summary className="flex items-center gap-2 cursor-pointer outline-none select-none w-fit mb-4">
                                                            <h4 className="text-xs font-black text-blue-400 uppercase tracking-widest group-open:text-brand-gold transition-colors">Telemetría y Rastreo GPS</h4>
                                                            <span className="material-icons-round text-brand-platinum/50 text-sm transition-transform group-open:rotate-180">expand_more</span>
                                                         </summary>
                                                         
                                                         <div className="flex items-center justify-between mb-4">
                                                            <div></div>
                                                            {b.status_logs && b.status_logs.length > 0 && (
                                                               <button
                                                                  onClick={(e) => {
                                                                     e.stopPropagation();
                                                                     const content = `REPORTE DE TELEMETRÍA - RESERVA #${b.display_id || b.id.substring(0, 8)}\nPasajero: ${b.passenger}\nFecha de creación del reporte: ${new Date().toLocaleString('es-ES')}\n\nHISTORIAL DE UBICACIONES:\n\n` + b.status_logs.map((log: any) => `ESTADO: ${log.status}\nHORA: ${new Date(log.time).toLocaleString('es-ES')}\nCOORDENADAS: ${log.lat}, ${log.lng}\nMAPA: https://maps.google.com/?q=${log.lat},${log.lng}\n------------------------------------------------\n`).join('');
                                                                     const blob = new Blob([content], { type: 'text/plain;charset=utf-8;' });
                                                                     const link = document.createElement("a");
                                                                     const url = URL.createObjectURL(blob);
                                                                     link.setAttribute("href", url);
                                                                     link.setAttribute("download", `telemetria_${b.display_id || b.id.slice(0, 8)}.txt`);
                                                                     link.style.visibility = 'hidden';
                                                                     document.body.appendChild(link);
                                                                     link.click();
                                                                     document.body.removeChild(link);
                                                                  }}
                                                                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 text-[10px] right uppercase tracking-widest font-black rounded-lg border border-blue-500/20 transition-all active:scale-95"
                                                                  title="Descargar historial de ubicaciones en archivo de texto"
                                                               >
                                                                  <span className="material-icons-round text-sm">download</span>
                                                                  Descargar TXT
                                                               </button>
                                                            )}
                                                         </div>
                                                         <div className="flex flex-col md:flex-row gap-6">
                                                            {b.max_speed !== undefined && b.max_speed !== null && (
                                                               <div className="bg-brand-black p-4 rounded-xl border border-white/5 min-w-[200px] shrink-0">
                                                                  <span className="text-brand-platinum/30 text-[10px] uppercase tracking-widest font-bold block mb-1">Velocidad Máxima</span>
                                                                  <div className="flex items-end gap-2">
                                                                     <span className="text-3xl font-black text-white leading-none">{b.max_speed > 0 ? b.max_speed : 0}</span>
                                                                     <span className="text-brand-platinum/50 font-bold mb-1">km/h</span>
                                                                  </div>
                                                               </div>
                                                            )}
                                                            {b.status_logs && b.status_logs.length > 0 && (
                                                               <div className="flex-1 min-w-0 overflow-x-auto pb-2 custom-scrollbar">
                                                                  <div className="flex gap-3">
                                                                     {b.status_logs.map((log: any, idx: number) => (
                                                                        <div key={idx} className="bg-slate-800/50 p-3 rounded-lg min-w-[160px] border border-white/5 shrink-0 flex flex-col justify-between hover:bg-slate-800 transition-colors">
                                                                           <div>
                                                                              <span className="text-[10px] font-black uppercase text-brand-gold mb-1 block">{log.status}</span>
                                                                              <span className="text-xs text-brand-platinum block mb-2">{new Date(log.time).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                                                                           </div>
                                                                           <a href={`https://maps.google.com/?q=${log.lat},${log.lng}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[10px] uppercase font-bold text-blue-400 hover:text-blue-300 transition-colors w-fit">
                                                                              <span className="material-icons-round text-sm">location_on</span>
                                                                              DÓNDE ESTABA
                                                                           </a>
                                                                        </div>
                                                                     ))}
                                                                  </div>
                                                               </div>
                                                            )}
                                                         </div>
                                                      </details>
                                                   )}
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
               <>
                  <div className="flex flex-wrap items-end gap-4 mb-6 bg-brand-charcoal p-4 md:p-6 rounded-2xl border border-white/5 shadow-xl">
                     <div className="w-full sm:w-1/3 md:w-48">
                        <label className="text-[10px] text-brand-platinum/30 font-black uppercase tracking-widest block mb-1.5 flex items-center gap-1.5">
                           <span className="material-icons-round text-[10px]">calendar_today</span>
                           Fecha a Consultar
                        </label>
                        <input
                           type="date"
                           value={startDate}
                           onChange={(e) => {
                              setStartDate(e.target.value);
                              setEndDate(e.target.value); // Sincroniza ambos para evitar inconsistencias
                           }}
                           className="w-full bg-brand-black border border-white/5 rounded-xl px-4 py-2.5 text-sm font-bold text-brand-gold focus:border-brand-gold outline-none transition-all cursor-pointer"
                        />
                     </div>
                     <div className="flex-1 min-w-[300px] flex items-center bg-blue-500/10 p-3 rounded-xl border border-blue-500/20">
                        <span className="material-icons-round text-blue-400 mr-3">info</span>
                        <p className="text-xs text-brand-platinum font-medium">
                           Calculando disponibilidad dinámica para el <strong className="text-white">{new Date(startDate).toLocaleDateString('es-ES')}</strong>.
                           <br />
                           Capacidad Total Operativa Estimada: <strong className="text-brand-gold text-lg ml-1">{dynamicCapacity}</strong> Vehículos / Conductores.
                        </p>
                     </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-20">
                     {slots.map(slot => (
                        <div key={slot.time} className={`bg-brand-charcoal border rounded-2xl p-6 transition-all shadow-lg ${slot.status === 'CLOSED' ? 'border-red-500/20 ring-1 ring-red-500/10' :
                           slot.status === 'LIMITED' ? 'border-amber-500/20 ring-1 ring-amber-500/10' :
                              'border-emerald-500/10'
                           }`}>
                           <div className="flex justify-between items-start mb-4">
                              <span className="text-xl font-black text-white">{slot.time}</span>
                              <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest shadow-sm ${slot.status === 'CLOSED' ? 'bg-red-500/10 text-red-400' :
                                 slot.status === 'LIMITED' ? 'bg-amber-500/10 text-amber-400' :
                                    'bg-emerald-500/10 text-emerald-400'
                                 }`}>{slot.status}</span>
                           </div>
                           <div className="space-y-3">
                              <div className="flex justify-between text-xs">
                                 <span className="text-brand-platinum/50 font-medium">Ocupación Requerida</span>
                                 <span className="text-white font-bold">{slot.active} Serv. en curso</span>
                              </div>
                              <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                                 <div className={`h-full transition-all duration-1000 ${slot.status === 'CLOSED' ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]' :
                                    slot.status === 'LIMITED' ? 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]' :
                                       'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]'
                                    }`} style={{ width: `${Math.min((slot.active / Math.max(dynamicCapacity, 1)) * 100, 100)}%` }}></div>
                              </div>
                              <div className="flex justify-between text-[10px] font-black uppercase">
                                 <span className="text-brand-platinum/50">Disponibles</span>
                                 <span className={`text-sm ${slot.status === 'CLOSED' ? 'text-red-400' : 'text-brand-gold'}`}>{slot.available} / {dynamicCapacity}</span>
                              </div>
                           </div>
                        </div>
                     ))}
                  </div>
               </>
            )
            }
         </div >

         {/* Cancel Reservation Modal */}
         {
            isCancelModalOpen && bookingToCancel && (
               <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
                  <div className="bg-[#151e29] border border-white/10 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl relative">
                     <div className="flex justify-between items-center p-6 border-b border-white/5 bg-slate-800/30">
                        <h2 className="text-lg font-black text-red-400 uppercase tracking-widest flex items-center gap-2">
                           <span className="material-icons-round text-red-500">warning</span>
                           Cancelar Reserva
                        </h2>
                        <button
                           onClick={() => setIsCancelModalOpen(false)}
                           className="text-brand-platinum/50 hover:text-white transition-colors"
                        >
                           <span className="material-icons-round text-xl">close</span>
                        </button>
                     </div>

                     <div className="p-6 space-y-6">
                        <div className="bg-red-500/10 p-4 rounded-xl border border-red-500/20 text-sm">
                           <p className="font-bold text-red-400 mb-1">Reserva #{bookingToCancel.display_id || bookingToCancel.id.slice(0, 6)}</p>
                           <p className="text-red-200">{bookingToCancel.passenger} - {bookingToCancel.pickup_date?.split('T')[0]} {bookingToCancel.pickup_time}</p>
                        </div>

                        <div className="space-y-4">
                           <label className="flex items-start gap-3 p-4 bg-slate-800/50 hover:bg-slate-800 rounded-xl cursor-pointer border border-white/5 transition-colors">
                              <input
                                 type="checkbox"
                                 checked={cancelOptions.hasCost}
                                 onChange={(e) => setCancelOptions({ ...cancelOptions, hasCost: e.target.checked })}
                                 className="w-5 h-5 rounded border-slate-600 bg-slate-700 text-red-500 mt-0.5 focus:ring-red-500"
                              />
                              <div>
                                 <p className="font-bold text-white text-sm">Cancelación con coste</p>
                                 <p className="text-xs text-brand-platinum/50 mt-1">
                                    Deja esta opción <strong className="text-red-400">DESMARCADA</strong> si la cancelación es gratuita. Si la marcas, se mantendrán los importes de cobro y comisión, pero se cambiará el estado a cancelado.
                                 </p>
                              </div>
                           </label>

                           {bookingToCancel.driver_id && (
                              <label className="flex items-start gap-3 p-4 bg-slate-800/50 hover:bg-slate-800 rounded-xl cursor-pointer border border-white/5 transition-colors">
                                 <input
                                    type="checkbox"
                                    checked={cancelOptions.unassignDriver}
                                    onChange={(e) => setCancelOptions({ ...cancelOptions, unassignDriver: e.target.checked })}
                                    className="w-5 h-5 rounded border-slate-600 bg-slate-700 text-brand-gold mt-0.5 focus:ring-brand-gold"
                                 />
                                 <div>
                                    <p className="font-bold text-white text-sm">Desasignar Conductor y Poner Precio a 0€</p>
                                    <p className="text-xs text-brand-platinum/50 mt-1">
                                       Desvincula al conductor <strong className="text-brand-gold">({bookingToCancel.assigned_driver_name})</strong> dejándolo libre. Su precio a percibir se establecerá a 0€.
                                    </p>
                                 </div>
                              </label>
                           )}

                           {!bookingToCancel.driver_id && (
                              <div className="p-4 bg-slate-800/30 rounded-xl border border-white/5 opacity-50 text-sm italic text-brand-platinum/50">
                                 Esta reserva no tiene conductor asignado todavía.
                              </div>
                           )}
                        </div>
                     </div>

                     <div className="p-6 border-t border-white/5 bg-slate-800/20 flex gap-3 justify-end rounded-b-2xl">
                        <button
                           onClick={() => setIsCancelModalOpen(false)}
                           className="px-5 py-2.5 rounded-xl text-brand-platinum/80 text-sm font-bold hover:bg-white/5 transition-colors"
                        >
                           Volver
                        </button>
                        <button
                           onClick={confirmCancelBooking}
                           className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-bold transition-all shadow-lg shadow-red-500/20 flex items-center gap-2"
                        >
                           Confirmar Cancelación
                        </button>
                     </div>
                  </div>
               </div>
            )
         }


         <DataEntryModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            onSubmit={handleSaveBooking}
            initialData={editingItem}
            title={editingItem ? 'Editar Reserva' : 'Nueva Reserva Manual'}
            fields={fields}
            onFormDataChange={handleFormDataChange}
         />
      </div >
   );
};
