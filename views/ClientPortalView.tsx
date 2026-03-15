import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { Session } from '@supabase/supabase-js';
import { useToast } from '../components/ui/Toast';
import { ViewState, Language } from '../types';
import { sendCancellationEmail, sendChangeRequestEmail } from '../services/emailService';

interface ClientPortalProps {
    session: Session | null;
    onNewBooking?: () => void;
    language?: Language;
}

export const ClientPortalView: React.FC<ClientPortalProps> = ({ session, onNewBooking, language = 'es' }) => {
    const [bookings, setBookings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isChangeModalOpen, setIsChangeModalOpen] = useState(false);
    const [selectedBookingForChange, setSelectedBookingForChange] = useState<any>(null);
    const [changeRequestText, setChangeRequestText] = useState('');
    const [isSubmittingChange, setIsSubmittingChange] = useState(false);

    const [profile, setProfile] = useState<any>(null);
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
    const [tempProfile, setTempProfile] = useState({ full_name: '', phone: '' });

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
            changeRequestTitle: { es: 'Solicitar Cambios', en: 'Request Changes' },
            changeRequestDesc: { es: '¿Qué cambios te gustaría realizar en esta reserva?', en: 'What changes would you like to make to this booking?' },
            changeRequestPlaceholder: { es: 'Ej: Necesito cambiar la dirección de recogida a...', en: 'Ex: I need to change the pickup address to...' },
            changeNotice: { es: 'Nota Importante: Los cambios de hora solo están permitidos con más de 24 horas de antelación. Si su recogida es en menos de 24 horas, por favor contacte directamente a reservas@palladiumtransfers.com.', en: 'Important Note: Time changes are only allowed with more than 24 hours notice. If your pickup is in less than 24 hours, please contact reservas@palladiumtransfers.com directly.' },
            changeErrorTime: { es: 'Esta reserva es en menos de 24h. Para cambiar la hora, contacte a reservas@palladiumtransfers.com', en: 'This booking is in less than 24h. To change the time, contact reservas@palladiumtransfers.com' },
            changeSuccess: { es: 'Solicitud de cambio enviada. Nuestro equipo la revisará en breve.', en: 'Change request sent. Our team will review it shortly.' },
            changeError: { es: 'Error al enviar la solicitud.', en: 'Error sending request.' },
            sendRequest: { es: 'Enviar Solicitud', en: 'Send Request' },
            cancelBtn: { es: 'Cancelar', en: 'Cancel' },
            profileSettings: { es: 'Configuración de Mi Cuenta', en: 'My Account Settings' },
            saveChanges: { es: 'Guardar Cambios', en: 'Save Changes' },
            fullName: { es: 'Nombre Completo', en: 'Full Name' },
            phone: { es: 'Teléfono', en: 'Phone' },
            profileUpdated: { es: 'Perfil actualizado con éxito', en: 'Profile updated successfully' },
            profileUpdateError: { es: 'Error al actualizar el perfil', en: 'Error updating profile' },
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
                .order('created_at', { ascending: false })
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

    const fetchProfile = async () => {
        if (!session?.user?.id) return;
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

        if (!error && data) {
            setProfile(data);
            setTempProfile({
                full_name: data.full_name || '',
                phone: data.phone || ''
            });
        }
    };

    useEffect(() => {
        const controller = new AbortController();
        fetchMyBookings(controller.signal);
        fetchProfile();
        return () => controller.abort();
    }, [session]);

    // Separate bookings into past and future
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    // Helper to get comparable timestamp
    const getTimestamp = (b: any) => {
        if (!b.pickup_date) return 0;
        const datePart = b.pickup_date.includes('T') ? b.pickup_date.split('T')[0] : b.pickup_date;
        const timePart = b.pickup_time ? (b.pickup_time.length === 5 ? `${b.pickup_time}:00` : b.pickup_time) : '00:00:00';
        return new Date(`${datePart}T${timePart}`).getTime();
    };

    const futureBookings = bookings
        .filter(b => b.pickup_date >= todayStr && b.status !== 'Cancelled' && b.status !== 'Completed')
        .sort((a, b) => getTimestamp(a) - getTimestamp(b));

    const pastBookings = bookings
        .filter(b => b.pickup_date < todayStr || b.status === 'Cancelled' || b.status === 'Completed')
        .sort((a, b) => getTimestamp(b) - getTimestamp(a)); // History: most recent first

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

                // Send cancellation email in the background
                sendCancellationEmail(booking);

                fetchMyBookings();
            } catch (err: any) {
                showToast(t('cancelError'), 'error');
            }
        }
    };

    const handleOpenChangeModal = (booking: any) => {
        setSelectedBookingForChange(booking);
        setChangeRequestText('');
        setIsChangeModalOpen(true);
    };

    const handleSubmitChangeRequest = async () => {
        if (!selectedBookingForChange || !changeRequestText.trim()) return;

        const pickupDateTime = new Date(`${selectedBookingForChange.pickup_date}T${selectedBookingForChange.pickup_time}`);
        const hoursDifference = (pickupDateTime.getTime() - new Date().getTime()) / (1000 * 60 * 60);

        if (hoursDifference <= 24) {
            const lowerText = changeRequestText.toLowerCase();
            if (lowerText.includes('hora') || lowerText.includes('time') || lowerText.includes('retras') || lowerText.includes('adelant')) {
                showToast(t('changeErrorTime'), 'error');
                return; // Block submission if it seems to be about time and < 24h
            }
        }

        setIsSubmittingChange(true);
        try {
            await sendChangeRequestEmail(selectedBookingForChange, changeRequestText);
            showToast(t('changeSuccess'), 'success');
            setIsChangeModalOpen(false);
        } catch (error) {
            showToast(t('changeError'), 'error');
        } finally {
            setIsSubmittingChange(false);
        }
    };

    const handleUpdateProfile = async () => {
        if (!session?.user?.id || isUpdatingProfile) return;

        setIsUpdatingProfile(true);
        try {
            // Update auth metadata
            const { error: authError } = await supabase.auth.updateUser({
                data: {
                    full_name: tempProfile.full_name,
                    phone: tempProfile.phone
                }
            });
            if (authError) throw authError;

            // Update profiles table
            const { error: profileError } = await supabase
                .from('profiles')
                .update({
                    full_name: tempProfile.full_name,
                    phone: tempProfile.phone
                })
                .eq('id', session.user.id);

            if (profileError) throw profileError;

            showToast(t('profileUpdated'), 'success');
            setProfile({ ...profile, ...tempProfile });
            setIsProfileModalOpen(false);
        } catch (err: any) {
            console.error('Error updating profile:', err);
            showToast(t('profileUpdateError'), 'error');
        } finally {
            setIsUpdatingProfile(false);
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
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setIsProfileModalOpen(true)}
                            className="bg-white/5 hover:bg-white/10 text-white p-3 rounded-xl transition-all active:scale-95 border border-white/10 flex items-center gap-2 group"
                            title={t('profileSettings')}
                        >
                            <span className="material-icons-round text-brand-gold group-hover:rotate-45 transition-transform">settings</span>
                            <span className="text-xs font-bold uppercase tracking-wider hidden sm:block">Mis Datos</span>
                        </button>
                        {onNewBooking && (
                            <button
                                onClick={onNewBooking}
                                className="bg-brand-gold hover:bg-brand-gold/80 text-black px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-xl transition-all active:scale-95"
                            >
                                <span className="material-icons-round">add_circle</span>
                                {t('newBooking')}
                            </button>
                        )}
                    </div>
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
                                    {futureBookings.map(b => <BookingCard key={b.id} b={b} onCancel={handleCancelBooking} onChange={handleOpenChangeModal} language={language} />)}
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

            {/* Change Request Modal */}
            {isChangeModalOpen && selectedBookingForChange && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-brand-charcoal border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-6">
                            <h3 className="text-xl font-bold text-white mb-2">{t('changeRequestTitle')}</h3>
                            <p className="text-brand-platinum/70 text-sm mb-6">{t('changeRequestDesc')}</p>

                            <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-xl mb-6 flex items-start gap-3">
                                <span className="material-icons-round text-blue-400 mt-0.5 text-lg">info</span>
                                <p className="text-xs text-blue-200/90 leading-relaxed">
                                    {t('changeNotice')}
                                </p>
                            </div>

                            <textarea
                                value={changeRequestText}
                                onChange={(e) => setChangeRequestText(e.target.value)}
                                placeholder={t('changeRequestPlaceholder')}
                                className="w-full bg-brand-black border border-white/10 rounded-xl p-4 text-white placeholder:text-white/20 min-h-[120px] focus:outline-none focus:border-brand-gold/50 focus:ring-1 focus:ring-brand-gold/50 resize-none"
                            ></textarea>
                        </div>
                        <div className="bg-brand-black/50 p-4 border-t border-white/5 flex justify-end gap-3">
                            <button
                                onClick={() => setIsChangeModalOpen(false)}
                                className="px-6 py-2 rounded-lg text-brand-platinum/70 hover:text-white hover:bg-white/5 font-bold transition-all"
                            >
                                {t('cancelBtn')}
                            </button>
                            <button
                                onClick={handleSubmitChangeRequest}
                                disabled={isSubmittingChange || !changeRequestText.trim()}
                                className="bg-brand-gold hover:bg-brand-gold/80 text-black px-6 py-2 rounded-lg font-bold flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
                            >
                                {isSubmittingChange ? (
                                    <span className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin"></span>
                                ) : (
                                    <span className="material-icons-round text-sm">send</span>
                                )}
                                {t('sendRequest')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Profile Management Modal */}
            {isProfileModalOpen && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-brand-charcoal border border-white/10 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-8 border-b border-white/5 bg-brand-black/20">
                            <h3 className="text-xl font-black text-white flex items-center gap-3 uppercase tracking-wider">
                                <span className="material-icons-round text-brand-gold">manage_accounts</span>
                                {t('profileSettings')}
                            </h3>
                        </div>
                        
                        <div className="p-8 space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-brand-platinum/40 uppercase tracking-[0.2em] ml-1">{t('fullName')}</label>
                                <div className="relative">
                                    <span className="material-icons-round absolute left-4 top-3.5 text-slate-500 text-lg">person</span>
                                    <input
                                        type="text"
                                        value={tempProfile.full_name}
                                        onChange={(e) => setTempProfile({ ...tempProfile, full_name: e.target.value })}
                                        className="w-full bg-brand-black border border-white/10 rounded-2xl pl-12 pr-4 py-3.5 text-white placeholder-brand-platinum/20 focus:outline-none focus:ring-1 focus:ring-brand-gold/50 transition-all font-bold"
                                        placeholder="Tu Nombre"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-brand-platinum/40 uppercase tracking-[0.2em] ml-1">{t('phone')}</label>
                                <div className="relative">
                                    <span className="material-icons-round absolute left-4 top-3.5 text-slate-500 text-lg">phone</span>
                                    <input
                                        type="tel"
                                        value={tempProfile.phone}
                                        onChange={(e) => setTempProfile({ ...tempProfile, phone: e.target.value })}
                                        className="w-full bg-brand-black border border-white/10 rounded-2xl pl-12 pr-4 py-3.5 text-white placeholder-brand-platinum/20 focus:outline-none focus:ring-1 focus:ring-brand-gold/50 transition-all font-bold"
                                        placeholder="+34"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="bg-brand-black/40 p-6 border-t border-white/5 flex gap-3">
                            <button
                                onClick={() => setIsProfileModalOpen(false)}
                                className="flex-1 py-3.5 rounded-xl text-brand-platinum/70 hover:text-white hover:bg-white/5 font-bold transition-all"
                            >
                                {t('cancelBtn')}
                            </button>
                            <button
                                onClick={handleUpdateProfile}
                                disabled={isUpdatingProfile}
                                className="flex-[2] bg-brand-gold hover:bg-brand-gold/80 text-black py-4 rounded-xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 shadow-xl shadow-brand-gold/10 transition-all active:scale-95 disabled:opacity-50"
                            >
                                {isUpdatingProfile ? (
                                    <span className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin"></span>
                                ) : (
                                    <>
                                        <span className="material-icons-round text-sm">save</span>
                                        {t('saveChanges')}
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

interface BookingCardProps {
    b: any;
    onCancel?: (b: any) => void;
    onChange?: (b: any) => void;
    language: Language;
}

const BookingCard: React.FC<BookingCardProps> = ({ b, onCancel, onChange, language }) => {
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
            request_changes: { es: 'Solicitar Cambios', en: 'Request Changes' },
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
            <div className="flex items-start justify-end mb-4">
                <span className="text-brand-platinum/30 font-mono text-[10px] max-w-24 truncate" title={b.id}>#{b.display_id || b.id?.split('-')[0]}</span>
            </div>

            <div className="flex-1 space-y-4">
                <div className="bg-brand-black/60 p-4 rounded-xl border border-white/5">
                    <div className="text-[10px] text-brand-platinum/50 mb-2 font-black uppercase tracking-[0.2em]">{t('pickup_address_label')}</div>
                    <div className="text-white font-black text-xl leading-tight mb-2 drop-shadow-md">
                        {b.route || `${b.origin} - ${b.destination}`}
                    </div>
                    {(b.pickup_address || b.origin_address) && (
                        <div className="text-brand-gold font-bold text-sm bg-brand-gold/10 inline-flex items-center gap-2 px-3 py-1 rounded-md">
                            <span>Origen: {b.origin_address || b.pickup_address}</span>
                            {b.origin?.toLowerCase().includes('aeropuerto') && b.flight_number && (
                                <span className="bg-brand-black/50 text-brand-gold/80 px-2 py-0.5 rounded text-[10px] tracking-wider border border-brand-gold/20">
                                    <i className="material-icons-round text-[10px] mr-1 align-middle">flight_land</i>
                                    {b.flight_number}
                                </span>
                            )}
                        </div>
                    )}
                    {(b.destination_address) && (
                        <div className="text-brand-platinum font-bold text-sm bg-white/10 inline-flex items-center gap-2 px-3 py-1 rounded-md mt-2">
                            <span>Destino: {b.destination_address}</span>
                            {b.destination?.toLowerCase().includes('aeropuerto') && b.flight_number && (
                                <span className="bg-brand-black/50 text-white/80 px-2 py-0.5 rounded text-[10px] tracking-wider border border-white/20">
                                    <i className="material-icons-round text-[10px] mr-1 align-middle">flight_takeoff</i>
                                    {b.flight_number}
                                </span>
                            )}
                        </div>
                    )}
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
                    <div className="bg-brand-gold/5 p-4 rounded-xl border border-brand-gold/20 flex flex-col gap-3">
                        <div className="text-[10px] text-brand-gold font-black uppercase tracking-widest flex items-center gap-2">
                            <span className="material-icons-round text-sm">local_taxi</span>
                            {t('driver_info_label')}
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full border-2 border-brand-gold/30 bg-brand-charcoal flex items-center justify-center text-brand-gold shadow-lg">
                                <span className="material-icons-round text-xl">person</span>
                            </div>
                            <div className="flex-1">
                                <div className="text-white font-black text-lg">{driverInfo?.name || b.assigned_driver_name || t('assigned_driver')}</div>
                                {driverInfo?.phone && (
                                    <div className="flex items-center gap-1.5 mt-0.5 text-brand-platinum hover:text-white transition-colors">
                                        <span className="material-icons-round text-sm text-brand-gold">phone</span>
                                        <a href={`tel:${driverInfo.phone}`} className="font-mono text-sm tracking-wide">
                                            {driverInfo.phone}
                                        </a>
                                    </div>
                                )}
                            </div>
                        </div>

                        {vehicleInfo && (
                            <div className="mt-2 pt-3 border-t border-brand-gold/10 flex items-center justify-between">
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-bold text-brand-platinum/50 uppercase tracking-widest">{t('vehicle')}</span>
                                    <span className="text-white font-bold">{vehicleInfo.model}</span>
                                </div>
                                <div className="flex flex-col items-end">
                                    <span className="text-[10px] font-bold text-brand-platinum/50 uppercase tracking-widest">Matrícula</span>
                                    <div className="bg-white px-2 py-0.5 rounded border border-gray-300 flex items-center mt-0.5">
                                        <div className="bg-blue-600 h-full w-2 mr-1.5 rounded-sm"></div>
                                        <span className="text-black font-black font-mono text-sm tracking-wider">{vehicleInfo.plate}</span>
                                    </div>
                                </div>
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

                <div className="flex gap-2">
                    {onChange && b.status !== 'Cancelled' && b.status !== 'Completed' && (
                        <button
                            onClick={() => onChange(b)}
                            className="text-[10px] text-brand-gold hover:text-brand-gold/80 font-black uppercase tracking-widest px-4 py-2 rounded-lg bg-brand-gold/10 hover:bg-brand-gold/25 transition-all border border-brand-gold/10"
                        >
                            {t('request_changes')}
                        </button>
                    )}
                    {onCancel && b.status !== 'Cancelled' && b.status !== 'Completed' && (
                        <button
                            onClick={() => onCancel(b)}
                            className="text-[10px] text-red-400 hover:text-red-300 font-black uppercase tracking-widest px-4 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/25 transition-all border border-red-500/10"
                        >
                            {t('cancel_service')}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
