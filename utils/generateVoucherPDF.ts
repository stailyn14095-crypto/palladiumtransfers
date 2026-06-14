import { jsPDF } from 'jspdf';
import { LOGO_BASE64 } from './assets';

export const generateVoucherPDF = (bookings: any[]): jsPDF => {
    const doc = new jsPDF();
    const primaryColor = [20, 30, 43];
    const accentColor = [59, 130, 246];

    bookings.forEach((booking, index) => {
        if (index > 0) doc.addPage();

        // Header Background
        doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.rect(0, 0, 210, 40, 'F');

        // Logo Image / Fallback text
        try {
            const base64Data = LOGO_BASE64.split(',')[1] || LOGO_BASE64;
            doc.addImage(base64Data, 'PNG', 75, 4, 60, 24);
        } catch (e) {
            // Palladium Transfers Logo (Text Representation)
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(22);
            doc.setFont('helvetica', 'normal');
            doc.text('PALLADIUM TRANSFERS', 105, 18, { align: 'center' });

            doc.setTextColor(219, 179, 94); // Gold color from SVG #dbb35e
            doc.setFontSize(9);
            doc.setFont('helvetica', 'bold');
            doc.text('EXCELLENCE IN MOTION', 105, 26, { align: 'center' });
        }

        // Accent Line
        doc.setDrawColor(219, 179, 94);
        doc.setLineWidth(0.5);
        doc.line(10, 33, 200, 33);

        // Title
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        doc.text('VOUCHER DE RESERVA', 20, 38);

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

        const rawNotes = booking.notes || '';
        const extrasMatch = rawNotes.match(/Extras: (.*?)\./);
        const extrasText = extrasMatch ? extrasMatch[1] : 'Ninguno';

        const userNotesMatch = rawNotes.match(/Notas: (.*)/);
        const userNotesText = userNotesMatch ? userNotesMatch[1] : 'Sin notas adicionales';

        const details = [
            ['Referencia:', booking.display_id || booking.id?.substring(0, 8).toUpperCase() || 'PENDIENTE'],
            ['Pasajero:', booking.passenger],
            ['Email:', booking.email],
            ['Teléfono:', booking.phone || 'N/A'],
            ['Origen:', booking.origin],
            ['Destino:', booking.destination],
            ['Fecha:', booking.pickup_date ? booking.pickup_date.split('T')[0] : ''],
            ['Hora:', booking.pickup_time],
            ['Vuelo:', booking.flight_number || 'N/A'],
            ['Dir. Origen:', booking.origin_address || booking.pickup_address || booking.origin],
            ['Dir. Destino:', booking.destination_address || booking.destination],
            ['Extras:', extrasText],
            ['Precio:', `${booking.price}€`],
            ['Notas:', userNotesText]
        ];

        details.forEach((detail, i) => {
            doc.setFont('helvetica', 'bold');
            doc.text(String(detail[0] || ''), 20, startY + (i * lineSpacing));
            doc.setFont('helvetica', 'normal');
            doc.text(String(detail[1] || ''), 60, startY + (i * lineSpacing));
        });

        // Footer
        doc.setFontSize(9);
        doc.setTextColor(100, 100, 100);
        const footerY = 265;
        doc.text('Gracias por confiar en Palladium Transfers.', 105, footerY, { align: 'center' });
        doc.text('Puede solicitar cambios en su reserva directamente desde su Portal de Cliente.', 105, footerY + 5, { align: 'center' });
        doc.setFont('helvetica', 'bold');
        doc.text('* Cambios de hora solo permitidos hasta 24h antes. Para cambios urgentes (<24h),', 105, footerY + 12, { align: 'center' });
        doc.text('contacte a reservas@palladiumtransfers.com.', 105, footerY + 16, { align: 'center' });
        doc.setFont('helvetica', 'normal');
        doc.text('Este documento sirve como comprobante de su reserva.', 105, footerY + 23, { align: 'center' });
    });

    return doc;
};
