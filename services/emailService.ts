import { supabase } from './supabase';

export const sendCancellationEmail = async (booking: any) => {
    try {
        if (!booking || !booking.email) {
            console.warn("sendCancellationEmail: Booking missing email address, skipping.");
            return;
        }

        // Fetch email settings from system settings
        const { data: settingsData } = await supabase
            .from('system_settings')
            .select('key, value')
            .in('key', ['email_sender', 'admin_notification_email']);

        let senderEmail = 'noreply@palladiumtransfers.com';
        let adminEmail = null;

        if (settingsData) {
            const senderSetting = settingsData.find(s => s.key === 'email_sender');
            if (senderSetting && senderSetting.value) senderEmail = senderSetting.value;

            const adminSetting = settingsData.find(s => s.key === 'admin_notification_email');
            if (adminSetting && adminSetting.value) adminEmail = adminSetting.value;
        }

        const bookingRef = booking.display_id || booking.id?.substring(0, 8).toUpperCase() || 'DESCONOCIDA';
        const passengerName = booking.passenger || booking.client_name || 'Cliente';
        const route = booking.route || `${booking.origin || ''} - ${booking.destination || ''}`;
        const date = booking.pickup_date ? booking.pickup_date.split('T')[0] : '';
        const time = booking.pickup_time || '';

        const logoSvg = `
        <svg viewBox="0 0 440 180" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M 40 85 L 340 85" stroke="#dbb35e" stroke-width="4" stroke-linecap="round" fill="none"/>
            <path d="M 120 68 Q 220 20 310 80 Q 325 85 340 85 L 380 85 Q 405 85 415 110" stroke="#dbb35e" stroke-width="4" stroke-linecap="round" fill="none"/>
            <path d="M 160 110 L 415 110" stroke="#dbb35e" stroke-width="4" stroke-linecap="round" fill="none"/>
            <text x="220" y="140" text-anchor="middle" fill="#ffffff" style="font-family: helvetica, sans-serif; font-weight: 300; letter-spacing: 0.15em; font-size: 24px; text-transform: uppercase;">PALLADIUM TRANSFERS</text>
            <text x="220" y="165" text-anchor="middle" fill="#ffffff" style="font-family: helvetica, sans-serif; font-weight: bold; letter-spacing: 0.4em; font-size: 10px; text-transform: uppercase; opacity: 0.8;">EXCELLENCE IN MOTION</text>
        </svg>`.trim();

        const svgBase64Url = 'data:image/svg+xml;base64,' + btoa(encodeURIComponent(logoSvg).replace(/%([0-9A-F]{2})/g, (match, p1) => String.fromCharCode(parseInt(p1, 16))));

        // Prepare email payload using a red header design to indicate cancellation clearly
        const emailPayload: any = {
            to: booking.email,
            subject: `Aviso de Cancelación - Reserva ${bookingRef}`,
            from: senderEmail,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f4f6f9; padding: 20px;">
                    <div style="background-color: #b91c1c; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                        <img src="${svgBase64Url}" alt="Palladium Transfers Logo" style="max-height: 60px; margin-bottom: 10px;" />
                        <p style="color: #fca5a5; margin: 10px 0 0 0;">AVISO DE CANCELACIÓN</p>
                    </div>
                    <div style="background-color: #ffffff; padding: 30px; border-radius: 0 0 10px 10px;">
                        <h2 style="color: #1a2533; margin-top: 0;">Reserva Cancelada</h2>
                        <p style="color: #475569; line-height: 1.6;">Hola ${passengerName},</p>
                        <p style="color: #475569; line-height: 1.6;">Le informamos que su reserva con referencia <strong>${bookingRef}</strong> para el trayecto <strong>${route}</strong> el día <strong>${date}</strong> a las <strong>${time}</strong> ha sido <strong>cancelada</strong>.</p>
                        <p style="color: #475569; line-height: 1.6; margin-top: 20px; font-size: 14px;">Si tiene alguna duda o considera que esto es un error, por favor responda a este correo o póngase en contacto con nuestro equipo de atención al cliente.</p>
                        
                        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8; text-align: center;">
                            Este es un mensaje automático generado por nuestro sistema de operaciones.
                        </div>
                    </div>
                </div>
            `
        };

        // Add BCC to admin if configured
        if (adminEmail) {
            emailPayload.bcc = adminEmail;
        }

        // Trigger Edge Function for Email
        const { error } = await supabase.functions.invoke('send-email-resend', {
            body: emailPayload
        });

        if (error) throw error;

        console.log(`Cancellation email sent successfully for booking ${bookingRef}`);
    } catch (error) {
        console.error("Error sending cancellation email:", error);
    }
};

export const sendChangeRequestEmail = async (booking: any, requestDetails: string) => {
    try {
        if (!booking) {
            console.warn("sendChangeRequestEmail: Booking info missing.");
            return;
        }

        const senderEmail = 'noreply@palladiumtransfers.com';
        const reservesEmail = 'reservas@palladiumtransfers.com';

        const bookingRef = booking.display_id || booking.id?.substring(0, 8).toUpperCase() || 'DESCONOCIDA';
        const passengerName = booking.passenger || booking.client_name || 'Cliente';
        const route = booking.route || `${booking.origin || ''} - ${booking.destination || ''}`;
        const pickupDate = booking.pickup_date ? booking.pickup_date.split('T')[0] : '';
        const pickupTime = booking.pickup_time || '';

        const logoSvg = `
        <svg viewBox="0 0 440 180" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M 40 85 L 340 85" stroke="#dbb35e" stroke-width="4" stroke-linecap="round" fill="none"/>
            <path d="M 120 68 Q 220 20 310 80 Q 325 85 340 85 L 380 85 Q 405 85 415 110" stroke="#dbb35e" stroke-width="4" stroke-linecap="round" fill="none"/>
            <path d="M 160 110 L 415 110" stroke="#dbb35e" stroke-width="4" stroke-linecap="round" fill="none"/>
            <text x="220" y="140" text-anchor="middle" fill="#ffffff" style="font-family: helvetica, sans-serif; font-weight: 300; letter-spacing: 0.15em; font-size: 24px; text-transform: uppercase;">PALLADIUM TRANSFERS</text>
            <text x="220" y="165" text-anchor="middle" fill="#ffffff" style="font-family: helvetica, sans-serif; font-weight: bold; letter-spacing: 0.4em; font-size: 10px; text-transform: uppercase; opacity: 0.8;">EXCELLENCE IN MOTION</text>
        </svg>`.trim();

        const svgBase64Url = 'data:image/svg+xml;base64,' + btoa(encodeURIComponent(logoSvg).replace(/%([0-9A-F]{2})/g, (match, p1) => String.fromCharCode(parseInt(p1, 16))));

        const emailPayload: any = {
            to: reservesEmail,
            subject: `Solicitud de Cambio - Reserva ${bookingRef}`,
            from: senderEmail,
            reply_to: booking.email || senderEmail,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f4f6f9; padding: 20px;">
                    <div style="background-color: #1a2533; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                        <img src="${svgBase64Url}" alt="Palladium Transfers Logo" style="max-height: 60px; margin-bottom: 10px;" />
                        <p style="color: #94a3b8; margin: 10px 0 0 0;">Reserva: ${bookingRef}</p>
                    </div>
                    <div style="background-color: #ffffff; padding: 30px; border-radius: 0 0 10px 10px;">
                        <h2 style="color: #1a2533; margin-top: 0;">Detalles de la Solicitud</h2>
                        
                        <div style="margin-bottom: 20px; padding: 15px; background-color: #f8fafc; border-left: 4px solid #3b82f6; border-radius: 4px;">
                            <p style="color: #475569; margin: 0; line-height: 1.6; white-space: pre-wrap;">${requestDetails}</p>
                        </div>

                        <h3 style="color: #1a2533; margin-top: 30px;">Información de la Reserva Original</h3>
                        <table style="width: 100%; border-collapse: collapse; margin-top: 15px; color: #475569;">
                            <tr>
                                <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;"><strong>Pasajero:</strong></td>
                                <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;">${passengerName}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;"><strong>Email Cliente:</strong></td>
                                <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;">${booking.email || 'N/A'}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;"><strong>Teléfono:</strong></td>
                                <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;">${booking.phone || 'N/A'}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;"><strong>Ruta:</strong></td>
                                <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;">${route}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;"><strong>Fecha y Hora:</strong></td>
                                <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;">${pickupDate} a las ${pickupTime}</td>
                            </tr>
                        </table>
                        
                        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8; text-align: center;">
                            Solicitud generada a través del Portal de Cliente.
                        </div>
                    </div>
                </div>
            `
        };

        const { error } = await supabase.functions.invoke('send-email-resend', {
            body: emailPayload
        });

        if (error) throw error;

        console.log(`Change request email sent successfully for booking ${bookingRef}`);
    } catch (error) {
        console.error("Error sending change request email:", error);
        throw error;
    }
};
