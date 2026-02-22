import React, { useState, useEffect } from 'react';
import { Logo } from './ui/Logo';
import { supabase } from '../services/supabase';
import { useBooking } from '../hooks/useBooking';
import { Language } from '../types';

interface BookingFormProps {
    language?: Language;
    onStepChange?: (step: number) => void;
}

const bookingTranslations = {
    es: {
        step: 'Paso',
        of: 'de',
        choose_vehicle: 'Elige tu Vehículo',
        standard: 'Estándar',
        premium: 'Premium',
        luxury: 'Lujo',
        van: 'Van',
        config_trip: 'Configura tu viaje',
        details: 'Últimos detalles',
        summary: 'Resumen de tu Viaje',
        from: 'De:',
        to: 'A:',
        outbound: 'Ida:',
        return: 'Vuelta:',
        one_way: 'Solo Ida',
        round_trip: 'Ida y Vuelta',
        select_origin: 'Selecciona Origen',
        select_destination: 'Selecciona Destino',
        pickup_date: 'Fecha Recogida',
        time: 'Hora',
        return_date: 'Fecha Vuelta',
        return_time: 'Hora Vuelta',
        total_estimated: 'Total Estimado',
        cash_payment: 'Pago en Efectivo al Conductor',
        continue: 'Continuar',
        email_label: 'Email (Acceso Invitado)',
        flight_label: 'Nº Vuelo',
        name_label: 'Nombre',
        phone_label: 'Teléfono',
        address_label: 'Dirección Exacta',
        extras_label: 'Añade Extras',
        back: 'Atrás',
        book_now: 'Reservar',
        success: '¡Reserva solicitada con éxito!',
        error: 'Hubo un error al procesar tu solicitud.',
        availability_error: '🚨 DISPONIBILIDAD AGOTADA: Lo sentimos, ya no quedan vehículos libres para las {hour}:00 de ese día. Por favor, selecciona otra hora.',
        pax_label: 'Pasajeros',
        back_home: 'Nueva Reserva / Inicio',
        booking_confirmed: 'Confirmación de Reserva'
    },
    en: {
        step: 'Step',
        of: 'of',
        choose_vehicle: 'Choose your Vehicle',
        standard: 'Standard',
        premium: 'Premium',
        luxury: 'Luxury',
        van: 'Van',
        config_trip: 'Configure your trip',
        details: 'Final details',
        summary: 'Trip Summary',
        from: 'From:',
        to: 'To:',
        outbound: 'Outbound:',
        return: 'Return:',
        one_way: 'One Way',
        round_trip: 'Round Trip',
        select_origin: 'Select Origin',
        select_destination: 'Select Destination',
        pickup_date: 'Pickup Date',
        time: 'Time',
        return_date: 'Return Date',
        return_time: 'Return Time',
        total_estimated: 'Total Estimated',
        cash_payment: 'Cash Payment to Driver',
        continue: 'Continue',
        email_label: 'Email (Guest Access)',
        flight_label: 'Flight No.',
        name_label: 'Name',
        phone_label: 'Phone',
        address_label: 'Exact Address',
        extras_label: 'Add Extras',
        back: 'Back',
        book_now: 'Book Now',
        success: 'Booking requested successfully!',
        error: 'There was an error processing your request.',
        availability_error: '🚨 AVAILABILITY EXHAUSTED: Sorry, no free vehicles left for {hour}:00 that day. Please select another time.',
        pax_label: 'Passengers',
        back_home: 'New Booking / Home',
        booking_confirmed: 'Booking Confirmation'
    }
};

export const BookingForm: React.FC<BookingFormProps> = ({ language = 'es', onStepChange }) => {
    const {
        step, setStep,
        loading,
        formData, setFormData,
        origins, destinations, availableVehicles,
        availableExtras, selectedExtras, toggleExtra,
        estimatedPrice,
        maxCapacity,
        handleChange,
        submitBooking
    } = useBooking(language);

    useEffect(() => {
        if (onStepChange) {
            onStepChange(step);
        }
    }, [step, onStepChange]);

    const [logoIcon, setLogoIcon] = useState<string | null>(null);

    useEffect(() => {
        const fetchLogo = async () => {
            const { data } = await supabase.from('system_settings').select('value').eq('key', 'logo_icon').single();
            if (data?.value) setLogoIcon(data.value);
        };
        fetchLogo();
    }, []);

    const t = bookingTranslations[language];

    const handleNext = () => {
        if (!formData.origin || !formData.destination || !formData.date || !formData.time) {
            alert(language === 'es' ? "Por favor, completa los campos obligatorios del trayecto." : "Please complete the required fields for the journey.");
            return;
        }
        setStep(2);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await submitBooking();
    };

    return (
        <div className="bg-brand-charcoal/95 backdrop-blur-2xl border border-white/5 p-10 rounded-[3rem] shadow-2xl w-full max-w-lg mx-auto overflow-hidden relative">
            <div className="absolute top-0 right-0 p-10 opacity-5">
                <span className="material-icons-round text-7xl text-white">local_taxi</span>
            </div>

            <div className="flex justify-between items-center mb-8 relative z-10">
                <div>
                    <h3 className="text-2xl font-light text-white leading-tight uppercase tracking-tight">Tu Traslado</h3>
                    <p className="text-[10px] text-brand-platinum font-bold uppercase tracking-[0.3em] mt-2">
                        {step < 4 ? `${t.step} ${step} ${t.of} 4` : t.booking_confirmed}
                    </p>
                </div>
                {step < 4 && (
                    <div className="flex gap-2">
                        <div className={`w-10 h-1 rounded-full transition-all duration-700 ${step >= 1 ? 'bg-brand-platinum shadow-[0_0_15px_rgba(229,231,235,0.3)]' : 'bg-white/10'}`}></div>
                        <div className={`w-10 h-1 rounded-full transition-all duration-700 ${step >= 2 ? 'bg-brand-platinum shadow-[0_0_15px_rgba(229,231,235,0.3)]' : 'bg-white/10'}`}></div>
                        <div className={`w-10 h-1 rounded-full transition-all duration-700 ${step >= 3 ? 'bg-brand-platinum shadow-[0_0_15px_rgba(229,231,235,0.3)]' : 'bg-white/10'}`}></div>
                    </div>
                )}
            </div>

            {/* Resumen de Reserva - VISIBLE ALWAYS if something is filled and not in step 4 */}
            {(formData.origin || formData.destination) && step < 4 && (
                <div className="mb-10 p-7 bg-white/5 border border-white/5 rounded-[2.5rem] animate-in fade-in duration-700 shadow-inner group overflow-hidden relative">
                    <div className="absolute top-[-20%] right-[-10%] w-32 h-32 bg-white/5 rounded-full blur-2xl group-hover:bg-white/10 transition-colors"></div>
                    <div className="flex items-center gap-3 mb-5">
                        <span className="material-icons-round text-brand-platinum text-xs">info</span>
                        <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-slate-500">{t.summary}</p>
                    </div>
                    <div className="space-y-3 relative z-10">
                        {formData.origin && (
                            <div className="flex justify-between items-start text-xs border-b border-white/5 pb-2">
                                <span className="text-slate-500 font-bold uppercase tracking-widest text-[9px]">{t.from}</span>
                                <span className="text-white font-black truncate max-w-[180px] text-right">{formData.origin}</span>
                            </div>
                        )}
                        {formData.destination && (
                            <div className="flex justify-between items-start text-xs border-b border-white/5 pb-2">
                                <span className="text-slate-500 font-bold uppercase tracking-widest text-[9px]">{t.to}</span>
                                <span className="text-white font-black truncate max-w-[180px] text-right">{formData.destination}</span>
                            </div>
                        )}
                        {formData.date && (
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-slate-500 font-bold uppercase tracking-widest text-[9px]">{t.outbound}</span>
                                <span className="text-brand-platinum font-bold uppercase tracking-widest text-[10px]">{formData.date} @ {formData.time || '--:--'}h</span>
                            </div>
                        )}
                        {formData.tripType === 'Round Trip' && formData.returnDate && (
                            <div className="flex justify-between items-center text-xs pt-1">
                                <span className="text-slate-500 font-bold uppercase tracking-widest text-[9px]">{t.return}</span>
                                <span className="text-brand-platinum font-bold uppercase tracking-widest text-[10px] italic">{formData.returnDate} @ {formData.returnTime || '--:--'}h</span>
                            </div>
                        )}

                        {/* THE PRICE IN SUMMARY */}
                        {estimatedPrice !== null && (
                            <div className="pt-5 mt-5 border-t border-white/5 flex justify-between items-end">
                                <span className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.3em]">{t.total_estimated}</span>
                                <div className="text-3xl font-light text-white leading-none tracking-tighter">
                                    {estimatedPrice.toFixed(2)}€
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {step === 1 ? (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-6 duration-700">
                    <div className="flex bg-black/40 p-1 rounded-2xl border border-white/5 shadow-inner">
                        <button
                            type="button"
                            onClick={() => setFormData(p => ({ ...p, tripType: 'One Way' }))}
                            className={`flex-1 py-4 rounded-xl text-[10px] font-bold uppercase tracking-[0.3em] transition-all duration-500 ${formData.tripType === 'One Way' ? 'bg-white text-black shadow-xl' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}
                        >
                            {t.one_way}
                        </button>
                        <button
                            type="button"
                            onClick={() => setFormData(p => ({ ...p, tripType: 'Round Trip' }))}
                            className={`flex-1 py-4 rounded-xl text-[10px] font-bold uppercase tracking-[0.3em] transition-all duration-500 ${formData.tripType === 'Round Trip' ? 'bg-white text-black shadow-xl' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}
                        >
                            {t.round_trip}
                        </button>
                    </div>

                    <div className="space-y-4">
                        <div className="relative group">
                            <span className="material-icons-round absolute left-4 top-[18px] text-brand-platinum/50 transition-all group-focus-within:text-brand-platinum">trip_origin</span>
                            <select
                                name="origin"
                                className="w-full bg-white/5 border border-white/5 rounded-2xl pl-12 pr-10 py-5 text-white font-bold tracking-tight focus:ring-1 focus:ring-brand-platinum/30 outline-none appearance-none transition-all cursor-pointer hover:bg-white/[0.08]"
                                onChange={handleChange}
                                value={formData.origin}
                            >
                                <option value="" disabled className="bg-slate-900 text-white">{t.select_origin}</option>
                                {origins.map(o => <option key={o} value={o} className="bg-slate-900 text-white">{o}</option>)}
                            </select>
                            <span className="material-icons-round absolute right-4 top-[18px] text-slate-600 pointer-events-none">expand_more</span>
                        </div>
                        <div className="relative group">
                            <span className="material-icons-round absolute left-4 top-[18px] text-brand-platinum/50 transition-all group-focus-within:text-brand-platinum">location_on</span>
                            <select
                                name="destination"
                                className="w-full bg-white/5 border border-white/5 rounded-2xl pl-12 pr-10 py-5 text-white font-bold tracking-tight focus:ring-1 focus:ring-brand-platinum/30 outline-none appearance-none transition-all cursor-pointer hover:bg-white/[0.08]"
                                onChange={handleChange}
                                value={formData.destination}
                                disabled={!formData.origin}
                            >
                                <option value="" disabled className="bg-slate-900 text-white">{t.select_destination}</option>
                                {destinations.map(d => <option key={d} value={d} className="bg-slate-900 text-white">{d}</option>)}
                            </select>
                            <span className="material-icons-round absolute right-4 top-[18px] text-slate-600 pointer-events-none">expand_more</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[9px] uppercase font-black text-slate-500 ml-1 tracking-[0.2em]">
                                {formData.origin?.toLowerCase().includes('aeropuerto') || formData.origin?.toLowerCase().includes('alc')
                                    ? (language === 'es' ? 'Fecha de llegada (Vuelo)' : 'Arrival Date (Flight)')
                                    : (formData.destination?.toLowerCase().includes('aeropuerto') || formData.destination?.toLowerCase().includes('alc')
                                        ? (language === 'es' ? 'Fecha de Recogida' : 'Pickup Date')
                                        : t.pickup_date)}
                            </label>
                            <input
                                type="date"
                                name="date"
                                className="w-full bg-white/5 border border-white/5 rounded-2xl px-5 py-5 text-white text-sm font-bold focus:ring-1 focus:ring-brand-platinum/30 outline-none transition-all hover:bg-white/[0.08]"
                                onChange={handleChange}
                                value={formData.date}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[9px] uppercase font-black text-slate-500 ml-1 tracking-[0.2em]">
                                {formData.origin?.toLowerCase().includes('aeropuerto') || formData.origin?.toLowerCase().includes('alc')
                                    ? (language === 'es' ? 'Hora de llegada (Vuelo)' : 'Arrival Time (Flight)')
                                    : (formData.destination?.toLowerCase().includes('aeropuerto') || formData.destination?.toLowerCase().includes('alc')
                                        ? (language === 'es' ? 'Hora de Recogida' : 'Pickup Time')
                                        : t.time)}
                            </label>
                            <input
                                type="time"
                                name="time"
                                className="w-full bg-white/5 border border-white/5 rounded-2xl px-5 py-5 text-white text-sm font-bold focus:ring-1 focus:ring-brand-platinum/30 outline-none transition-all hover:bg-white/[0.08]"
                                onChange={handleChange}
                                value={formData.time}
                            />
                        </div>
                    </div>

                    {formData.tripType === 'Round Trip' && (
                        <div className="grid grid-cols-2 gap-4 animate-in fade-in zoom-in duration-300">
                            <div className="space-y-2">
                                <label className="text-[9px] uppercase font-black text-slate-500 ml-1 tracking-[0.2em]">
                                    {formData.destination?.toLowerCase().includes('aeropuerto') || formData.destination?.toLowerCase().includes('alc')
                                        ? (language === 'es' ? 'Fecha de Vuelta (Vuelo)' : 'Return Date (Flight)')
                                        : t.return_date}
                                </label>
                                <input
                                    type="date"
                                    name="returnDate"
                                    className="w-full bg-white/5 border border-white/5 rounded-2xl px-5 py-5 text-white text-sm font-bold focus:ring-1 focus:ring-brand-platinum/30 outline-none transition-all hover:bg-white/[0.08]"
                                    onChange={handleChange}
                                    value={formData.returnDate}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[9px] uppercase font-black text-slate-500 ml-1 tracking-[0.2em]">
                                    {formData.destination?.toLowerCase().includes('aeropuerto') || formData.destination?.toLowerCase().includes('alc')
                                        ? (language === 'es' ? 'Hora de Vuelta (Vuelo)' : 'Return Time (Flight)')
                                        : t.return_time}
                                </label>
                                <input
                                    type="time"
                                    name="returnTime"
                                    className="w-full bg-white/5 border border-white/5 rounded-2xl px-5 py-5 text-white text-sm font-bold focus:ring-1 focus:ring-brand-platinum/30 outline-none transition-all hover:bg-white/[0.08]"
                                    onChange={handleChange}
                                    value={formData.returnTime}
                                />
                            </div>
                        </div>
                    )}

                    <div className="space-y-2">
                        <label className="text-[9px] uppercase font-black text-slate-500 ml-1 tracking-[0.2em]">{t.pax_label}</label>
                        <div className="relative group">
                            <span className="material-icons-round absolute left-4 top-[18px] text-brand-platinum/50 transition-all group-focus-within:text-brand-platinum">groups</span>
                            <select
                                name="passengers"
                                className="w-full bg-white/5 border border-white/5 rounded-2xl pl-12 pr-10 py-5 text-white font-bold tracking-tight focus:ring-1 focus:ring-brand-platinum/30 outline-none appearance-none transition-all cursor-pointer hover:bg-white/[0.08]"
                                onChange={handleChange}
                                value={formData.passengers}
                            >
                                {Array.from({ length: maxCapacity }, (_, i) => i + 1).map((num) => (
                                    <option key={num} value={num} className="bg-slate-900 text-white">
                                        {num} {num === 1 ? 'Pasajero' : 'Pasajeros'}
                                    </option>
                                ))}
                            </select>
                            <span className="material-icons-round absolute right-4 top-[18px] text-slate-600 pointer-events-none">expand_more</span>
                        </div>
                    </div>

                    <div className="pt-2">
                        <button
                            onClick={handleNext}
                            className="w-full bg-white hover:bg-brand-platinum text-black rounded-2xl py-6 font-bold uppercase text-[10px] tracking-[0.4em] shadow-2xl transition-all flex items-center justify-center gap-4 active:scale-95 group"
                        >
                            {t.continue}
                            <span className="material-icons-round text-sm transition-transform group-hover:translate-x-1">arrow_forward</span>
                        </button>
                    </div>
                </div>
            ) : step === 2 ? (
                <div className="space-y-8 animate-in fade-in slide-in-from-right-6 duration-700 text-center">
                    <h4 className="text-[10px] font-bold uppercase text-slate-500 tracking-[0.4em]">{t.choose_vehicle}</h4>

                    {availableVehicles && availableVehicles.length > 0 ? (
                        <div className="grid grid-cols-2 gap-4">
                            {availableVehicles.map((v: any) => {
                                let icon = 'local_taxi';
                                let label = v.id;
                                if (v.id.includes('Standard')) { icon = 'local_taxi'; label = t.standard || v.id; }
                                else if (v.id.includes('Premium')) { icon = 'directions_car'; label = t.premium || v.id; }
                                else if (v.id.includes('Lux')) { icon = 'star'; label = t.luxury || v.id; }
                                else if (v.id.includes('Van') || v.id.includes('Mino')) { icon = 'airport_shuttle'; label = t.van || v.id; }
                                else if (v.id.includes('Bus')) { icon = 'directions_bus'; label = 'Bus'; }

                                return (
                                    <button
                                        key={v.id}
                                        type="button"
                                        onClick={() => setFormData(p => ({ ...p, vehicleModel: v.id }))}
                                        className={`relative flex flex-col items-center justify-center p-8 rounded-[2rem] border transition-all duration-500 ${formData.vehicleModel === v.id ? 'bg-white text-black shadow-2xl border-transparent scale-[1.05]' : 'bg-white/5 border-white/5 text-slate-500 hover:bg-white/10 hover:border-white/10 hover:text-white'}`}
                                    >
                                        <span className={`material-icons-round text-5xl mb-4 transition-transform duration-700 ${formData.vehicleModel === v.id ? 'scale-110' : ''}`}>{icon}</span>
                                        <span className="text-[10px] font-bold uppercase tracking-[0.2em]">{label}</span>
                                        <span className={`absolute top-4 right-4 text-[9px] font-bold px-3 py-1 rounded-full ${formData.vehicleModel === v.id ? 'bg-black text-white' : 'bg-white/10 text-brand-platinum'}`}>
                                            {v.price.toFixed(2)}€
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    ) : (
                        <p className="text-slate-500 text-sm py-8 font-bold">No hay vehículos definidos para esta ruta.</p>
                    )}

                    <div className="flex gap-4 pt-8 mt-4 border-t border-white/5">
                        <button
                            type="button"
                            onClick={() => setStep(1)}
                            className="flex-1 bg-white/5 hover:bg-white/10 text-slate-500 hover:text-white font-bold py-5 rounded-2xl transition-all uppercase tracking-[0.3em] text-[10px] border border-white/5"
                        >
                            {t.back}
                        </button>
                        <button
                            type="button"
                            onClick={() => setStep(3)}
                            className="flex-[2] bg-white hover:bg-brand-platinum text-black font-bold py-5 rounded-2xl shadow-2xl transition-all uppercase tracking-[0.3em] text-[10px] flex items-center justify-center gap-4 active:scale-95 group"
                        >
                            {t.continue}
                            <span className="material-icons-round text-sm transition-transform group-hover:translate-x-1">arrow_forward</span>
                        </button>
                    </div>
                </div>
            ) : step === 3 ? (
                <form onSubmit={handleSubmit} className="space-y-6 animate-in fade-in slide-in-from-right-6 duration-700 max-h-[550px] overflow-y-auto pr-3 custom-scrollbar">
                    <div className="space-y-5">
                        <div className="space-y-2">
                            <label className="text-[9px] uppercase font-bold text-slate-500 ml-1 tracking-[0.4em]">{t.email_label}</label>
                            <input
                                type="email"
                                name="email"
                                placeholder="tu@email.com"
                                className="w-full bg-white/5 border border-white/5 rounded-2xl px-5 py-5 text-white placeholder-slate-700 font-bold focus:ring-1 focus:ring-brand-platinum/30 outline-none transition-all hover:bg-white/[0.08]"
                                onChange={handleChange}
                                value={formData.email}
                                required
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-[9px] uppercase font-bold text-slate-500 ml-1 tracking-[0.4em]">{t.flight_label}</label>
                                <input
                                    name="flightNumber"
                                    placeholder="Ej: IB2492"
                                    className="w-full bg-white/5 border border-white/5 rounded-2xl px-5 py-5 text-white placeholder-slate-700 text-sm font-bold focus:ring-1 focus:ring-brand-platinum/30 outline-none transition-all hover:bg-white/[0.08]"
                                    onChange={handleChange}
                                    value={formData.flightNumber}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[9px] uppercase font-bold text-slate-500 ml-1 tracking-[0.4em]">{t.name_label}</label>
                                <input
                                    name="name"
                                    placeholder="Nombre"
                                    className="w-full bg-white/5 border border-white/5 rounded-2xl px-5 py-5 text-white placeholder-slate-700 text-sm font-bold focus:ring-1 focus:ring-brand-platinum/30 outline-none transition-all hover:bg-white/[0.08]"
                                    onChange={handleChange}
                                    value={formData.name}
                                />
                            </div>
                            <div className="space-y-2 col-span-2">
                                <label className="text-[9px] uppercase font-bold text-slate-500 ml-1 tracking-[0.4em]">{t.phone_label}</label>
                                <input
                                    name="phone"
                                    type="tel"
                                    placeholder="+34 600 000 000"
                                    className="w-full bg-white/5 border border-white/5 rounded-2xl px-5 py-5 text-white placeholder-slate-700 text-sm font-bold focus:ring-1 focus:ring-brand-platinum/30 outline-none transition-all hover:bg-white/[0.08]"
                                    onChange={handleChange}
                                    value={formData.phone}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[9px] uppercase font-bold text-slate-500 ml-1 tracking-[0.4em]">{t.address_label}</label>
                            <input
                                name="pickupAddress"
                                placeholder="Hotel, Calle, Portal..."
                                className="w-full bg-white/5 border border-white/5 rounded-2xl px-5 py-5 text-white placeholder-slate-700 text-sm font-bold focus:ring-1 focus:ring-brand-platinum/30 outline-none transition-all hover:bg-white/[0.08]"
                                onChange={handleChange}
                                value={formData.pickupAddress}
                            />
                        </div>

                        {availableExtras.length > 0 && (
                            <div className="pt-4">
                                <label className="text-[10px] uppercase font-bold text-slate-500 ml-1 mb-6 block tracking-[0.5em]">{t.extras_label}</label>
                                <div className="grid grid-cols-1 gap-4">
                                    {availableExtras.map(extra => (
                                        <button
                                            key={extra.id}
                                            type="button"
                                            onClick={() => toggleExtra(extra.id)}
                                            className={`flex items-center justify-between p-5 rounded-2xl border transition-all duration-500 ${selectedExtras.includes(extra.id) ? 'bg-white text-black shadow-2xl border-transparent' : 'bg-white/5 border-white/5 text-slate-500 hover:bg-white/10 hover:border-white/10 hover:text-white'}`}
                                        >
                                            <div className="flex items-center gap-5">
                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${selectedExtras.includes(extra.id) ? 'bg-black/10' : 'bg-brand-black border border-white/5'}`}>
                                                    <span className="material-icons-round text-lg">{extra.icon || 'star'}</span>
                                                </div>
                                                <span className="text-[11px] font-bold uppercase tracking-widest">{extra.name}</span>
                                            </div>
                                            <span className={`text-[10px] font-bold px-4 py-2 rounded-full ${selectedExtras.includes(extra.id) ? 'bg-black/10' : 'bg-white/5'}`}>+{extra.price}€</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex gap-4 pt-8 sticky bottom-0 bg-brand-charcoal pb-4">
                        <button
                            type="button"
                            onClick={() => setStep(2)}
                            className="flex-1 bg-white/5 hover:bg-white/10 text-slate-500 hover:text-white font-bold py-5 rounded-2xl transition-all uppercase tracking-[0.3em] text-[10px] border border-white/5"
                        >
                            {t.back}
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-[2] bg-white hover:bg-brand-platinum text-black font-bold py-5 rounded-2xl shadow-2xl transition-all flex items-center justify-center gap-4 disabled:opacity-50 uppercase tracking-[0.3em] text-[10px] group active:scale-95"
                        >
                            {loading ? (
                                <span className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin"></span>
                            ) : (
                                <>
                                    {t.book_now}
                                    <span className="material-icons-round text-sm transition-transform group-hover:scale-110">check_circle</span>
                                </>
                            )}
                        </button>
                    </div>
                </form>
            ) : (
                // Step 4: Success / Summary Screen
                <div className="animate-in fade-in zoom-in duration-1000 text-center space-y-10 py-6">
                    <div className="flex flex-col items-center gap-6">
                        <div className="w-24 h-24 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 shadow-[0_0_50px_rgba(16,185,129,0.1)]">
                            <span className="material-icons-round text-6xl">check_circle</span>
                        </div>
                        <div className="brightness-200 grayscale contrast-200 opacity-30">
                            <Logo variant="icon" className="w-12 h-12" color="white" />
                        </div>
                        <div>
                            <h2 className="text-4xl font-light text-white tracking-tight uppercase">{t.success}</h2>
                            <p className="text-brand-platinum font-bold mt-3 uppercase tracking-[0.4em] text-[10px]">{t.booking_confirmed}</p>
                        </div>
                    </div>
                    <p className="text-slate-400 text-sm max-w-[280px] leading-relaxed">
                        {language === 'es' ? 'Tu reserva se ha registrado correctamente. Hemos enviado un email de confirmación.' : 'Your booking has been successfully registered. We have sent a confirmation email.'}
                    </p>

                    {/* Summary box in Success screen */}
                    <div className="bg-white/5 border border-white/5 rounded-[2.5rem] p-8 text-left space-y-5 overflow-hidden relative group">
                        <div className="absolute top-0 right-0 p-6 opacity-5">
                            <span className="material-icons-round text-7xl rotate-12">receipt_long</span>
                        </div>

                        <h3 className="text-[10px] font-bold uppercase tracking-[0.5em] text-brand-platinum/50 mb-4">{t.summary}</h3>

                        <div className="space-y-4 relative z-10">
                            <div className="flex justify-between items-baseline border-b border-white/5 pb-3">
                                <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider text-left">{t.from}</span>
                                <span className="text-xs text-white font-bold text-right pl-4">{formData.origin}</span>
                            </div>
                            <div className="flex justify-between items-baseline border-b border-white/5 pb-3">
                                <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider text-left">{t.to}</span>
                                <span className="text-xs text-white font-bold text-right pl-4">{formData.destination}</span>
                            </div>
                            <div className="flex justify-between border-b border-white/5 pb-3">
                                <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider text-left">{t.outbound}</span>
                                <span className="text-xs text-brand-platinum font-bold uppercase">{formData.date} @ {formData.time}h</span>
                            </div>
                            <div className="flex justify-between border-b border-white/5 pb-3">
                                <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider text-left">Categoría</span>
                                <span className="text-xs text-white font-bold">{formData.vehicleModel || 'Standard'}</span>
                            </div>
                            <div className="flex justify-between border-b border-white/5 pb-3">
                                <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider text-left">{t.pax_label}</span>
                                <span className="text-xs text-white font-bold uppercase tracking-tighter">{formData.passengers} PAX</span>
                            </div>
                            <div className="flex justify-between items-center pt-4">
                                <span className="text-[10px] uppercase font-bold text-brand-platinum tracking-[0.3em]">Total</span>
                                <div className="text-3xl font-light text-white tracking-tighter">
                                    {estimatedPrice?.toFixed(2)}€
                                </div>
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={() => {
                            setStep(1);
                            setFormData({
                                tripType: 'One Way', origin: '', destination: '', date: '', time: '',
                                returnDate: '', returnTime: '', passengers: 1, email: '', name: '',
                                phone: '', flightNumber: '', pickupAddress: '', notes: '',
                            });
                        }}
                        className="w-full bg-white hover:bg-brand-platinum text-black rounded-[2rem] py-6 font-bold uppercase text-[10px] tracking-[0.5em] transition-all flex items-center justify-center gap-4 border border-transparent active:scale-95 shadow-2xl group"
                    >
                        <span className="material-icons-round text-sm transition-transform group-hover:-translate-y-1">home</span>
                        {t.back_home}
                    </button>
                </div>
            )}

            <p className="mt-12 text-center text-[8px] text-slate-600 font-bold uppercase tracking-[0.6em] flex items-center justify-center gap-5 opacity-40">
                <span className="w-12 h-[1px] bg-slate-800"></span>
                Excellence in Motion
                <span className="w-12 h-[1px] bg-slate-800"></span>
            </p>
        </div>
    );
};
