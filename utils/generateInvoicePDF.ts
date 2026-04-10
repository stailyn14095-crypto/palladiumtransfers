import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase } from '../services/supabase';
import { LOGO_BASE64 } from './assets';

// Helper to fetch company settings
const fetchCompanySettings = async () => {
    const { data } = await supabase.from('system_settings').select('key, value');
    const settings: any = {};
    if (data) {
        data.forEach(item => {
            settings[item.key] = item.value;
        });
    }
    return settings;
};

// Helper to fetch invoice line items (bookings)
const fetchInvoiceItems = async (invoiceId: string) => {
    const { data } = await supabase
        .from('bookings')
        .select('*')
        .eq('invoice_id', invoiceId)
        .order('pickup_time', { ascending: true });
    return data || [];
};

const fetchClient = async (clientId: string) => {
    const { data } = await supabase.from('clients').select('*').eq('id', clientId).single();
    return data;
};

export const generateInvoicePDF = async (invoice: any, options: { download?: boolean; returnBase64?: boolean } = { download: true }) => {
    try {
        // 1. Fetch dependencies
        const settings = await fetchCompanySettings();
        const items = await fetchInvoiceItems(invoice.id);
        const client = await fetchClient(invoice.client_id);

        // 2. Initialize PDF
        const doc = new jsPDF() as any;

        // Colors & Branding
        const primaryColor = '#B3932F'; // Brand Gold
        const darkColor = '#1A1C1E'; // Brand Charcoal
        const textGray = '#64748B';

        // --- NEW HEADER LAYOUT ---
        // Left: Actual Logo Image
        try {
            doc.addImage(LOGO_BASE64, 'PNG', 15, 10, 50, 25);
        } catch (e) {
            console.error("Could not add logo to PDF:", e);
            // Fallback to text if logo fails
            doc.setFontSize(22);
            doc.setTextColor(primaryColor);
            doc.setFont('helvetica', 'bold');
            doc.text('PALLADIUM', 15, 25);
        }
        
        doc.setFontSize(8);
        doc.setTextColor(textGray);
        doc.setFont('helvetica', 'normal');
        doc.text('EXCELLENCE IN MOTION', 15, 38);

        // Right side: FACTURA title & Info
        doc.setFontSize(26);
        doc.setTextColor(darkColor);
        doc.setFont('helvetica', 'bold');
        doc.text('FACTURA', 195, 25, { align: 'right' });

        doc.setFontSize(10);
        doc.setTextColor(textGray);
        doc.setFont('helvetica', 'normal');
        
        let issueDateFormatted = invoice.date_issued;
        if (issueDateFormatted && issueDateFormatted.includes('-')) {
            const dp = issueDateFormatted.split('T')[0].split('-');
            issueDateFormatted = `${dp[2]}/${dp[1]}/${dp[0]}`;
        }
        
        doc.text(`Nº Factura: ${invoice.invoice_number}`, 195, 33, { align: 'right' });
        doc.text(`Fecha de Emisión: ${issueDateFormatted}`, 195, 38, { align: 'right' });
        
        // --- DIVIDER ---
        doc.setDrawColor(200, 200, 200);
        doc.line(15, 45, 195, 45);

        // --- DETAILS ROW ---
        // Left: Company Info
        doc.setFontSize(10);
        doc.setTextColor(darkColor);
        doc.setFont('helvetica', 'bold');
        const companyName = settings.company_legal_name || settings.company_comercial_name || 'Palladium Transfers S.L.';
        doc.text(companyName, 15, 55);

        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(textGray);
        doc.text([
            `CIF/NIF: ${settings.company_nif || 'No especificado'}`,
            `${settings.company_address || ''}`,
            `${settings.company_postal_code || ''} ${settings.company_city || ''}`,
            `${settings.company_province || ''}`
        ].filter(Boolean), 15, 60);

        // Right: Client Info
        doc.setFontSize(10);
        doc.setTextColor(darkColor);
        doc.setFont('helvetica', 'bold');
        doc.text('FACTURAR A:', 120, 55);

        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(textGray);
        const clientName = client?.legal_name || client?.name || 'Cliente Desconocido';
        const clientNif = client?.cif || 'No proporcionado';
        const clientAddress = client?.address || '';
        const clientCity = `${client?.postal_code || ''} ${client?.city || ''}`.trim();

        doc.text([
            clientName,
            `CIF/NIF: ${clientNif}`,
            clientAddress,
            clientCity
        ].filter(Boolean), 120, 60);

        // --- LINE ITEMS TABLE ---
        const tableColumn = [
            "#", 
            "Fecha/Hora", 
            "Pasajero", 
            "Origen", 
            "Destino", 
            "Precio"
        ];
        
        const tableRows: any[] = [];
        items.forEach((item: any, index: number) => {
            let dateStr = '-';
            if (item.pickup_date) {
               const dateParts = item.pickup_date.split('T')[0].split('-');
               if (dateParts.length === 3) {
                   const formattedDate = `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`;
                   const timeStr = item.pickup_time ? item.pickup_time.substring(0, 5) : '';
                   dateStr = timeStr ? `${formattedDate} ${timeStr}` : formattedDate;
               } else {
                   dateStr = item.pickup_date;
               }
            }

            const price = parseFloat(item.price || '0').toFixed(2) + ' €';
            tableRows.push([
                item.reference_number || (index + 1).toString(),
                dateStr,
                item.passenger || 'N/A',
                item.origin || '-',
                item.destination || '-',
                price
            ]);
        });

        autoTable(doc, {
            startY: 90,
            margin: { bottom: 35 },
            head: [tableColumn],
            body: tableRows,
            theme: 'striped',
            headStyles: { fillColor: '#1A1C1E', textColor: '#FFFFFF', fontStyle: 'bold' },
            styles: { fontSize: 8, cellPadding: 4 },
            columnStyles: {
                5: { halign: 'right' } // Align price to right
            }
        });

        let finalY = (doc as any).lastAutoTable.finalY + 15;
        const pageHeight = doc.internal.pageSize.height;
        
        // Prevent totals from overlapping the footer
        if (finalY + 30 > pageHeight - 40) {
            doc.addPage();
            finalY = 25;
        }

        // --- TOTALS ---
        const rightColX = 140;
        const alignRightX = 195;

        doc.setFontSize(10);
        doc.setTextColor(darkColor);
        doc.setFont('helvetica', 'normal');
        
        // Subtotal
        doc.text('Base Imponible:', rightColX, finalY);
        doc.text(`${parseFloat(invoice.subtotal).toFixed(2)} €`, alignRightX, finalY, { align: 'right' });
        
        // IVA
        doc.text(`IVA (${invoice.tax_rate}%):`, rightColX, finalY + 8);
        doc.text(`${parseFloat(invoice.tax_amount).toFixed(2)} €`, alignRightX, finalY + 8, { align: 'right' });
        
        // Total Divider
        doc.setDrawColor(200, 200, 200);
        doc.line(rightColX, finalY + 12, alignRightX, finalY + 12);

        // Total
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('TOTAL:', rightColX, finalY + 20);
        
        // Ensure total is colored with brand gold / dark
        doc.setTextColor(primaryColor);
        doc.text(`${parseFloat(invoice.total_amount).toFixed(2)} €`, alignRightX, finalY + 20, { align: 'right' });

        // --- FOOTER & COMPLIANCE TEXT ON ALL PAGES ---
        const pageCount = (doc.internal as any).getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            
            // Footer Lines (Moved slightly up from bottom)
            const footerY = pageHeight - 25;
            doc.setDrawColor(200, 200, 200);
            doc.line(15, footerY, 195, footerY);
            
            doc.setFontSize(8);
            doc.setTextColor(textGray);
            doc.setFont('helvetica', 'normal');
            
            // Legal boilerplate text
            const footerText = "Factura generada conforme al Reglamento de Facturación RD 1619/2012.";
            const footerInfoText = `Palladium Transfers - Excellence in Motion | www.palladiumtransfers.com`;
            
            doc.text(footerText, 105, footerY + 7, { align: 'center' });
            doc.text(footerInfoText, 105, footerY + 12, { align: 'center' });
            
            // Page Numbering
            doc.setFontSize(7);
            doc.text(`Página ${i} de ${pageCount}`, 195, footerY + 18, { align: 'right' });
        }

        // Generate download
        if (options.download) {
            doc.save(`Factura_${invoice.invoice_number}.pdf`);
        }
        
        let base64pdf = undefined;
        if (options.returnBase64) {
            const dataUri = doc.output('datauristring');
            base64pdf = dataUri.split(',')[1];
        }

        return { success: true, base64: base64pdf };
    } catch (error) {
        console.error("Error generating PDF", error);
        return { success: false };
    }
};
