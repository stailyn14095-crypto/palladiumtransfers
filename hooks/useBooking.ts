import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { jsPDF } from 'jspdf';
import { useToast } from '../components/ui/Toast';

export interface BookingFormData {
    tripType: string;
    origin: string;
    destination: string;
    date: string;
    time: string;
    returnDate: string;
    returnTime: string;
    passengers: number;
    email: string;
    name: string;
    phone: string;
    flightNumber: string;
    pickupAddress: string;
    notes: string;
    vehicleModel: string;
}

export const useBooking = (language: string = 'es') => {
    const { showToast } = useToast();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [tariffs, setTariffs] = useState<any[]>([]);
    const [availableExtras, setAvailableExtras] = useState<any[]>([]);
    const [selectedExtras, setSelectedExtras] = useState<string[]>([]);
    const [estimatedPrice, setEstimatedPrice] = useState<number | null>(null);
    const [origins, setOrigins] = useState<string[]>([]);
    const [destinations, setDestinations] = useState<string[]>([]);
    const [availableVehicles, setAvailableVehicles] = useState<any[]>([]);
    const [maxCapacity, setMaxCapacity] = useState<number>(8);

    const [formData, setFormData] = useState<BookingFormData>({
        tripType: 'One Way',
        origin: '',
        destination: '',
        date: '',
        time: '',
        returnDate: '',
        returnTime: '',
        passengers: 1,
        email: '',
        name: '',
        phone: '',
        flightNumber: '',
        pickupAddress: '',
        notes: '',
        vehicleModel: 'Standard',
    });

    useEffect(() => {
        const controller = new AbortController();
        fetchInitialData(controller.signal);
        return () => controller.abort();
    }, []);

    useEffect(() => {
        calculatePrice();
    }, [formData.origin, formData.destination, tariffs, formData.tripType, selectedExtras, formData.vehicleModel]);

    // Update destinations when origin changes
    useEffect(() => {
        if (formData.origin) {
            const forward = tariffs.filter(t => t.origin === formData.origin).map(t => t.destination);
            const backward = tariffs.filter(t => t.destination === formData.origin).map(t => t.origin);
            const relevantDestinations = Array.from(new Set([...forward, ...backward])).filter(d => d !== formData.origin);

            setDestinations(relevantDestinations);
            if (!relevantDestinations.includes(formData.destination)) {
                setFormData(prev => ({ ...prev, destination: '' }));
            }
        } else {
            setDestinations([]);
        }
    }, [formData.origin, tariffs]);

    // Compute available vehicles for the selected route
    useEffect(() => {
        if (formData.origin && formData.destination) {
            const matchingTariffs = tariffs.filter(t =>
                (t.origin === formData.origin && t.destination === formData.destination) ||
                (t.origin === formData.destination && t.destination === formData.origin)
            );

            // Extract unique vehicle classes and their prices
            const vehiclesMap = new Map();
            matchingTariffs.forEach(t => {
                const cls = (t.class || 'Standard').trim();
                const price = parseFloat(t.base_price || t.price || 0);
                let displayPrice = price;
                if (formData.tripType === 'Round Trip') displayPrice = price * 1.8;

                if (!vehiclesMap.has(cls) || vehiclesMap.get(cls).price > price) {
                    vehiclesMap.set(cls, { id: cls, price: displayPrice });
                }
            });

            const uniqueVehicles = Array.from(vehiclesMap.values());
            setAvailableVehicles(uniqueVehicles);

            // if current forms.vehicleModel is not in uniqueVehicles, pick the first one
            if (uniqueVehicles.length > 0 && !uniqueVehicles.find(v => v.id === formData.vehicleModel)) {
                setFormData(prev => ({ ...prev, vehicleModel: uniqueVehicles[0].id }));
            }
        } else {
            setAvailableVehicles([]);
        }
    }, [formData.origin, formData.destination, tariffs, formData.tripType]);

    async function fetchInitialData(signal?: AbortSignal) {
        console.log('useBooking: fetchInitialData started');
        try {
            const [tariffsRes, extrasRes] = await Promise.all([
                supabase.from('tariffs').select('*').abortSignal(signal),
                supabase.from('service_extras').select('*').abortSignal(signal)
            ]);

            if (tariffsRes.error) {
                if (tariffsRes.error.message?.includes('aborted')) return;
                console.error('useBooking: Error fetching tariffs:', tariffsRes.error);
                showToast('Error al cargar tarifas', 'error');
            }

            if (tariffsRes.data) {
                console.log('useBooking: Tariffs fetched:', tariffsRes.data.length);
                setTariffs(tariffsRes.data);
                const allLocs = tariffsRes.data.reduce((acc: string[], t: any) => {
                    if (t.origin) acc.push(t.origin);
                    if (t.destination) acc.push(t.destination);
                    return acc;
                }, []);
                const uniqueOrigins = Array.from(new Set(allLocs)).filter(Boolean).sort();
                console.log('useBooking: Unique locations found:', uniqueOrigins.length);
                setOrigins(uniqueOrigins as string[]);
            }

            if (extrasRes.error) {
                if (extrasRes.error.message?.includes('aborted')) return;
                console.error('useBooking: Error fetching extras:', extrasRes.error);
            }
            if (extrasRes.data) setAvailableExtras(extrasRes.data);

            // Fetch Maximum Capacity from Vehicles
            const { data: vehiclesData } = await supabase.from('vehicles').select('capacity');
            if (vehiclesData && vehiclesData.length > 0) {
                const max = Math.max(...vehiclesData.map(v => v.capacity || 0));
                if (max > 0) setMaxCapacity(max);
            }
        } catch (err: any) {
            if (err.name === 'AbortError' || err.message?.includes('aborted')) return;
            console.error('useBooking: Unexpected error in fetchInitialData:', err);
        }
    }

    const calculatePrice = () => {
        if (!formData.origin || !formData.destination) {
            setEstimatedPrice(null);
            return;
        }

        const matchingTariffs = tariffs.filter(t =>
            (t.origin === formData.origin && t.destination === formData.destination) ||
            (t.origin === formData.destination && t.destination === formData.origin)
        );

        let match = matchingTariffs.find(t => (t.class || 'Standard').trim() === formData.vehicleModel);
        if (!match && matchingTariffs.length > 0) {
            match = matchingTariffs[0];
        }

        let totalPrice = 0;

        if (match) {
            totalPrice = parseFloat(match.base_price || match.price || 0);
            if (formData.tripType === 'Round Trip') totalPrice *= 1.8;
        } else {
            setEstimatedPrice(null);
            return;
        }

        selectedExtras.forEach(extraId => {
            const extra = availableExtras.find(e => e.id === extraId);
            if (extra) totalPrice += parseFloat(extra.price || 0);
        });

        setEstimatedPrice(totalPrice);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;

        setFormData(prev => {
            const newData = { ...prev, [name]: value };

            // Auto-fill logic for addresses based on selections
            if (name === 'origin' || name === 'destination') {
                const selectedTariff = tariffs.find(t =>
                    (name === 'origin' && t.origin === value) ||
                    (name === 'destination' && t.destination === value)
                );

                if (selectedTariff) {
                    if (name === 'origin') {
                        // We used to auto-fill pickupAddress here, but the user requested it to be blank
                        // so the client can fill it manually.
                    } else if (name === 'destination') {
                        // For destination, we don't have a separate 'returnPickupAddress' in the base state yet,
                        // but if we are in a 'One Way' and the destination is an airport, we might want to prompt or fill.
                        // However, usually 'pickupAddress' is the main one.
                        // If it's a Return trip, we might want to handle returnPickupAddress.
                    }
                }
            }

            return newData;
        });
    };

    const toggleExtra = (extraId: string) => {
        setSelectedExtras(prev =>
            prev.includes(extraId) ? prev.filter(id => id !== extraId) : [...prev, extraId]
        );
    };

    const generateVoucher = (bookings: any[]) => {
        const doc = new jsPDF();
        const primaryColor = [20, 30, 43];
        const accentColor = [59, 130, 246];

        bookings.forEach((booking, index) => {
            if (index > 0) doc.addPage();

            // Header
            doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
            doc.rect(0, 0, 210, 40, 'F');

            doc.setTextColor(255, 255, 255);
            doc.setFontSize(22);
            doc.setFont('helvetica', 'bold');
            doc.text('PALLADIUM TRANSFERS', 20, 25);

            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.text('VOUCHER DE RESERVA', 20, 32);

            // Booking Details
            doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.text(index === 0 ? 'DATOS DEL TRAYECTO (IDA)' : 'DATOS DEL TRAYECTO (VUELTA)', 20, 55);

            doc.setDrawColor(accentColor[0], accentColor[1], accentColor[2]);
            doc.setLineWidth(1);
            doc.line(20, 58, 190, 58);

            doc.setFontSize(11);
            doc.setFont('helvetica', 'normal');

            const startY = 70;
            const lineSpacing = 10;

            const details = [
                ['Referencia:', booking.id?.substring(0, 8).toUpperCase() || 'PENDIENTE'],
                ['Pasajero:', booking.passenger],
                ['Email:', booking.email],
                ['Teléfono:', booking.phone || 'N/A'],
                ['Origen:', booking.origin],
                ['Destino:', booking.destination],
                ['Fecha:', booking.pickup_date],
                ['Hora:', booking.pickup_time],
                ['Vuelo:', booking.flight_number || 'N/A'],
                ['Dirección:', booking.pickup_address || 'Punto de encuentro estándar'],
                ['Precio:', `${booking.price}€`],
                ['Notas:', booking.notes?.split('Notas: ')[1] || 'Sin notas adicionales']
            ];

            details.forEach((detail, i) => {
                doc.setFont('helvetica', 'bold');
                doc.text(detail[0], 20, startY + (i * lineSpacing));
                doc.setFont('helvetica', 'normal');
                doc.text(detail[1], 60, startY + (i * lineSpacing));
            });

            // Footer
            doc.setFontSize(9);
            doc.setTextColor(100, 100, 100);
            const footerY = 270;
            doc.text('Gracias por confiar en Palladium Transfers.', 105, footerY, { align: 'center' });
            doc.text('Para cualquier duda o modificación, contacte con soporte: +34 600 000 000', 105, footerY + 5, { align: 'center' });
            doc.text('Este documento sirve como comprobante de su reserva.', 105, footerY + 10, { align: 'center' });
        });

        doc.save(`Voucher_Palladium_${formData.name || 'Reserva'}.pdf`);
        return doc.output('datauristring').split(',')[1];
    };

    const submitBooking = async () => {
        setLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const userId = session?.user?.id || null;

            // 1. Fetch total fleet size
            const { data: vehicles } = await supabase.from('vehicles').select('id');
            const TOTAL_FLEET = vehicles?.length || 12;

            // Re-fetch properly
            const { data: bookingsAtDate } = await supabase
                .from('bookings')
                .select('pickup_time')
                .eq('pickup_date', formData.date)
                .neq('status', 'Cancelled');

            const hour = parseInt(formData.time.split(':')[0]);
            const count = bookingsAtDate?.filter((b: any) =>
                b.pickup_time && parseInt(b.pickup_time.split(':')[0]) === hour
            ).length || 0;

            if (count >= TOTAL_FLEET) {
                showToast(`DISPONIBILIDAD AGOTADA: No quedan vehículos para las ${hour}:00`, 'error');
                setLoading(false);
                return false;
            }

            const selectedExtrasNames = selectedExtras
                .map(id => availableExtras.find(e => e.id === id)?.name)
                .filter(Boolean)
                .join(', ');

            const bookingsToInsert = [];

            // Intelligent Address Mapping for Outbound
            const isOriginHub = ['aeropuerto', 'tren', 'puerto', 'hotel'].includes(
                tariffs.find(t => t.origin === formData.origin)?.origin_type || ''
            ) || formData.origin.toLowerCase().includes('aeropuerto') || formData.origin.toLowerCase().includes('alc');

            const isDestHub = ['aeropuerto', 'tren', 'puerto', 'hotel'].includes(
                tariffs.find(t => t.destination === formData.destination)?.destination_type || ''
            ) || formData.destination.toLowerCase().includes('aeropuerto') || formData.destination.toLowerCase().includes('alc');

            let finalOriginAddress = formData.pickupAddress || formData.origin;
            let finalDestAddress = formData.destination;

            if (isOriginHub) {
                finalOriginAddress = formData.origin; // Hub is the origin address
                finalDestAddress = formData.pickupAddress || formData.destination; // Use user input or fallback to city name
            } else if (isDestHub) {
                finalOriginAddress = formData.pickupAddress || formData.origin; // Use user input or fallback to city name
                finalDestAddress = formData.destination; // Hub is the destination address
            }

            // 1. Outbound Booking
            bookingsToInsert.push({
                origin: formData.origin,
                destination: formData.destination,
                route: `${formData.origin} - ${formData.destination}`,
                passenger: formData.name || 'Invitado',
                email: formData.email,
                phone: formData.phone,
                pickup_date: formData.date,
                pickup_time: formData.time,
                time: new Date(`${formData.date}T${formData.time}`).toISOString(),
                trip_type: formData.tripType,
                return_date: formData.tripType === 'Round Trip' ? formData.returnDate : null,
                return_time: formData.tripType === 'Round Trip' ? formData.returnTime : null,
                status: 'Pending',
                price: formData.tripType === 'Round Trip' ? estimatedPrice! / 2 : estimatedPrice,
                driver_price: formData.tripType === 'Round Trip' ? estimatedPrice! / 2 : estimatedPrice,
                payment_method: 'Efectivo',
                client_name: 'Palladium Transfers S.L.',
                client_id: 'e2954bc3-fb9f-4702-b371-e910663b7f9e',
                flight_number: formData.flightNumber,
                pickup_address: formData.pickupAddress,
                origin_address: finalOriginAddress,
                destination_address: finalDestAddress,
                notes: `[IDA] Extras: ${selectedExtrasNames || 'Ninguno'}. Vehículo: ${formData.vehicleModel}. Notas: ${formData.notes}`,
                vehicle_class: formData.vehicleModel,
                user_id: userId,
                created_at: new Date().toISOString()
            });

            // 2. Return Booking (if Round Trip)
            if (formData.tripType === 'Round Trip') {
                // For return, it's basically the reverse
                bookingsToInsert.push({
                    origin: formData.destination,
                    destination: formData.origin,
                    route: `${formData.destination} - ${formData.origin}`,
                    passenger: formData.name || 'Invitado',
                    email: formData.email,
                    phone: formData.phone,
                    pickup_date: formData.returnDate,
                    pickup_time: formData.returnTime,
                    time: new Date(`${formData.returnDate}T${formData.returnTime}`).toISOString(),
                    trip_type: formData.tripType,
                    status: 'Pending',
                    price: estimatedPrice! / 2,
                    driver_price: estimatedPrice! / 2,
                    payment_method: 'Efectivo',
                    client_name: 'Palladium Transfers S.L.',
                    client_id: 'e2954bc3-fb9f-4702-b371-e910663b7f9e',
                    flight_number: '',
                    pickup_address: finalDestAddress, // Pick up from where they were dropped off
                    origin_address: finalDestAddress,
                    destination_address: finalOriginAddress,
                    notes: `[VUELTA] Regreso de reserva de ida. Extras: ${selectedExtrasNames || 'Ninguno'}. Vehículo: ${formData.vehicleModel}.`,
                    vehicle_class: formData.vehicleModel,
                    user_id: userId,
                    created_at: new Date().toISOString()
                });
            }

            const { error } = await supabase.from('bookings').insert(bookingsToInsert);
            if (error) throw error;

            const base64Voucher = generateVoucher(bookingsToInsert);

            // Fetch email sender from system settings (safely)
            const { data: settingsData } = await supabase
                .from('system_settings')
                .select('value')
                .eq('key', 'email_sender')
                .maybeSingle();

            const senderEmail = settingsData?.value || 'noreply@palladiumtransfers.com';
            const bookingRef = bookingsToInsert[0].id?.substring(0, 8).toUpperCase() || 'NUEVA';

            // Trigger Edge Function for Email
            supabase.functions.invoke('send-email-resend', {
                body: {
                    to: formData.email,
                    subject: `Confirmación de Reserva - ${bookingRef}`,
                    from: senderEmail,
                    attachments: [
                        {
                            filename: `Voucher_Palladium_${bookingRef}.pdf`,
                            content: base64Voucher,
                        }
                    ],
                    html: `
                        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f4f6f9; padding: 20px;">
                            <div style="background-color: #1a2533; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                                <h1 style="color: #ffffff; margin: 0;">PALLADIUM TRANSFERS</h1>
                                <p style="color: #94a3b8; margin: 10px 0 0 0;">CONFIRMACIÓN DE RESERVA</p>
                            </div>
                            <div style="background-color: #ffffff; padding: 30px; border-radius: 0 0 10px 10px;">
                                <h2 style="color: #1a2533; margin-top: 0;">¡Gracias por su reserva!</h2>
                                <p style="color: #475569; line-height: 1.6;">Hola ${bookingsToInsert[0].passenger},</p>
                                <p style="color: #475569; line-height: 1.6;">Su reserva ha sido procesada con éxito.</p>
                                <p style="color: #475569; line-height: 1.6; margin-top: 20px;">El voucher en PDF se ha descargado automáticamente en su dispositivo.</p>
                            </div>
                        </div>
                    `
                }
            }).catch(e => console.error("Email error:", e));

            showToast(language === 'es' ? '¡Reserva solicitada con éxito!' : 'Booking requested successfully!', 'success');
            setStep(4); // Go to summary step
            setSelectedExtras([]);
            // Don't reset formData yet so Step 3 can show the summary
            return true;
        } catch (error: any) {
            console.error('Error booking:', error);
            showToast(language === 'es' ? 'Hubo un error al procesar tu solicitud.' : 'There was an error processing your request.', 'error');
            return false;
        } finally {
            setLoading(false);
        }
    };

    return {
        step, setStep,
        loading,
        formData, setFormData,
        origins, destinations, availableVehicles,
        availableExtras, selectedExtras, toggleExtra,
        estimatedPrice,
        maxCapacity,
        handleChange,
        submitBooking
    };
};
