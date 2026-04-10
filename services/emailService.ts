import { supabase } from './supabase';
import { LOGO_BASE64 } from '../utils/assets';

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

        // Prepare email payload using a red header design to indicate cancellation clearly
        const emailPayload: any = {
            to: booking.email,
            subject: `Aviso de Cancelación - Reserva ${bookingRef}`,
            from: senderEmail,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f4f6f9; padding: 20px;">
                    <div style="background-color: #b91c1c; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                        <img src="${LOGO_BASE64}" alt="Palladium Transfers Logo" style="max-height: 120px; margin-bottom: 20px;" />
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

        const emailPayload: any = {
            to: reservesEmail,
            subject: `Solicitud de Cambio - Reserva ${bookingRef}`,
            from: senderEmail,
            reply_to: booking.email || senderEmail,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f4f6f9; padding: 20px;">
                    <div style="background-color: #1a2533; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                        <img src="${LOGO_BASE64}" alt="Palladium Transfers Logo" style="max-height: 120px; margin-bottom: 20px;" />
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

export const sendInvoiceEmail = async (invoice: any, client: any, pdfBase64: string) => {
    try {
        if (!client || !client.email) {
            console.warn("sendInvoiceEmail: Client missing email address, skipping.");
            throw new Error('El cliente no tiene correo electrónico asignado.');
        }

        const senderEmail = 'noreply@palladiumtransfers.com';
        
        const emailPayload: any = {
            to: client.email,
            subject: `Factura ${invoice.invoice_number} - Palladium Transfers`,
            from: senderEmail,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f4f6f9; padding: 20px;">
                    <div style="background-color: #1a2533; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                        <img src="${LOGO_BASE64}" alt="Palladium Transfers Logo" style="max-height: 120px; margin-bottom: 20px;" />
                        <h1 style="color: #B3932F; margin: 0;">PALLADIUM TRANSFERS</h1>
                        <p style="color: #94a3b8; font-size: 12px; margin-top: 5px;">EXCELLENCE IN MOTION</p>
                    </div>
                    <div style="background-color: #ffffff; padding: 30px; border-radius: 0 0 10px 10px;">
                        <h2 style="color: #1a2533; margin-top: 0;">Factura de Servicios</h2>
                        <p style="color: #475569; line-height: 1.6;">Estimado/a ${client.legal_name || client.name},</p>
                        <p style="color: #475569; line-height: 1.6;">Adjunto a este correo encontrará su factura <strong>${invoice.invoice_number}</strong> por los servicios de transporte prestados.</p>
                        
                        <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0; text-align: center;">
                            <p style="margin: 0; color: #64748B; font-size: 14px;">Total a pagar</p>
                            <h3 style="margin: 5px 0 0 0; color: #1a2533; font-size: 24px;">${invoice.total_amount} €</h3>
                        </div>

                        <p style="color: #475569; line-height: 1.6; margin-top: 20px;">Si tiene alguna pregunta, no dude en contactarnos respondiendo a este correo.</p>
                        
                        <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8; text-align: center;">
                            Este es un mensaje automático. Por favor, no responda a este correo para notificaciones de recibo.
                        </div>
                    </div>
                </div>
            `,
            attachments: [
                {
                    filename: `Factura_${invoice.invoice_number}.pdf`,
                    content: pdfBase64,
                    content_type: 'application/pdf',
                }
            ]
        };

        const { error } = await supabase.functions.invoke('send-email-resend', {
            body: emailPayload
        });

        if (error) throw error;

        console.log(`Invoice email sent successfully to ${client.email}`);
        return true;
    } catch (error) {
        console.error("Error sending invoice email:", error);
        throw error;
    }
};
