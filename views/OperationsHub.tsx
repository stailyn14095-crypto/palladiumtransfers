import React, { useState } from 'react';
import { supabase } from '../services/supabase';
import { useSupabaseData } from '../hooks/useSupabaseData';
import { Flight, Driver } from '../types';
import { FleetMap } from '../components/FleetMap';
import { suggestDriver } from '../services/autoAssignment';
import { useToast } from '../components/ui/Toast';
import { Modal } from '../components/ui/Modal';

export const OperationsHub: React.FC = () => {
  const { data: flights, loading: loadingFlights } = useSupabaseData<Flight>('flights', { realtime: true });
  const { data: drivers, loading: loadingDrivers } = useSupabaseData<Driver>('drivers');
  const { data: bookings, updateItem: updateBooking } = useSupabaseData('bookings');
  const { data: vehicles } = useSupabaseData('vehicles');
  const { data: maintenance } = useSupabaseData('vehicle_maintenance');

  const { showToast } = useToast();
  const [dispatchQuery, setDispatchQuery] = React.useState('');
  const [draggedBookingId, setDraggedBookingId] = React.useState<string | null>(null);
  const [dropTargetDriverId, setDropTargetDriverId] = React.useState<string | null>(null);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [modalConfig, setModalConfig] = useState<{
    title: string;
    message: string;
    type: 'info' | 'danger' | 'success';
    onConfirm: () => void;
  }>({ title: '', message: '', type: 'info', onConfirm: () => { } });

  // Flight Window State
  const [timeWindow, setTimeWindow] = useState(24); // Default +/- 24 hours to avoid timezone issues or missing late flights

  const filteredBookings = React.useMemo(() => {
    if (!bookings) return [];
    const now = new Date();
    const msInHour = 60 * 60 * 1000;

    return bookings.filter((b: any) => {
      // Must have flight info to be in Arrivals
      if (!b.flight_number || !b.pickup_date || !b.pickup_time) return false;

      // Extract valid date string (in case there's an issue with T00:00:00Z format from Supabase)
      const dateStr = b.pickup_date.includes('T') ? b.pickup_date.split('T')[0] : b.pickup_date;

      // Ensure time string is properly padded and has seconds, e.g. "9:15" -> "09:15:00"
      let timeStr = b.pickup_time;
      if (timeStr.length === 4 || timeStr.length === 5) {
        // format HH:mm or H:mm
        const parts = timeStr.split(':');
        timeStr = `${parts[0].padStart(2, '0')}:${parts[1]}:00`;
      } else {
        timeStr = timeStr.slice(0, 8); // truncate milliseconds
      }

      const bookingTime = new Date(`${dateStr}T${timeStr}`);

      // If invalid date, skip
      if (isNaN(bookingTime.getTime())) return false;

      const diffHours = (bookingTime.getTime() - now.getTime()) / msInHour;

      // Check window: -timeWindow <= diff <= +timeWindow
      return diffHours >= -timeWindow && diffHours <= timeWindow;
    }).sort((a: any, b: any) => {
      // Sort chronologically
      const dateStrA = a.pickup_date.includes('T') ? a.pickup_date.split('T')[0] : a.pickup_date;
      let timeA = a.pickup_time;
      if (timeA.length === 4 || timeA.length === 5) {
        const parts = timeA.split(':');
        timeA = `${parts[0].padStart(2, '0')}:${parts[1]}:00`;
      } else {
        timeA = timeA.slice(0, 8);
      }

      const dateStrB = b.pickup_date.includes('T') ? b.pickup_date.split('T')[0] : b.pickup_date;
      let timeB = b.pickup_time;
      if (timeB.length === 4 || timeB.length === 5) {
        const parts = timeB.split(':');
        timeB = `${parts[0].padStart(2, '0')}:${parts[1]}:00`;
      } else {
        timeB = timeB.slice(0, 8);
      }

      const dateA = new Date(`${dateStrA}T${timeA}`);
      const dateB = new Date(`${dateStrB}T${timeB}`);

      return dateA.getTime() - dateB.getTime();
    });
  }, [bookings, timeWindow]);

  const activeDrivers = drivers ? drivers.filter((d: any) => d.current_status === 'Working' || d.current_status === 'Paused') : [];
  const totalVehicles = vehicles?.length || 12;

  const filteredDrivers = activeDrivers.filter((d: any) =>
    !dispatchQuery ||
    d.name.toLowerCase().includes(dispatchQuery.toLowerCase()) ||
    (d.vehicle && d.vehicle.toLowerCase().includes(dispatchQuery.toLowerCase())) ||
    (d.plate && d.plate.toLowerCase().includes(dispatchQuery.toLowerCase()))
  );

  const openConfirmation = (title: string, message: string, onConfirm: () => void, type: 'info' | 'danger' | 'success' = 'info') => {
    setModalConfig({ title, message, onConfirm, type });
    setModalOpen(true);
  };
  const handleReassign = async (bookingId: string, newDriverId: string) => {
    const booking = bookings?.find((b: any) => b.id === bookingId);
    const newDriver = drivers?.find((d: any) => d.id === newDriverId);
    if (!newDriver || !booking) return;

    // Check if vehicle is in workshop
    const vehicleId = vehicles?.find((v: any) => v.plate === newDriver.plate)?.id;
    if (vehicleId) {
      const isInWorkshop = maintenance?.some((m: any) =>
        m.vehicle_id === vehicleId &&
        new Date(m.entry_time) <= new Date(booking.pickup_date) &&
        (!m.exit_time || new Date(m.exit_time) >= new Date(booking.pickup_date))
      );
      if (isInWorkshop) {
        showToast(`ALERTA: El vehículo (${newDriver.plate}) está marcado en Taller para esta fecha.`, 'error');
        return;
      }
    }

    // Check for double assignment on same day
    const alreadyAssigned = bookings?.some((b: any) =>
      b.driver_id === newDriverId &&
      b.pickup_date === booking.pickup_date &&
      b.id !== bookingId &&
      b.status !== 'Cancelled'
    );

    const executeAssignment = async () => {
      await updateBooking(bookingId, {
        driver_id: newDriverId,
        assigned_driver_name: newDriver.name,
        status: 'Pending' // Reset to pending for new confirmation
      });
      showToast(`Servicio reasignado a ${newDriver.name}`, 'success');
    };

    if (alreadyAssigned) {
      openConfirmation(
        'Conflicto de Horario',
        `Este conductor ya tiene servicios hoy. ¿Deseas asignar un segundo servicio a ${newDriver.name}?`,
        executeAssignment,
        'danger'
      );
    } else {
      await executeAssignment();
    }
  };

  const handleAutoAssign = (booking: any) => {
    const suggestion = suggestDriver(booking, drivers || [], bookings || [], vehicles || []);
    if (suggestion) {
      openConfirmation(
        'Sugerencia de Asignación',
        `El sistema sugiere asignar este servicio a ${suggestion.name} basado en ubicación y disponibilidad. ¿Confirmar?`,
        () => handleReassign(booking.id, suggestion.id),
        'success'
      );
    } else {
      showToast('No se encontraron conductores disponibles que cumplan con las políticas.', 'warning');
    }
  };

  const syncFlightsWithAirLabs = async () => {
    try {
      showToast('Sincronizando vuelos con AirLabs...', 'info');
      const airlabsKey = import.meta.env.VITE_AIRLABS_API_KEY;

      if (!airlabsKey) {
        showToast('Falta la API Key de AirLabs.', 'error');
        return;
      }

      // 1. Obtener todos los números de vuelo ÚNICOS de las reservas visibles
      const bookingFlightNumbers = Array.from(new Set(
        filteredBookings
          .map((b: any) => b.flight_number)
          .filter(Boolean)
          .map((n: string) => n.replace(/\s+/g, '').toUpperCase())
      ));

      if (bookingFlightNumbers.length === 0) {
        showToast('No hay vuelos en las reservas actuales para sincronizar.', 'warning');
        return;
      }

      let syncCount = 0;
      let updates = [];

      for (const flightIata of bookingFlightNumbers) {
        let flightData: any = null;
        let dataSource = 'radar';

        // Intentar primero con el Radar (Live Flights) - Filtrado por destino ALC
        try {
          const res = await fetch(`https://airlabs.co/api/v9/flights?api_key=${airlabsKey}&flight_iata=${flightIata}&arr_iata=ALC`);
          const data = await res.json();
          if (data && data.response && data.response.length > 0) {
            flightData = data.response[0];
          }
        } catch (e) {
          console.error(`Error en radar para ${flightIata}:`, e);
        }

        // Si no hay datos en radar O faltan tiempos críticos, intentar con el Schedule (Horarios)
        const missingTimes = !flightData || (!flightData.arr_time_utc && !flightData.arr_time);
        if (missingTimes) {
          try {
            const res = await fetch(`https://airlabs.co/api/v9/schedules?api_key=${airlabsKey}&flight_iata=${flightIata}&arr_iata=ALC`);
            const data = await res.json();
            if (data && data.response && data.response.length > 0) {
              const scheduleData = data.response[0];
              if (!flightData) {
                flightData = scheduleData;
                dataSource = 'schedule';
              } else {
                // Mezclar: usar radar para estado real y schedule para tiempos programados
                flightData = { ...scheduleData, ...flightData };
                dataSource = 'mixed';
              }
            }
          } catch (e) {
            console.error(`Error en schedule para ${flightIata}:`, e);
          }
        }

        if (flightData) {
          // Mapear estado
          let newStatus: Flight['status'] = 'Scheduled';
          const airlabsStatus = (flightData.status || '').toLowerCase();
          
          if (airlabsStatus === 'en-route' || airlabsStatus === 'active') {
            newStatus = flightData.delayed ? 'Delayed' : 'En Route';
          } else if (airlabsStatus === 'landed') {
            newStatus = 'Landed';
          } else if (airlabsStatus === 'cancelled') {
            newStatus = 'Cancelled';
          } else if (airlabsStatus === 'scheduled') {
            newStatus = flightData.delayed ? 'Delayed' : 'Scheduled';
          }

          // Calcular delay y ETA
          // Nota: El endpoint de schedules usa arr_time y arr_estimated (sin _utc a veces, dependiendo de la versión)
          const scheduledStr = flightData.arr_time_utc || flightData.arr_time;
          const estimatedStr = flightData.arr_estimated_utc || flightData.arr_estimated || scheduledStr;
          
          let finalDelay = flightData.delayed || 0;
          
          if (scheduledStr && estimatedStr) {
            const scheduled = new Date(scheduledStr).getTime();
            const estimated = new Date(estimatedStr).getTime();
            if (estimated < scheduled) {
              // Adelanto: delay negativo
              finalDelay = -Math.round((scheduled - estimated) / 60000);
            } else if (estimated > scheduled) {
              // Retraso: delay positivo
              finalDelay = Math.round((estimated - scheduled) / 60000);
            }
          }

          console.log(`[AirLabs ${dataSource}] Vuelo ${flightIata}: Status=${newStatus}, Delay=${finalDelay}, ETA=${estimatedStr}`);

          // 2. Buscar si el vuelo ya existe en la tabla 'flights'
          const existingFlight = flights?.find(f => f.number.replace(/\s+/g, '').toUpperCase() === flightIata);

          if (existingFlight) {
            const hasStatusChange = newStatus !== existingFlight.status;
            const hasDelayChange = finalDelay !== (existingFlight.delay || 0);
            const hasEtaChange = (estimatedStr || '') !== (existingFlight.estimated || '');

            if (hasStatusChange || hasDelayChange || hasEtaChange) {
              const { error: updateError } = await supabase
                .from('flights')
                .update({
                  status: newStatus,
                  delay: finalDelay,
                  estimated: estimatedStr,
                  updated_at: new Date().toISOString()
                })
                .eq('id', existingFlight.id);

              if (!updateError) {
                syncCount++;
                updates.push(`${flightIata}${finalDelay < 0 ? ' (EARLY)' : ''}`);
              }
            }
          } else {
            // 3. AUTO-REGISTRO
            const { error: insertError } = await supabase
              .from('flights')
              .insert({
                number: flightIata,
                status: newStatus,
                delay: finalDelay,
                scheduled: scheduledStr,
                estimated: estimatedStr,
                origin: flightData.dep_iata || 'Sincronizado',
                updated_at: new Date().toISOString()
              });

            if (!insertError) {
              syncCount++;
              updates.push(`${flightIata} (Nuevo)`);
            }
          }
        }
      }

      if (syncCount > 0) {
        showToast(`Sincronizados: ${updates.join(', ')}`, 'success');
      } else {
        showToast('Los vuelos ya están al día.', 'success');
      }

    } catch (error) {
      console.error(error);
      showToast('Error en la sincronización con AirLabs', 'error');
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full relative overflow-hidden bg-brand-black">
      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-1/2 h-1/2 bg-blue-600/5 blur-3xl rounded-full pointer-events-none"></div>

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={modalConfig.title}
        message={modalConfig.message}
        onConfirm={modalConfig.onConfirm}
        type={modalConfig.type}
      />

      {/* Header */}
      <header className="min-h-[5rem] shrink-0 border-b border-white/5 bg-brand-charcoal/80 backdrop-blur-md px-4 md:px-8 py-4 md:py-0 flex flex-col md:flex-row items-start md:items-center justify-between z-10 gap-4 md:gap-0">
        <div>
          <h1 className="text-lg md:text-xl text-white font-medium tracking-wide">
            Alicante (ALC) <span className="text-brand-platinum/30 mx-2 hidden md:inline">/</span><span className="md:hidden block"></span> Operations Hub
          </h1>
          <p className="text-[10px] md:text-xs text-brand-platinum/50 flex items-center gap-2 mt-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> System Operational • UTC <span className="hidden md:inline">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span><span className="md:hidden">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }).substring(0, 5)}</span>
          </p>
        </div>

        <div className="flex items-center gap-6 w-full md:w-auto">
          <div className="hidden lg:flex items-center gap-8 mr-8">
            <div className="text-right">
              <p className="text-xs text-brand-platinum/30 uppercase tracking-wider">Active Drivers</p>
              <p className="text-xl font-bold text-white">{activeDrivers.length}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-brand-platinum/30 uppercase tracking-wider">Pending Arrivals</p>
              <p className="text-xl font-bold text-brand-gold">{flights ? flights.filter((f: any) => f.status !== 'Landed').length : 0}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-brand-platinum/30 uppercase tracking-wider">Compliance Score</p>
              <p className="text-xl font-bold text-[#D4AF37]">98%</p>
            </div>
          </div>
          <div className="relative w-full md:w-auto mt-2 md:mt-0">
            <span className="material-icons-round absolute left-3 top-2.5 text-brand-platinum/30">search</span>
            <input
              type="text"
              placeholder="Search in Dispatch..."
              value={dispatchQuery}
              onChange={(e) => setDispatchQuery(e.target.value)}
              className="bg-brand-charcoal border border-white/5 text-slate-200 text-sm rounded-full pl-10 pr-4 py-2.5 w-full md:w-64 focus:ring-2 focus:ring-blue-500 outline-none placeholder-slate-600"
            />
          </div>
        </div>
      </header>

      {/* Main Grid */}
      <div className="flex-1 overflow-y-auto p-6 lg:p-8">
        <div className="grid grid-cols-12 gap-6 max-w-[1600px] mx-auto">

          {/* Top Row */}

          {/* Fleet Availability Widget */}
          <div className="col-span-12 md:col-span-4 lg:col-span-3 bg-brand-charcoal/70 backdrop-blur-md border border-white/5/50 rounded-2xl p-6 relative overflow-hidden group">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <span className="material-icons-round text-[#D4AF37]">verified_user</span> Fleet Status
              </h3>
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Operational</span>
            </div>
            <div className="flex justify-center py-4">
              <div className="relative w-32 h-32 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="64" cy="64" r="56" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-slate-800" />
                  <circle
                    cx="64" cy="64" r="56" stroke="currentColor" strokeWidth="8" fill="transparent"
                    strokeDasharray="351"
                    strokeDashoffset={351 - (351 * (activeDrivers.length / totalVehicles))}
                    className="text-brand-gold transition-all duration-1000"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-bold text-white">{totalVehicles}</span>
                  <span className="text-[10px] text-brand-platinum/50 uppercase text-center">Total<br />Vehicles</span>
                </div>
              </div>
            </div>
            <div className="mt-2 space-y-1">
              <div className="flex justify-between text-xs text-brand-platinum/50">
                <span>Working / Paused</span>
                <span className="text-white font-mono">{activeDrivers.length}</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-emerald-500 to-blue-500 h-full transition-all duration-500"
                  style={{ width: `${(activeDrivers.length / totalVehicles) * 100}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* Alert Center */}
          <div className="col-span-12 md:col-span-8 lg:col-span-5 bg-brand-charcoal/70 backdrop-blur-md border border-white/5/50 rounded-2xl p-6 flex flex-col h-[420px]">
            <div className="flex justify-between items-center mb-4 shrink-0">
              <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <span className="material-icons-round text-red-500">warning</span> Alert Center
              </h3>
              <button
                onClick={syncFlightsWithAirLabs}
                className="text-xs text-brand-gold hover:text-white flex items-center gap-1 transition-all"
              >
                <span className="material-icons-round text-xs">refresh</span> Live Info
              </button>
            </div>

            <div className="overflow-y-auto custom-scrollbar pr-2 flex-1 flex flex-col gap-4">
              {/* Vehicle Warnings Section */}
              <div className="space-y-3 flex-shrink-0">
                {vehicles?.map((v: any) => {
                  const alerts = [];
                  // ITV
                  if (v.itv) {
                    const diffItv = (new Date(v.itv).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24);
                    if (diffItv <= 15) {
                      alerts.push({ type: 'itv', msg: diffItv < 0 ? `ITV Vencida (${new Date(v.itv).toLocaleDateString()})` : `ITV expira el ${new Date(v.itv).toLocaleDateString()}`, icon: 'gavel', color: 'text-amber-500' });
                    }
                  }
                  // Seguro
                  if (v.insurance_expiry) {
                    const diffIns = (new Date(v.insurance_expiry).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24);
                    if (diffIns <= 30) {
                      alerts.push({ type: 'seguro', msg: diffIns < 0 ? `Seguro Vencido (${new Date(v.insurance_expiry).toLocaleDateString()})` : `Seguro expira el ${new Date(v.insurance_expiry).toLocaleDateString()}`, icon: 'security', color: 'text-emerald-500' });
                    }
                  }
                  // Mantenimiento
                  const interval = v.maintenance_interval || 15000;
                  const nextMaintenance = (v.last_maintenance_km || 0) + interval;
                  const kmToMaintenance = nextMaintenance - (v.km || 0);
                  if (kmToMaintenance <= 1000 && v.last_maintenance_km !== undefined) {
                    alerts.push({ type: 'taller', msg: kmToMaintenance < 0 ? `Taller: Mantenimiento atrasado ${Math.abs(kmToMaintenance)} km` : `Taller: Faltan ${kmToMaintenance} km`, icon: 'build', color: 'text-rose-500' });
                  }

                  if (alerts.length === 0) return null;

                  return (
                    <div key={`vehicle-alert-${v.id}`} className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl animate-pulse cursor-default hover:animate-none transition-all flex-shrink-0">
                      <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest flex items-center gap-2 mb-1.5">
                        <span className="material-icons-round text-xs">warning</span> Aviso Vehículo: {v.plate} <span className="text-white/50 lowercase ml-1">{v.model}</span>
                      </p>
                      <div className="space-y-1 mt-1">
                        {alerts.map((alert, i) => (
                          <p key={i} className={`text-[11px] font-bold flex items-center gap-1.5 ${alert.color}`}>
                            <span className="material-icons-round text-[12px]">{alert.icon}</span> {alert.msg}
                          </p>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Flights Section */}
              <div className="space-y-3 flex-1">
                {(() => {
                  if (!filteredBookings || !flights) return <p className="text-xs text-brand-platinum/30 text-center py-10 flex-shrink-0">Cargando alertas...</p>;

                  const flightAlerts = filteredBookings
                    .filter((b: any) => b.flight_number)
                    .map((b: any) => {
                      const flightInfo = flights.find((f: any) => f.number === b.flight_number);
                      const isDelayed = flightInfo?.status === 'Delayed';
                      const isArriving = flightInfo?.status === 'Final Approach' || flightInfo?.status === 'Taxiing';
                      const isUpcoming = flightInfo?.status === 'Scheduled' || flightInfo?.status === 'En Route';

                      if (!isDelayed && !isArriving && !isUpcoming) return null;

                      let bgClass = 'bg-slate-800/50 border-white/5';
                      let textClass = 'text-brand-platinum/70';
                      let iconClass = 'flight';

                      if (isDelayed) {
                        bgClass = 'bg-red-500/10 border-red-500/20';
                        textClass = 'text-red-500';
                        iconClass = 'flight_takeoff';
                      } else if (isArriving) {
                        bgClass = 'bg-emerald-500/10 border-emerald-500/20';
                        textClass = 'text-emerald-500';
                        iconClass = 'flight_land';
                      } else if (isUpcoming) {
                        bgClass = 'bg-blue-500/10 border-blue-500/20';
                        textClass = 'text-blue-400';
                        iconClass = 'flight';
                      }

                      return (
                        <div
                          key={`flight-alert-${b.id}`}
                          className={`flex items-start gap-3 p-3 rounded-xl border transition-all hover:scale-[1.01] flex-shrink-0 ${bgClass}`}
                        >
                          <span className={`material-icons-round text-sm mt-0.5 ${textClass}`}>
                            {iconClass}
                          </span>
                          <div className="flex-1">
                            <div className="flex justify-between items-start">
                              <div className="flex flex-col">
                                <h4 className="text-sm font-medium text-white">{b.flight_number} • {b.passenger}</h4>
                                {flightInfo?.delay !== undefined && flightInfo.delay !== 0 ? (
                                  <span className={`text-[10px] font-medium ${flightInfo.delay < 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                    {flightInfo.delay > 0 ? `+${flightInfo.delay} min. de retraso` : `${Math.abs(flightInfo.delay)} min. de adelanto`}
                                  </span>
                                ) : null}
                              </div>
                              <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded shadow-sm flex flex-col items-center ${bgClass} ${textClass}`}>
                                <span>{flightInfo?.delay && flightInfo.delay < 0 ? 'EARLY' : (flightInfo?.status || 'Scheduled').toUpperCase()}</span>
                              </span>
                            </div>
                            <div className="flex justify-between items-center mt-1">
                              <p className="text-xs text-brand-platinum/50 flex items-center gap-1.5">
                                <span className="material-icons-round text-[10px]">schedule</span> {b.pickup_time}
                                <span className="text-[10px] text-slate-500 ml-1">({b.origin})</span>
                              </p>
                              {flightInfo?.estimated && (
                                <p className="text-xs text-brand-platinum/70 flex items-center gap-1 bg-white/5 px-2 py-0.5 rounded">
                                  ETA: {new Date(flightInfo.estimated).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                    .filter(Boolean);

                  if (flightAlerts.length === 0) {
                    return (
                      <div className="flex flex-col items-center justify-center py-8 opacity-50 flex-shrink-0">
                        <span className="material-icons-round text-4xl text-slate-700 mb-2">notifications_none</span>
                        <p className="text-xs text-brand-platinum/30">No hay alertas de vuelos activas.</p>
                      </div>
                    );
                  }

                  return flightAlerts;
                })()}
              </div>
            </div>
          </div>

          {/* Live Fleet Map */}
          <div className="col-span-12 lg:col-span-4 bg-brand-charcoal/70 backdrop-blur-md border border-white/5/50 rounded-2xl overflow-hidden relative min-h-[300px]">
            <FleetMap />
            <div className="absolute top-4 right-4 z-20 flex gap-2">
              <button
                onClick={() => showToast('Recentrando mapa en terminal ALC...', 'info')}
                className="bg-slate-900/80 p-2 rounded-lg text-white hover:bg-blue-600 transition-colors"
              >
                <span className="material-icons-round text-sm">my_location</span>
              </button>
              <button
                onClick={() => showToast('Ampliando mapa...', 'info')}
                className="bg-slate-900/80 p-2 rounded-lg text-white hover:bg-blue-600 transition-colors"
              >
                <span className="material-icons-round text-sm">open_in_full</span>
              </button>
            </div>
          </div>

          {/* Middle Row */}

          {/* Flight Monitor */}
          <div className="col-span-12 bg-brand-charcoal/70 backdrop-blur-md border border-white/5/50 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-medium text-white flex items-center gap-2">
                  <span className="material-icons-round text-brand-gold">flight_land</span> Scheduled Arrivals (from Bookings)
                </h3>
                <p className="text-xs text-brand-platinum/30 mt-1">
                  Mostrando vuelos +/- {timeWindow} horas desde ahora ({filteredBookings.length} encontrados)
                </p>
              </div>
              <button
                onClick={() => setTimeWindow(prev => prev + 10)}
                className="text-xs bg-slate-800 hover:bg-slate-700 text-brand-gold px-3 py-1.5 rounded-lg border border-white/5 transition-colors flex items-center gap-2"
              >
                <span className="material-icons-round text-sm">unfold_more</span> Ampliar Rango (+10h)
              </button>
            </div>
            <div className="overflow-x-auto custom-scrollbar">
              {loadingFlights ? <div className="p-8 text-center text-brand-platinum/50">Loading bookings...</div> : (
                <div className="min-w-[800px]">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="text-xs text-brand-platinum/30 border-b border-white/5">
                        <th className="pb-3 pl-2 font-medium">Flight</th>
                        <th className="pb-3 font-medium">Origin</th>
                        <th className="pb-3 font-medium">Pickup Time</th>
                        <th className="pb-3 font-medium">Status</th>
                        <th className="pb-3 font-medium">Passenger</th>
                        <th className="pb-3 pr-2 font-medium text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm">
                      {filteredBookings.length > 0 ? filteredBookings.map((b: any) => {
                        const f = flights?.find((flight: any) => flight.number === b.flight_number);
                        const status = f?.status || 'Scheduled';
                        const delayMins = f?.delay || 0;
                        const eta = f?.estimated;

                        return (
                          <tr
                            key={b.id}
                            draggable
                            onDragStart={(e) => {
                              e.dataTransfer.setData('text', b.id);
                              e.dataTransfer.effectAllowed = 'move';
                              setDraggedBookingId(b.id);
                            }}
                            onDragEnd={() => {
                              setDraggedBookingId(null);
                              setDropTargetDriverId(null);
                            }}
                            className={`group hover:bg-white/5 transition-colors border-b border-white/5/50 last:border-0 ${draggedBookingId === b.id ? 'opacity-50' : ''}`}
                          >
                            <td className={`py-4 pl-2 font-mono ${delayMins > 0 ? 'text-red-500' : delayMins < 0 ? 'text-emerald-500' : 'text-white'}`}>
                              <div className="flex flex-col gap-0.5">
                                <span>{b.flight_number}</span>
                                {delayMins !== 0 && (
                                  <span className={`text-[10px] font-bold ${delayMins > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                                    {delayMins > 0 ? `+${delayMins}` : delayMins} min
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-4 text-slate-300">{b.origin}</td>
                            <td className="py-4 font-mono text-white">
                              <div className="flex flex-col">
                                <span className="text-[10px] text-brand-platinum/50 mb-0.5">{new Date(b.pickup_date).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' })}</span>
                                <span>{b.pickup_time}</span>
                              </div>
                            </td>
                            <td className="py-4">
                              <div className="flex flex-col gap-1 w-fit">
                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-black border text-center whitespace-nowrap
                            ${status === 'Final Approach' || status === 'Taxiing' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 animate-pulse' :
                                    status === 'Landed' ? 'bg-blue-500/20 text-brand-gold border-brand-gold/30' :
                                      status === 'Delayed' || (delayMins > 0) ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                                        delayMins < 0 ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
                                          'bg-slate-800 text-brand-platinum/50 border-white/5'}`}>
                                  {delayMins < 0 ? 'EARLY' : status}
                                </span>
                                {eta && (
                                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm text-center font-mono ${delayMins < 0 ? 'text-emerald-400 bg-emerald-500/10' : delayMins > 0 ? 'text-red-400 bg-red-500/10' : 'text-brand-platinum/60 bg-white/5'}`}>
                                    ETA: {new Date(eta).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                )}
                                {(status === 'Final Approach' || status === 'Taxiing') && !eta && (
                                  <span className="flex items-center gap-1 text-[8px] font-black text-emerald-500 uppercase tracking-widest justify-center mt-0.5">
                                    <span className="w-1 h-1 rounded-full bg-emerald-500 animate-ping"></span> LIVE
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-4 text-slate-300 flex items-center gap-2">
                              <span className="material-icons-round text-brand-gold text-xs">person</span>
                              {b.passenger}
                            </td>
                            <td className="py-4 pr-2 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button className="text-xs bg-brand-charcoal hover:bg-blue-600 border border-white/5 hover:border-brand-gold text-slate-300 hover:text-white px-3 py-1.5 rounded-full transition-all">
                                  Manage
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      }) : (
                        <tr><td colSpan={6} className="p-8 text-center text-brand-platinum/30">No flight reservations found in selected context</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

        </div >
      </div >
    </div >
  );
};
