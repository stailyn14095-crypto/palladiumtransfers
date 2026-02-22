import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { Session } from '@supabase/supabase-js';
import { useToast } from '../components/ui/Toast';
import { ViewState, Language } from '../types';

interface ClientPortalProps {
    session: Session | null;
    onNewBooking?: () => void;
    language?: Language;
}

export const ClientPortalView: React.FC<ClientPortalProps> = ({ session, onNewBooking, language = 'es' }) => {
    const [bookings, setBookings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const { showToast } = useToast();

    const t = (key: string) => {
        const dict: Record<string, { es: string; en: string }> = {
            title: { es: 'Mi Portal de Cliente', en: 'My Client Portal' },
            subtitle: { es: 'Gestión de traslados y servicios Palladium', en: 'Palladium transfers and services management' },
            newBooking: { es: 'Nueva Reserva', en: 'New Booking' },
            loading: { es: 'Cargando tus reservas...', en: 'Loading your bookings...' },
            noBookingsTitle: { es: 'No tienes reservas activas', en: 'You have no active bookings' },
            noBookingsDesc: { es: 'Comienza tu viaje con nosotros realizando tu primera reserva hoy mismo.', en: 'Start your journey with us by making your first booking today.' },
            bookNow: { es: 'Reservar Ahora', en: 'Book Now' },
            upcomingBookings: { es: 'Próximas Reservas', en: 'Upcoming Bookings' },
            noUpcoming: { es: 'No tienes traslados programados próximamente.', en: 'You have no scheduled transfers soon.' },
            bookingHistory: { es: 'Historial de Reservas', en: 'Booking History' },
            emptyHistory: { es: 'Tu historial está vacío.', en: 'Your history is empty.' },
            cancelErrorTime: { es: 'No se puede cancelar reservas con menos de 24 horas de antelación.', en: 'Cannot cancel bookings with less than 24 hours notice.' },
            cancelConfirm: { es: '¿Seguro que deseas cancelar esta reserva?', en: 'Are you sure you want to cancel this booking?' },
            cancelSuccess: { es: 'Reserva cancelada correctamente', en: 'Booking cancelled correctly' },
            cancelError: { es: 'Error al cancelar la reserva', en: 'Error cancelling the booking' },
            loadError: { es: 'Error al cargar reservas', en: 'Error loading bookings' },
        };
        return dict[key]?.[language] || key;
    };

    const fetchMyBookings = async (signal?: AbortSignal) => {
        if (!session?.user?.id) return;

        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('bookings')
                .select('*')
                .or(`user_id.eq.${session.user.id},email.eq.${session.user.email}`)
                .order('pickup_date', { ascending: false })
                .abortSignal(signal);

            if (error) {
                if (error.message?.includes('aborted')) return;
                throw error;
            }
            setBookings(data || []);
        } catch (err: any) {
            if (err.name === 'AbortError' || err.message?.includes('aborted')) return;
            console.error('Error fetching bookings:', err);
            showToast(t('loadError'), 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const controller = new AbortController();
        fetchMyBookings(controller.signal);
        return () => controller.abort();
    }, [session]);

    // Separate bookings into past and future
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    const futureBookings = bookings.filter(b => b.pickup_date >= todayStr && b.status !== 'Cancelled' && b.status !== 'Completed');
    const pastBookings = bookings.filter(b => b.pickup_date < todayStr || b.status === 'Cancelled' || b.status === 'Completed');

    const handleCancelBooking = async (booking: any) => {
        // ... (rest of the code remains similar)
        const pickupDateTime = new Date(`${booking.pickup_date}T${booking.pickup_time}`);
        const hoursDifference = (pickupDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);

        if (hoursDifference <= 24) {
            showToast(t('cancelErrorTime'), 'error');
            return;
        }

        if (window.confirm(t('cancelConfirm'))) {
            try {
                const { error } = await supabase
                    .from('bookings')
                    .update({ status: 'Cancelled' })
                    .eq('id', booking.id);

                if (error) throw error;
                showToast(t('cancelSuccess'), 'success');
                fetchMyBookings();
            } catch (err: any) {
                showToast(t('cancelError'), 'error');
            }
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Confirmed': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
            case 'In Progress': return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
            case 'Completed': return 'text-slate-400 bg-slate-500/10 border-slate-500/20';
            case 'Cancelled': return 'text-red-400 bg-red-500/10 border-red-500/20';
            default: return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
        }
    };


    return (
        <div className="flex-1 overflow-y-auto bg-brand-black custom-scrollbar p-8">
            <div className="max-w-6xl mx-auto">
                <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div>
                        <h1 className="text-4xl font-black text-white mb-2 tracking-tight">{t('title')}</h1>
                        <p className="text-brand-platinum/50 font-medium italic">{t('subtitle')}</p>
                    </div>
                    {onNewBooking && (
                        <button
                            onClick={onNewBooking}
                            className="bg-brand-gold hover:bg-brand-gold/80 text-black px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-xl transition-all active:scale-95"
                        >
                            <span className="material-icons-round">add_circle</span>
                            {t('newBooking')}
                        </button>
                    )}
                </header>

                {loading ? (
                    <div className="text-center text-brand-platinum/50 py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-gold mx-auto mb-4"></div>
                        {t('loading')}
                    </div>
                ) : bookings.length === 0 ? (
                    <div className="bg-brand-charcoal/80 border border-white/5 rounded-2xl p-16 text-center shadow-2xl">
                        <span className="material-icons-round text-6xl text-brand-platinum/10 mb-6 block font-thin">event_busy</span>
                        <h3 className="text-2xl font-bold text-white mb-3">{t('noBookingsTitle')}</h3>
                        <p className="text-brand-platinum/50 max-w-md mx-auto mb-8">{t('noBookingsDesc')}</p>
                        {onNewBooking && (
                            <button
                                onClick={onNewBooking}
                                className="inline-flex bg-white/5 border border-white/10 text-white hover:bg-white/10 px-8 py-4 rounded-xl font-bold transition-all"
                            >
                                {t('bookNow')}
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="space-y-12">
                        {/* Future Bookings */}
                        <section>
                            <div className="flex items-center gap-4 mb-6">
                                <h2 className="text-xl font-bold text-white">{t('upcomingBookings')}</h2>
                                <div className="h-0.5 flex-1 bg-white/5"></div>
                            </div>

                            {futureBookings.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {futureBookings.map(b => <BookingCard key={b.id} b={b} onCancel={handleCancelBooking} language={language} />)}
                                </div>
                            ) : (
                                <p className="text-brand-platinum/30 italic text-sm">{t('noUpcoming')}</p>
                            )}
                        </section>

                        {/* Past Bookings */}
                        <section>
                            <div className="flex items-center gap-4 mb-6">
                                <h2 className="text-xl font-bold text-white">{t('bookingHistory')}</h2>
                                <div className="h-0.5 flex-1 bg-white/5"></div>
                            </div>

                            {pastBookings.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 opacity-70">
                                    {pastBookings.map(b => <BookingCard key={b.id} b={b} language={language} />)}
                                </div>
                            ) : (
                                <p className="text-brand-platinum/30 italic text-sm">{t('emptyHistory')}</p>
                            )}
                        </section>
                    </div>
                )}
            </div>
        </div>
    );
};

interface BookingCardProps {
    b: any;
    onCancel?: (b: any) => void;
    language: Language;
}

const BookingCard: React.FC<BookingCardProps> = ({ b, onCancel, language }) => {
    const [driverInfo, setDriverInfo] = useState<any>(null);
    const [vehicleInfo, setVehicleInfo] = useState<any>(null);

    const t = (key: string) => {
        const dict: Record<string, { es: string; en: string }> = {
            pickup: { es: 'Recogida', en: 'Pickup' },
            dropoff: { es: 'Destino', en: 'Dropoff' },
            address: { es: 'Dirección Exacta', en: 'Exact Address' },
            passengers: { es: 'Pasajeros', en: 'Passengers' },
            flight: { es: 'Vuelo', en: 'Flight' },
            driver: { es: 'Conductor', en: 'Driver' },
            vehicle: { es: 'Vehículo', en: 'Vehicle' },
            cancel: { es: 'Cancelar Reserva', en: 'Cancel Booking' },
            status_pending: { es: 'Pendiente', en: 'Pending' },
            status_confirmed: { es: 'Confirmado', en: 'Confirmed' },
            status_inprogress: { es: 'En Curso', en: 'In Progress' },
            status_completed: { es: 'Completado', en: 'Completed' },
            status_cancelled: { es: 'Cancelado', en: 'Cancelled' },
            pickup_address_label: { es: 'Ruta y Dirección de Recogida', en: 'Route and Pickup Address' },
            pickup_date_time_label: { es: 'Fecha y Hora de Recogida', en: 'Pickup Date and Time' },
            driver_info_label: { es: 'Información del Traslado', en: 'Transfer Information' },
            assigned_driver: { es: 'Conductor Asignado', en: 'Assigned Driver' },
            driver_phone_visible_24h: { es: '* El teléfono del conductor será visible 24h antes.', en: '* Driver\'s phone will be visible 24h before.' },
            vehicle_category_label: { es: 'Categoría Solicitada', en: 'Requested Category' },
            not_specified: { es: 'No especificada', en: 'Not specified' },
            standard: { es: 'Standard', en: 'Standard' },
            price: { es: 'Precio', en: 'Price' },
            cancel_service: { es: 'Cancelar Servicio', en: 'Cancel Service' },
        };
        return dict[key]?.[language] || key;
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'Confirmed': return t('status_confirmed');
            case 'In Progress': return t('status_inprogress');
            case 'Completed': return t('status_completed');
            case 'Cancelled': return t('status_cancelled');
            default: return t('status_pending');
        }
    };

    useEffect(() => {
        if (b.driver_id) {
            const fetchDriverAndVehicle = async () => {
                // Fetch driver phone
                const { data: driver } = await supabase
                    .from('drivers')
                    .select('name, phone')
                    .eq('id', b.driver_id)
                    .single();
                setDriverInfo(driver);

                // Fetch vehicle via shifts for that day
                const bDate = b.pickup_date?.split('T')[0];
                if (bDate) {
                    const { data: shift } = await supabase
                        .from('shifts')
                        .select('vehicle_id')
                        .eq('driver_id', b.driver_id)
                        .eq('date', bDate)
                        .single();

                    if (shift?.vehicle_id) {
                        const { data: vehicle } = await supabase
                            .from('vehicles')
                            .select('plate, model')
                            .eq('id', shift.vehicle_id)
                            .single();
                        setVehicleInfo(vehicle);
                    }
                }
            };
            fetchDriverAndVehicle();
        }
    }, [b.driver_id, b.pickup_date]);

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Confirmed': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
            case 'In Progress': return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
            case 'Completed': return 'text-slate-400 bg-slate-500/10 border-slate-500/20';
            case 'Cancelled': return 'text-red-400 bg-red-500/10 border-red-500/20';
            default: return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
        }
    };

    const formatDate = (dateStr: string) => {
        if (!dateStr) return '';
        // Handle ISO strings by taking only the date part
        const cleanDate = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
        const parts = cleanDate.split('-');
        if (parts.length !== 3) return dateStr;
        const [y, m, d] = parts;
        return `${d}/${m}/${y}`;
    };

    const formatTime = (timeStr: string) => {
        if (!timeStr) return '';
        return timeStr.slice(0, 5);
    };

    const isWithin24h = () => {
        if (!b.pickup_date || !b.pickup_time) return false;
        try {
            const pickup = new Date(`${b.pickup_date}T${b.pickup_time}`);
            const now = new Date();
            const diff = pickup.getTime() - now.getTime();
            return diff > 0 && diff <= 24 * 60 * 60 * 1000;
        } catch (e) {
            return false;
        }
    };

    return (
        <div className="bg-brand-charcoal border border-white/5 flex flex-col rounded-2xl p-6 hover:border-brand-gold/20 transition-colors">
            <div className="flex items-start justify-between mb-4">
                <div className={`px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-full border ${getStatusColor(b.status || 'Pending')}`}>
                    {getStatusLabel(b.status || 'Pending')}
                </div>
                <span className="text-brand-platinum/30 font-mono text-[10px] max-w-24 truncate" title={b.id}>#{b.display_id || b.id?.split('-')[0]}</span>
            </div>

            <div className="flex-1 space-y-4">
                <div>
                    <div className="text-[9px] text-brand-platinum/30 mb-1 font-black uppercase tracking-[0.2em]">{t('pickup_address_label')}</div>
                    <div className="text-white font-bold leading-tight mb-1">
                        {b.route || `${b.origin} - ${b.destination}`}
                    </div>
                    <div className="text-brand-gold text-xs italic">
                        {b.pickup_address || b.origin_address || t('not_specified')}
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                    <div className="bg-brand-black/40 p-3 rounded-xl border border-white/5">
                        <div className="text-[9px] text-brand-platinum/30 mb-1 font-black uppercase tracking-widest">{t('pickup_date_time_label')}</div>
                        <div className="text-white flex items-center gap-3">
                            <span className="font-bold text-lg">{formatDate(b.pickup_date)}</span>
                            <span className="text-brand-gold font-bold">{formatTime(b.pickup_time)}h</span>
                        </div>
                    </div>
                </div>

                {(b.driver_id || b.assigned_driver_name) && (
                    <div className="bg-brand-gold/5 p-4 rounded-xl border border-brand-gold/10 space-y-2">
                        <div className="text-[9px] text-brand-gold font-black uppercase tracking-widest">{t('driver_info_label')}</div>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-brand-gold/20 flex items-center justify-center text-brand-gold">
                                <span className="material-icons-round">person</span>
                            </div>
                            <div>
                                <div className="text-white font-bold text-sm">{driverInfo?.name || b.assigned_driver_name || t('assigned_driver')}</div>
                                {vehicleInfo && (
                                    <div className="text-brand-platinum/50 text-[10px] font-bold uppercase">
                                        {vehicleInfo.model} - <span className="text-brand-gold">{vehicleInfo.plate}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                        {isWithin24h() && driverInfo?.phone && (
                            <div className="flex items-center gap-2 mt-3 pt-2 border-t border-brand-gold/10">
                                <span className="material-icons-round text-sm text-brand-gold">phone</span>
                                <a href={`tel:${driverInfo.phone}`} className="text-white font-mono text-sm hover:text-brand-gold transition-colors">
                                    {driverInfo.phone}
                                </a>
                            </div>
                        )}
                        {!isWithin24h() && b.driver_id && (
                            <div className="text-[9px] text-brand-platinum/30 italic mt-2">
                                {t('driver_phone_visible_24h')}
                            </div>
                        )}
                    </div>
                )}

                <div>
                    <div className="text-[9px] text-brand-platinum/30 mb-1 font-black uppercase tracking-widest">{t('vehicle_category_label')}</div>
                    <div className="text-white text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                        <span className="material-icons-round text-sm">directions_car</span>
                        {b.vehicle_class || t('standard')}
                    </div>
                </div>
            </div>

            <div className="mt-8 pt-4 border-t border-white/5 flex items-center justify-between">
                <div className="text-2xl font-black text-white">{b.price || 0}€</div>

                {onCancel && b.status !== 'Cancelled' && b.status !== 'Completed' && (
                    <button
                        onClick={() => onCancel(b)}
                        className="text-[10px] text-red-400 hover:text-red-300 font-black uppercase tracking-widest px-4 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/25 transition-all border border-red-500/10"
                    >
                        Cancelar Servicio
                    </button>
                )}
            </div>
        </div>
    );
};
