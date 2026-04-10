import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { useToast } from '../components/ui/Toast';

export const useInvoices = () => {
   const [invoices, setInvoices] = useState<any[]>([]);
   const [loading, setLoading] = useState(true);
   const { addToast } = useToast();

   const fetchInvoices = async () => {
      setLoading(true);
      try {
         // Fetch invoices with client info
         const { data, error } = await supabase
            .from('invoices')
            .select('*, clients(name, legal_name, cif, address, postal_code, city, email)')
            .order('created_at', { ascending: false });

         if (error) throw error;
         setInvoices(data || []);
      } catch (err: any) {
         console.error('Error fetching invoices:', err);
         addToast({ title: 'Error', description: 'No se pudieron cargar las facturas.', type: 'error' });
      } finally {
         setLoading(false);
      }
   };

   useEffect(() => {
      fetchInvoices();
   }, []);

   const generateInvoice = async (clientId: string, startDate: string, endDate: string) => {
      try {
         // 1. Fetch un-invoiced bookings for the client within the date range
         // Since date format might be YYYY-MM-DD or full ISO, we check pickup_time safely.
         const { data: bookings, error: bookingsError } = await supabase
            .from('bookings')
            .select('*')
            .eq('client_id', clientId)
            .is('invoice_id', null)
            .neq('status', 'Cancelled')
            .gte('pickup_date', startDate)
            .lte('pickup_date', endDate); // pickup_date is YYYY-MM-DD

         if (bookingsError) throw bookingsError;

         if (!bookings || bookings.length === 0) {
            addToast({ title: 'Aviso', description: 'No se encontraron reservas sin facturar para este período.', type: 'warning' });
            return null;
         }

         // 2. Fetch the client details
         const { data: clientData, error: clientError } = await supabase
            .from('clients')
            .select('*')
            .eq('id', clientId)
            .single();

         if (clientError) throw clientError;

         // 3. Calculate totals using a robust numeric parser
         const parsePrice = (val: any): number => {
            if (!val) return 0;
            if (typeof val === 'number') return val;
            // Handle European format 1.234,56 by removing thousand separator and converting decimal comma
            // Also remove any currency symbols or extra spacing
            const clean = val.toString()
                .replace(/[€$]/g, '')
                .replace(/\s/g, '')
                .replace(/\./g, '') // remove thousand dots
                .replace(',', '.'); // replace decimal comma
            const parsed = parseFloat(clean);
            return isNaN(parsed) ? 0 : parsed;
         };

         const subtotal = bookings.reduce((sum: number, b: any) => sum + parsePrice(b.price), 0);
         const taxRate = 10; // 10% IVA
         const taxAmount = subtotal * (taxRate / 100);
         const totalAmount = subtotal + taxAmount;

         // 4. Determine next invoice number
         // We fetch the latest invoice number for the current year
         const currentYear = new Date().getFullYear().toString();
         const { data: latestInvoices, error: latestError } = await supabase
            .from('invoices')
            .select('invoice_number')
            .like('invoice_number', `F-${currentYear}-%`)
            .order('invoice_number', { ascending: false })
            .limit(1);
         
         let nextNumber = 1;
         if (latestInvoices && latestInvoices.length > 0) {
            // F-2026-0001 -> 0001
            const parts = latestInvoices[0].invoice_number.split('-');
            const lastNum = parts.length >= 3 ? parseInt(parts[2]) : NaN;
            if (!isNaN(lastNum)) nextNumber = lastNum + 1;
         }
         
         const invoiceNumber = `F-${currentYear}-${nextNumber.toString().padStart(4, '0')}`;

         const newInvoice = {
            invoice_number: invoiceNumber,
            client_id: clientId,
            date_issued: new Date().toISOString().split('T')[0],
            subtotal: subtotal.toFixed(2),
            tax_rate: taxRate,
            tax_amount: taxAmount.toFixed(2),
            total_amount: totalAmount.toFixed(2),
            amount: totalAmount.toFixed(2), // Populated for backward compatibility with 'amount' column
            status: 'Draft'
         };

         console.log('Inserting new invoice:', newInvoice);

         const { data: savedInvoice, error: saveError } = await supabase
            .from('invoices')
            .insert(newInvoice)
            .select()
            .single();

         if (saveError) {
            console.error("Database error details:", saveError);
            throw saveError;
         }

         // 6. Update bookings to link them to the invoice
         const bookingIds = bookings.map((b: any) => b.id);
         const { error: updateError } = await supabase
            .from('bookings')
            .update({ invoice_id: savedInvoice.id })
            .in('id', bookingIds);

         if (updateError) throw updateError;

         addToast({ title: 'Éxito', description: `Factura ${invoiceNumber} generada con ${bookings.length} reservas.`, type: 'success' });
         
         // Reload invoices
         await fetchInvoices();
         
         return savedInvoice;
      } catch (err: any) {
         console.error('Error generating invoice:', err);
         addToast({ title: 'Error', description: err.message || 'Error al generar la factura.', type: 'error' });
         return null;
      }
   };

   // Change invoice status (e.g. Paid)
   const updateInvoiceStatus = async (id: string, status: string) => {
      try {
         const { error } = await supabase.from('invoices').update({ status }).eq('id', id);
         if (error) throw error;
         addToast({ title: 'Éxito', description: 'Estado actualizado', type: 'success' });
         fetchInvoices();
      } catch (err: any) {
         addToast({ title: 'Error', description: 'No se pudo actualizar el estado.', type: 'error' });
      }
   };

   // Delete invoice (set bookings invoice_id back to null)
   const deleteInvoice = async (id: string) => {
      try {
         // Free bookings
         await supabase.from('bookings').update({ invoice_id: null }).eq('invoice_id', id);
         // Delete invoice
         await supabase.from('invoices').delete().eq('id', id);
         addToast({ title: 'Éxito', description: 'Factura eliminada. Las reservas han sido liberadas.', type: 'success' });
         fetchInvoices();
      } catch (err: any) {
         addToast({ title: 'Error', description: 'No se pudo eliminar la factura.', type: 'error' });
      }
   };

   return {
      invoices,
      loading,
      generateInvoice,
      updateInvoiceStatus,
      deleteInvoice,
      refresh: fetchInvoices
   };
};
