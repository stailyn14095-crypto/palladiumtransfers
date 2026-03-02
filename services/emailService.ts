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

        // Prepare email payload using a red header design to indicate cancellation clearly
        const emailPayload: any = {
            to: booking.email,
            subject: `Aviso de Cancelación - Reserva ${bookingRef}`,
            from: senderEmail,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f4f6f9; padding: 20px;">
                    <div style="background-color: #b91c1c; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                        <h1 style="color: #ffffff; margin: 0;">PALLADIUM TRANSFERS</h1>
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
