import React, { useState } from 'react';
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
  const [timeWindow, setTimeWindow] = useState(10); // Default +/- 10 hours

  const filteredBookings = React.useMemo(() => {
    if (!bookings) return [];
    const now = new Date();
    const msInHour = 60 * 60 * 1000;

    return bookings.filter((b: any) => {
      if (!b.flight_number || !b.pickup_date || !b.pickup_time) return false;

      // Construct booking date
      const bookingTime = new Date(`${b.pickup_date}T${b.pickup_time}`);
      const diffHours = (bookingTime.getTime() - now.getTime()) / msInHour;

      // Check window: -timeWindow <= diff <= +timeWindow
      return diffHours >= -timeWindow && diffHours <= timeWindow;
    }).sort((a: any, b: any) => {
      // Sort absolute distance from now (closest first? or just chronological?)
      // User asked for 10h back and 10h forward. Chronological usually best.
      const dateA = new Date(`${a.pickup_date}T${a.pickup_time}`);
      const dateB = new Date(`${b.pickup_date}T${b.pickup_time}`);
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
          <div className="col-span-12 md:col-span-8 lg:col-span-5 bg-brand-charcoal/70 backdrop-blur-md border border-white/5/50 rounded-2xl p-6 flex flex-col">
            <div className="flex justify-between items-center mb-4 shrink-0">
              <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <span className="material-icons-round text-red-500">warning</span> Alert Center
              </h3>
              <button
                onClick={() => showToast('Actualizando alertas de reservas...', 'info')}
                className="text-xs text-brand-gold hover:text-white flex items-center gap-1"
              >
                <span className="material-icons-round text-xs">refresh</span> Live Info
              </button>
            </div>

            {/* ITV Warnings Section */}
            {vehicles?.some((v: any) => {
              if (!v.itv) return false;
              const diff = (new Date(v.itv).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24);
              return diff > 0 && diff < 15;
            }) && (
                <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl animate-pulse">
                  <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest flex items-center gap-2">
                    <span className="material-icons-round text-xs">gavel</span> Alerta ITV Próxima
                  </p>
                  <div className="mt-1 space-y-1">
                    {vehicles.filter((v: any) => {
                      const diff = (new Date(v.itv).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24);
                      return diff > 0 && diff < 15;
                    }).map((v: any) => (
                      <p key={v.id} className="text-[11px] text-white font-bold">
                        {v.plate} ({v.model}): Expira el {v.itv}
                      </p>
                    ))}
                  </div>
                </div>
              )}

            <div className="space-y-3 overflow-y-auto max-h-[220px] custom-scrollbar pr-1 flex-1">
              {bookings && flights && bookings.length > 0 ? (
                bookings
                  .filter((b: any) => {
                    const todayStr = new Date().toISOString().split('T')[0];
                    return b.pickup_date === todayStr && b.flight_number;
                  })
                  .map((b: any) => {
                    const flightInfo = flights.find((f: any) => f.number === b.flight_number);
                    const isDelayed = flightInfo?.status === 'Delayed';
                    const isArriving = flightInfo?.status === 'Final Approach' || flightInfo?.status === 'Taxiing';

                    if (!isDelayed && !isArriving) return null;

                    return (
                      <div
                        key={b.id}
                        className={`flex items-start gap-3 p-3 rounded-xl border transition-all hover:scale-[1.01] ${isDelayed
                          ? 'bg-red-500/10 border-red-500/20'
                          : 'bg-blue-500/10 border-brand-gold/20'
                          }`}
                      >
                        <span className={`material-icons-round text-sm mt-0.5 ${isDelayed ? 'text-red-500' : 'text-brand-gold'
                          }`}>
                          {isDelayed ? 'flight_takeoff' : 'flight_land'}
                        </span>
                        <div className="flex-1">
                          <div className="flex justify-between items-start">
                            <h4 className="text-sm font-medium text-white">{b.flight_number} • {b.passenger}</h4>
                            <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded shadow-sm ${isDelayed ? 'bg-red-500/20 text-red-500' : 'bg-blue-500/20 text-brand-gold'
                              }`}>
                              {b.pickup_time}
                            </span>
                          </div>
                          <p className="text-xs text-brand-platinum/50 mt-1">
                            {isDelayed
                              ? `Vuelo ${b.flight_number} con retraso. Ajustar reserva de ${b.passenger}.`
                              : `Vuelo en estado: ${flightInfo?.status}. Pasajero esperando.`}
                          </p>
                        </div>
                      </div>
                    );
                  })
                  .filter(Boolean)
                  .length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 opacity-50">
                    <span className="material-icons-round text-4xl text-slate-700 mb-2">notifications_none</span>
                    <p className="text-xs text-brand-platinum/30">No hay alertas de vuelos para reservas de hoy.</p>
                  </div>
                ) : (
                  bookings
                    .filter((b: any) => {
                      const todayStr = new Date().toISOString().split('T')[0];
                      return b.pickup_date === todayStr && b.flight_number;
                    })
                    .map((b: any) => {
                      const flightInfo = flights.find((f: any) => f.number === b.flight_number);
                      const isDelayed = flightInfo?.status === 'Delayed';
                      const isArriving = flightInfo?.status === 'Final Approach' || flightInfo?.status === 'Taxiing';
                      if (!isDelayed && !isArriving) return null;

                      return (
                        <div
                          key={b.id}
                          className={`flex items-start gap-3 p-3 rounded-xl border transition-all hover:scale-[1.01] ${isDelayed
                            ? 'bg-red-500/10 border-red-500/20'
                            : 'bg-blue-500/10 border-brand-gold/20'
                            }`}
                        >
                          <span className={`material-icons-round text-sm mt-0.5 ${isDelayed ? 'text-red-500' : 'text-brand-gold'
                            }`}>
                            {isDelayed ? 'flight_takeoff' : 'flight_land'}
                          </span>
                          <div className="flex-1">
                            <div className="flex justify-between items-start">
                              <h4 className="text-sm font-medium text-white">{b.flight_number} • {b.passenger}</h4>
                              <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded shadow-sm ${isDelayed ? 'bg-red-500/20 text-red-500' : 'bg-blue-500/20 text-brand-gold'
                                }`}>
                                {b.pickup_time}
                              </span>
                            </div>
                            <p className="text-xs text-brand-platinum/50 mt-1">
                              {isDelayed
                                ? `Vuelo retrasado: ${b.flight_number}.`
                                : `Estado: ${flightInfo?.status}. Preparar recogida para ${b.passenger}.`}
                            </p>
                          </div>
                        </div>
                      );
                    })
                    .filter(Boolean)
                )
              ) : (
                <p className="text-xs text-brand-platinum/30 text-center py-10">Cargando alertas...</p>
              )}
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
          <div className="col-span-12 lg:col-span-8 bg-brand-charcoal/70 backdrop-blur-md border border-white/5/50 rounded-2xl p-6">
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
                            className={`group hover:bg-white/5 transition-colors border-b border-white/5/50 last:border-0 cursor-move ${draggedBookingId === b.id ? 'opacity-50' : ''}`}
                          >
                            <td className={`py-4 pl-2 font-mono ${status === 'Delayed' ? 'text-red-500' : 'text-white'}`}>{b.flight_number}</td>
                            <td className="py-4 text-slate-300">{b.origin}</td>
                            <td className="py-4 font-mono text-white">{b.pickup_time}</td>
                            <td className="py-4">
                              <div className="flex flex-col gap-1">
                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-black border text-center whitespace-nowrap
                            ${status === 'Final Approach' || status === 'Taxiing' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 animate-pulse' :
                                    status === 'Landed' ? 'bg-blue-500/20 text-brand-gold border-brand-gold/30' :
                                      status === 'Delayed' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                                        'bg-slate-800 text-brand-platinum/50 border-white/5'}`}>
                                  {status}
                                </span>
                                {(status === 'Final Approach' || status === 'Taxiing') && (
                                  <span className="flex items-center gap-1 text-[8px] font-black text-emerald-500 uppercase tracking-widest justify-center">
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
                                {!b.driver_id && (
                                  <button
                                    onClick={() => handleAutoAssign(b)}
                                    className="text-[10px] bg-emerald-600/20 hover:bg-emerald-600 border border-emerald-500/20 hover:border-emerald-500 text-emerald-400 hover:text-white px-3 py-1.5 rounded-full transition-all font-bold uppercase tracking-tighter"
                                  >
                                    Auto-Asignar
                                  </button>
                                )}
                                <button className="text-xs bg-brand-charcoal hover:bg-blue-600 border border-white/5 hover:border-brand-gold text-slate-300 hover:text-white px-3 py-1.5 rounded-full transition-all">
                                  Manage
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      }) : (
                        <tr><td colSpan={6} className="p-8 text-center text-brand-platinum/30">No flight reservations found for today</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Dispatch List */}
          <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">
            <div className="bg-brand-charcoal/70 backdrop-blur-md border border-white/5/50 rounded-2xl p-6 flex-1">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <span className="material-icons-round text-base text-brand-platinum/50">local_taxi</span> Vehicle Dispatch
                </h3>
                <span className="text-xs text-brand-platinum/30">Active: {activeDrivers.length}</span>
              </div>
              <div className="space-y-4">
                {loadingDrivers ? <div className="text-center text-brand-platinum/50">Loading drivers...</div> : filteredDrivers.map((d: any) => {
                  const driverServices = bookings?.filter((b: any) => b.driver_id === d.id && b.status !== 'Completed' && b.status !== 'Cancelled') || [];

                  return (
                    <div
                      key={d.id}
                      onDragOver={(e) => {
                        e.preventDefault();
                        if (draggedBookingId) setDropTargetDriverId(d.id);
                      }}
                      onDragLeave={() => setDropTargetDriverId(null)}
                      onDrop={(e) => {
                        e.preventDefault();
                        const bookingId = e.dataTransfer.getData('text');
                        setDropTargetDriverId(null);
                        setDraggedBookingId(null);
                        if (bookingId) handleReassign(bookingId, d.id);
                      }}
                      className={`bg-brand-charcoal border ${dropTargetDriverId === d.id ? 'border-brand-gold bg-blue-500/10 scale-[1.02]' : 'border-white/5'} rounded-xl p-4 hover:border-brand-gold/50 transition-all duration-200 group`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-lg">{(d.name || '?').charAt(0)}</div>
                            <div className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-[#141e2b] ${d.current_status === 'Working' ? 'bg-emerald-500' : d.current_status === 'Paused' ? 'bg-amber-500' : 'bg-slate-500'}`}></div>
                          </div>
                          <div>
                            <h4 className="text-sm font-medium text-white group-hover:text-brand-gold transition-colors uppercase tracking-tight">{d.name}</h4>
                            <p className="text-[10px] text-brand-platinum/30 uppercase font-black">{d.plate || 'No plate'}</p>
                          </div>
                        </div>
                        {d.vehicle && d.vehicle.includes('S-Class') && <span className="material-icons-round text-[#D4AF37] text-lg">workspace_premium</span>}
                      </div>

                      {/* Driver's Current Services (Draggable) */}
                      <div className="mt-4 space-y-2">
                        {driverServices.length > 0 ? driverServices.map((b: any) => (
                          <div
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
                            className={`bg-brand-charcoal p-2.5 rounded-lg border ${draggedBookingId === b.id ? 'opacity-50 border-brand-gold border-dashed' : 'border-white/5'} flex items-center justify-between cursor-move hover:bg-slate-800 transition-all group/item`}
                          >
                            <div className="flex flex-col gap-0.5">
                              <span className="text-[10px] font-black text-brand-gold flex items-center gap-1">
                                <span className="material-icons-round text-[10px]">schedule</span> {b.pickup_time}
                              </span>
                              <span className="text-[11px] font-bold text-slate-200">{b.passenger}</span>
                            </div>
                            <span className={`px-1.5 py-0.5 rounded-[4px] text-[8px] font-black uppercase ${b.status === 'Pending' ? 'bg-amber-500/10 text-amber-500' :
                              b.status === 'Confirmed' ? 'bg-blue-500/10 text-brand-gold' :
                                'bg-purple-500/10 text-purple-400'
                              }`}>{b.status}</span>
                          </div>
                        )) : (
                          <p className="text-[10px] text-slate-600 italic">No assigned services</p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 mt-4 pt-4 border-t border-white/5/50">
                        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-blue-500/20 text-brand-gold border border-brand-gold/30">AENA OK</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-medium border ${d.current_status === 'Working' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-amber-500/10 text-amber-500 border-amber-500/20'}`}>{d.current_status}</span>
                      </div>
                    </div>
                  );
                })}
                <button className="w-full mt-4 py-3 border border-dashed border-white/5 text-brand-platinum/50 rounded-xl hover:border-brand-gold hover:text-brand-gold hover:bg-blue-500/5 transition-all text-sm font-medium flex items-center justify-center gap-2">
                  <span className="material-icons-round text-base">add</span> Manually Assign Driver
                </button>
              </div>
            </div>
          </div>

        </div >
      </div >
    </div >
  );
};
