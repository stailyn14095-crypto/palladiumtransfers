import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import * as XLSX from 'xlsx';
import { useSupabaseData } from '../hooks/useSupabaseData';
import { DataEntryModal } from '../components/DataEntryModal';
import { useToast } from '../components/ui/Toast';

const GenericListView = ({ title, subtitle, columns, data, renderRow, actions, loading }: any) => {
   return (
      <div className="flex-1 flex flex-col h-full bg-brand-black overflow-hidden relative">
         <header className="h-20 border-b border-white/5 bg-brand-charcoal px-8 flex items-center justify-between shrink-0">
            <div>
               <h1 className="text-xl font-bold text-white tracking-tight">{title}</h1>
               <p className="text-[10px] text-brand-platinum/50 uppercase font-bold tracking-widest">{subtitle}</p>
            </div>
            <div className="flex gap-3">
               {actions}
            </div>
         </header>
         <div className="p-8 overflow-y-auto custom-scrollbar">
            <div className="bg-brand-black border border-white/5 rounded-2xl overflow-hidden shadow-2xl">
               {loading ? (
                  <div className="p-20 text-center">
                     <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-gold mx-auto mb-4"></div>
                     <p className="text-brand-platinum/50 uppercase tracking-widest text-[10px] font-bold">Cargando base de datos...</p>
                  </div>
               ) : (
                  <table className="w-full text-left">
                     <thead>
                        <tr className="bg-brand-charcoal text-brand-platinum/50 text-[10px] font-black uppercase tracking-widest border-b border-white/5">
                           {columns.map((c: string, i: number) => <th key={i} className="px-6 py-4">{c}</th>)}
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-800 text-sm">
                        {data && data.length > 0 ? (
                           data.map((item: any, i: number) => renderRow(item, i))
                        ) : (
                           <tr>
                              <td colSpan={columns.length} className="px-6 py-8 text-center text-slate-500 italic">No hay registros encontrados</td>
                           </tr>
                        )}
                     </tbody>
                  </table>
               )}
            </div>
         </div>
      </div>
   );
};

const AddButton = ({ label, onClick }: { label: string, onClick: () => void }) => (
   <button onClick={onClick} className="px-4 py-2 bg-brand-gold hover:bg-brand-gold/80 text-black rounded-lg text-sm font-bold flex items-center gap-2 shadow-lg transition-all active:scale-95">
      <span className="material-icons-round text-sm">add</span> {label}
   </button>
);

const EditButton = ({ onClick }: { onClick: () => void }) => (
   <button onClick={onClick} className="text-blue-400 hover:text-blue-300 mr-3">
      Editar
   </button>
);

const DeleteButton = ({ onClick }: { onClick: () => void }) => (
   <button onClick={onClick} className="text-red-400 hover:text-red-300">
      <span className="material-icons-round text-sm">delete</span>
   </button>
);

// --- CONDUCTORES VIEW ---
export const ConductoresView = () => {
   const { data: drivers, loading, addItem, updateItem, deleteItem } = useSupabaseData('drivers');
   const { data: users } = useSupabaseData('profiles');
   const [isModalOpen, setIsModalOpen] = useState(false);
   const [editingItem, setEditingItem] = useState<any>(null);

   const userOptions = users?.map((u: any) => u.id) || [];
   const userLabels = users?.map((u: any) => `${u.full_name || u.email} (${u.role})`) || [];

   const fields = [
      { name: 'user_id', label: 'Usuario Vinculado (App)', type: 'select', options: ['', ...userOptions], optionLabels: ['Sin vincular', ...userLabels] },
      { name: 'name', label: 'Nombre Completo', type: 'text', required: true },
      { name: 'phone', label: 'Teléfono', type: 'text' },
      { name: 'license', label: 'Licencia', type: 'text', required: true },
      { name: 'exp', label: 'Vencimiento Licencia', type: 'date', required: true },
      { name: 'points', label: 'Puntos', type: 'number', required: true },
      { name: 'status', label: 'Estado', type: 'select', options: ['Active', 'Inactive', 'On Leave'], required: true },
   ] as any;

   const handleSave = async (data: any) => {
      if (editingItem) {
         await updateItem(editingItem.id, data);
      } else {
         await addItem(data);
      }
   };

   return (
      <>
         <GenericListView
            title="Gestión de Conductores"
            subtitle="Fleet Personnel Directory"
            columns={['ID', 'Nombre', 'Contacto', 'Licencia', 'Vencimiento', 'Puntos', 'Estado', 'Acciones']}
            data={drivers}
            loading={loading}
            actions={<AddButton label="Nuevo Conductor" onClick={() => { setEditingItem(null); setIsModalOpen(true); }} />}
            renderRow={(d: any, i: number) => (
               <tr key={d.id || i} className="hover:bg-slate-800/30">
                  <td className="px-6 py-4 font-mono text-blue-400 text-xs text-nowrap">#{d.display_id || (d.id && d.id.slice(0, 4)) || i + 1}</td>
                  <td className="px-6 py-4 font-medium text-white flex items-center gap-3">
                     <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs">{(d.name || '?').charAt(0)}</div>
                     {d.name}
                  </td>
                  <td className="px-6 py-4 text-slate-300 font-mono text-xs">{d.phone || 'S/N'}</td>
                  <td className="px-6 py-4 text-slate-300">{d.license || 'B, VTC'}</td>
                  <td className="px-6 py-4 text-slate-300">{d.exp || 'N/A'}</td>
                  <td className="px-6 py-4 text-slate-300">{d.points || 12}</td>
                  <td className="px-6 py-4">
                     <span className={`px-2 py-0.5 rounded-full text-xs border ${d.status === 'Active' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-slate-700 text-slate-300 border-slate-600'}`}>{d.status}</span>
                  </td>
                  <td className="px-6 py-4 cursor-pointer">
                     <EditButton onClick={() => { setEditingItem(d); setIsModalOpen(true); }} />
                     <DeleteButton onClick={() => { if (confirm('¿Eliminar conductor?')) deleteItem(d.id); }} />
                  </td>
               </tr>
            )}
         />
         <DataEntryModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            onSubmit={handleSave}
            initialData={editingItem}
            title={editingItem ? 'Editar Conductor' : 'Nuevo Conductor'}
            fields={fields}
         />
      </>
   );
};

// --- VEHICULOS VIEW ---
export const VehiculosView = () => {
   const { data: cars, loading, addItem, updateItem, deleteItem } = useSupabaseData('vehicles');
   const [isModalOpen, setIsModalOpen] = useState(false);
   const [editingItem, setEditingItem] = useState<any>(null);

   const fields = [
      { name: 'plate', label: 'Matrícula', type: 'text', required: true },
      { name: 'model', label: 'Modelo', type: 'text', required: true },
      { name: 'category', label: 'Tipo Vehículo', type: 'select', options: ['Standard', 'Luxury', 'Van', 'Minibus', 'Bus'], required: true },
      { name: 'capacity', label: 'Max Pax', type: 'number', required: true },
      { name: 'year', label: 'Año', type: 'number', required: true },
      { name: 'km', label: 'Kilometraje', type: 'number', required: true },
      { name: 'itv', label: 'Próxima ITV', type: 'date', required: true },
      { name: 'image_url', label: 'URL de la Foto', type: 'text' },
      { name: 'status', label: 'Estado', type: 'select', options: ['Operativo', 'Taller', 'Baja'], required: true },
   ] as any;

   const handleSave = async (data: any) => {
      if (editingItem) {
         await updateItem(editingItem.id, data);
      } else {
         await addItem(data);
      }
   };

   return (
      <>
         <GenericListView
            title="Flota de Vehículos"
            subtitle="Control de Kilometraje e ITV"
            columns={['ID', 'Matrícula', 'Modelo / Año', 'Tipo', 'Pax', 'KM Actuales', 'Estado', 'Acciones']}
            data={cars}
            loading={loading}
            actions={<AddButton label="Nuevo Vehículo" onClick={() => { setEditingItem(null); setIsModalOpen(true); }} />}
            renderRow={(c: any, i: number) => (
               <tr key={c.id || i} className="hover:bg-slate-800/30">
                  <td className="px-6 py-4 font-mono text-blue-400 text-xs text-nowrap">#{c.display_id || (c.id && c.id.slice(0, 4)) || i + 1}</td>
                  <td className="px-6 py-4 font-mono text-white font-bold">{c.plate}</td>
                  <td className="px-6 py-4 text-slate-300 flex items-center gap-3">
                     {c.image_url && (
                        <img src={c.image_url} alt={c.model} className="w-10 h-7 object-cover rounded shadow-lg border border-white/10" />
                     )}
                     <div>
                        {c.model} <span className="text-slate-500">({c.year})</span>
                     </div>
                  </td>
                  <td className="px-6 py-4 text-slate-300 text-xs uppercase font-bold">{c.category || 'Standard'}</td>
                  <td className="px-6 py-4 text-slate-300 font-mono center">
                     <span className="bg-slate-700 text-white px-2 py-1 rounded text-xs">{c.capacity || 4} <span className="text-slate-500">pax</span></span>
                  </td>
                  <td className="px-6 py-4 text-white font-mono bg-slate-800/50 rounded-lg">
                     {(c.km || 0).toLocaleString()} km
                  </td>
                  <td className="px-6 py-4">
                     <span className={`px-2 py-0.5 rounded-full text-xs border ${c.status === 'Operativo' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' : 'bg-amber-500/10 text-amber-500 border-amber-500/20'}`}>{c.status}</span>
                  </td>
                  <td className="px-6 py-4">
                     <EditButton onClick={() => { setEditingItem(c); setIsModalOpen(true); }} />
                     <DeleteButton onClick={() => { if (confirm('¿Eliminar vehículo?')) deleteItem(c.id); }} />
                  </td>
               </tr>
            )}
         />
         <DataEntryModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            onSubmit={handleSave}
            initialData={editingItem}
            title={editingItem ? 'Editar Vehículo' : 'Nuevo Vehículo'}
            fields={fields}
         />
      </>
   );
};

export const ClientesView = () => {
   const { data: clients, loading, addItem, updateItem, deleteItem } = useSupabaseData('clients');
   const [isModalOpen, setIsModalOpen] = useState(false);
   const [editingItem, setEditingItem] = useState<any>(null);

   const fields = [
      { name: 'name', label: 'Nombre Cliente', type: 'text', required: true },
      { name: 'company', label: 'Empresa', type: 'text' },
      { name: 'email', label: 'Email', type: 'email' },
      { name: 'phone', label: 'Teléfono', type: 'text' },
      { name: 'status', label: 'Estado', type: 'select', options: ['Active', 'Inactive'], required: true },
   ] as any;

   const handleSave = async (data: any) => {
      if (editingItem) {
         await updateItem(editingItem.id, data);
      } else {
         await addItem(data);
      }
   };

   return (
      <>
         <GenericListView
            title="Cartera de Clientes"
            subtitle="CRM & Partners"
            columns={['ID', 'Nombre', 'Tipo', 'Contacto', 'Reservas (YTD)', 'Estado', 'Acciones']}
            data={clients}
            loading={loading}
            actions={<AddButton label="Nuevo Cliente" onClick={() => { setEditingItem(null); setIsModalOpen(true); }} />}
            renderRow={(c: any, i: number) => (
               <tr key={c.id || i} className="hover:bg-slate-800/30">
                  <td className="px-6 py-4 font-mono text-blue-400 text-xs text-nowrap">#{c.display_id || (c.id && c.id.slice(0, 4)) || i + 1}</td>
                  <td className="px-6 py-4 font-bold text-white">{c.name}</td>
                  <td className="px-6 py-4 text-slate-300">{c.company || 'N/A'}</td>
                  <td className="px-6 py-4 text-slate-400">{c.email || c.phone || 'N/A'}</td>
                  <td className="px-6 py-4 text-slate-300">{c.bookings || 0}</td>
                  <td className="px-6 py-4"><span className="text-emerald-500 text-xs uppercase font-bold">{c.status || 'Active'}</span></td>
                  <td className="px-6 py-4">
                     <EditButton onClick={() => { setEditingItem(c); setIsModalOpen(true); }} />
                     <DeleteButton onClick={() => { if (confirm('¿Eliminar cliente?')) deleteItem(c.id); }} />
                  </td>
               </tr>
            )}
         />
         <DataEntryModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            onSubmit={handleSave}
            initialData={editingItem}
            title={editingItem ? 'Editar Cliente' : 'Nuevo Cliente'}
            fields={fields}
         />
      </>
   );
};

// --- TARIFAS VIEW ---
export const TarifasView = () => {
   const { data: rates, loading, addItem, updateItem, deleteItem } = useSupabaseData('tariffs');
   // const { data: municipalities } = useSupabaseData('municipalities', { limit: 10000 });
   const [municipalities, setMunicipalities] = useState<any[]>([]);

   useEffect(() => {
      const fetchAllMunis = async () => {
         let allData: any[] = [];
         let page = 0;
         const pageSize = 1000;
         let fetchMore = true;

         while (fetchMore) {
            const { data, error } = await supabase
               .from('municipalities')
               .select('*')
               .range(page * pageSize, (page + 1) * pageSize - 1);

            if (error) {
               console.error('Error fetching munis page', page, error);
               break;
            }

            if (data) {
               allData = [...allData, ...data];
               if (data.length < pageSize) {
                  fetchMore = false;
               } else {
                  page++;
               }
            } else {
               fetchMore = false;
            }
         }

         if (allData.length > 0) {
            // Sort alphabetically locally
            allData.sort((a, b) => a.name.localeCompare(b.name));
            setMunicipalities(allData);
         }
      };

      fetchAllMunis();

      // Realtime subscription
      const channel = supabase
         .channel('municipalities-changes')
         .on('postgres_changes', { event: '*', schema: 'public', table: 'municipalities' }, () => {
            fetchAllMunis();
         })
         .subscribe();

      return () => {
         supabase.removeChannel(channel);
      };
   }, []);
   const [isModalOpen, setIsModalOpen] = useState(false);
   const [editingItem, setEditingItem] = useState<any>(null);

   const [importing, setImporting] = useState(false);

   const { addToast } = useToast();

   const handleImportTariffs = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setImporting(true);
      const reader = new FileReader();

      reader.onload = async (evt) => {
         try {
            const bstr = evt.target?.result;
            const wb = XLSX.read(bstr, { type: 'binary' });
            const wsname = wb.SheetNames[0];
            const ws = wb.Sheets[wsname];
            const data = XLSX.utils.sheet_to_json(ws, { header: 1 });

            if (data.length < 2) {
               addToast({ title: 'Error', description: 'El archivo está vacío o no tiene datos.', type: 'error' });
               setImporting(false);
               return;
            }

            // Smart Header Detection (similar to municipalities)
            let headerRowIndex = -1;
            for (let i = 0; i < Math.min(10, data.length); i++) {
               const row = (data[i] as any[]).map(c => String(c).toLowerCase());
               if (row.some(c => c.includes('origen') || c.includes('origin'))) {
                  headerRowIndex = i;
                  break;
               }
            }

            if (headerRowIndex === -1) {
               addToast({ title: 'Error', description: 'No se encontraron las columnas de Origen/Destino.', type: 'error' });
               setImporting(false);
               return;
            }

            const headers = (data[headerRowIndex] as any[]).map(h => String(h).trim().toLowerCase());
            const rows = data.slice(headerRowIndex + 1);

            // Map headers
            const getColIndex = (keywords: string[]) => headers.findIndex(h => keywords.some(k => h.includes(k)));

            const originIdx = getColIndex(['origen', 'origin']);
            const destIdx = getColIndex(['destino', 'dest']);
            const priceIdx = getColIndex(['precio', 'price', 'coste', 'cost']);
            const classIdx = getColIndex(['clase', 'class', 'vehiculo', 'vehicle', 'tipo vehículo']);
            const typeIdx = getColIndex(['tipo', 'type', 'idavuelta']); // 'ida', 'vuelta', 'disposicion'

            let count = 0;
            const newTariffs = [];

            for (const row of rows) {
               const r = row as any[];
               if (!r[originIdx] || !r[destIdx] || !r[priceIdx]) continue;

               const origin = String(r[originIdx]).trim();
               const destination = String(r[destIdx]).trim();
               const price = parseFloat(r[priceIdx]);
               // Map class/vehicle type if possible, default to Standard
               let vehicleClass = 'Standard';
               if (classIdx !== -1) {
                  const v = String(r[classIdx]).toLowerCase();
                  if (v.includes('lujo') || v.includes('luxury') || v.includes('mercedes')) vehicleClass = 'Luxury';
                  else if (v.includes('van') || v.includes('monovolumen')) vehicleClass = 'Van';
                  else if (v.includes('bus') || v.includes('autobus')) vehicleClass = 'Bus';
               }

               // Map tariff type
               let tariffType = 'ida';
               if (typeIdx !== -1) {
                  const t = String(r[typeIdx]).toLowerCase();
                  if (t.includes('vuelta') || t.includes('return')) tariffType = 'vuelta';
                  else if (t.includes('dispo')) tariffType = 'disposicion';
               }

               if (origin && destination && !isNaN(price)) {
                  newTariffs.push({
                     origin,
                     destination,
                     base_price: price,
                     class: vehicleClass,
                     type: tariffType,
                     vat: 10, // Default 10%
                     name: `${origin} - ${destination}`
                  });
                  count++;
               }
            }

            if (newTariffs.length > 0) {
               // Batch insert (chunks of 50)
               const chunkSize = 50;
               for (let i = 0; i < newTariffs.length; i += chunkSize) {
                  const chunk = newTariffs.slice(i, i + chunkSize);
                  const { error } = await supabase.from('tariffs').insert(chunk);
                  if (error) throw error;
               }

               addToast({ title: 'Importación Completada', description: `Se han importado ${count} tarifas.`, type: 'success' });
               // Refresh data
               window.location.reload(); // Simplest way to refresh distinct hooks
            } else {
               addToast({ title: 'Aviso', description: 'No se encontraron tarifas válidas para importar.', type: 'warning' });
            }

         } catch (error: any) {
            console.error('Import error:', error);
            addToast({ title: 'Error de Importación', description: error.message, type: 'error' });
         } finally {
            setImporting(false);
            e.target.value = ''; // Reset file input
         }
      };
      reader.readAsBinaryString(file);
   };

   const provinces = [
      { code: 'all', name: 'Todas' },
      { code: '03', name: 'Alicante' },
      { code: '46', name: 'Valencia' },
      { code: '12', name: 'Castellón' },
      { code: '30', name: 'Murcia' },
      { code: '02', name: 'Albacete' },
      { code: '28', name: 'Madrid' }
   ];

   const [modalData, setModalData] = useState<any>({});

   const placeTypes = [
      { code: 'all', name: 'Todos' },
      { code: 'municipio', name: 'Municipios' },
      { code: 'aeropuerto', name: 'Aeropuertos' },
      { code: 'tren', name: 'Estaciones de Tren' },
      { code: 'puerto', name: 'Puertos' },
      { code: 'hotel', name: 'Hoteles' },
      { code: 'otro', name: 'Otros/Personalizados' }
   ];

   // Derived options based on selected province
   const originProv = modalData.origin_province || '03';
   const originType = modalData.origin_type || 'all';

   const destProv = modalData.destination_province || '03';
   const destType = modalData.destination_type || 'all';

   const filterMunis = (prov: string, type: string) => {
      if (!municipalities) return [];
      return municipalities.filter((m: any) => {
         // Province filter
         const provMatch = prov === 'all' || m.cod_prov === prov;

         // Type filter
         // If m.type is missing/null, assume it's a 'municipio'
         const muniType = m.type || 'municipio';

         let typeMatch = true;
         if (type !== 'all') {
            if (type === 'otro') {
               // 'otro' matches anything not in the standard list
               typeMatch = !['municipio', 'aeropuerto', 'tren', 'puerto', 'hotel'].includes(muniType);
            } else {
               // Exact match
               typeMatch = muniType === type;
            }
         }

         return provMatch && typeMatch;
      });
   };

   const filteredOriginMunis = filterMunis(originProv, originType);
   const filteredDestMunis = filterMunis(destProv, destType);

   // Sort filtered municipalities
   const sortedOrigin = [...filteredOriginMunis].sort((a: any, b: any) => a.name.localeCompare(b.name));
   const sortedDest = [...filteredDestMunis].sort((a: any, b: any) => a.name.localeCompare(b.name));

   const originOptions = sortedOrigin.map((m: any) => m.name);
   const originLabels = sortedOrigin.map((m: any) => `${m.name} ${(m.type && m.type !== 'municipio') ? `(${m.type.toUpperCase()})` : ''}`);

   const destOptions = sortedDest.map((m: any) => m.name);
   const destLabels = sortedDest.map((m: any) => `${m.name} ${(m.type && m.type !== 'municipio') ? `(${m.type.toUpperCase()})` : ''}`);

   const getProvCount = (code: string) => {
      if (code === 'all') return municipalities ? municipalities.length : 0;
      return municipalities ? municipalities.filter((m: any) => m.cod_prov === code).length : 0;
   };

   const fields = [
      {
         name: 'origin_province',
         label: 'Filtrar Provincia Origen',
         type: 'select',
         options: provinces.map(p => p.code),
         optionLabels: provinces.map(p => `${p.name} (${getProvCount(p.code)})`),
         defaultValue: '03',
         section: 'Origen'
      },
      {
         name: 'origin_type',
         label: 'Tipo de Punto',
         type: 'select',
         options: placeTypes.map(p => p.code),
         optionLabels: placeTypes.map(p => p.name),
         defaultValue: 'all',
         section: 'Origen'
      },
      {
         name: 'origin',
         label: 'Origen',
         type: 'searchable-select',
         options: originOptions,
         optionLabels: originLabels,
         required: true,
         section: 'Origen'
      },
      {
         name: 'destination_province',
         label: 'Filtrar Provincia Destino',
         type: 'select',
         options: provinces.map(p => p.code),
         optionLabels: provinces.map(p => `${p.name} (${getProvCount(p.code)})`),
         defaultValue: '03',
         section: 'Destino'
      },
      {
         name: 'destination_type',
         label: 'Tipo de Punto',
         type: 'select',
         options: placeTypes.map(p => p.code),
         optionLabels: placeTypes.map(p => p.name),
         defaultValue: 'all',
         section: 'Destino'
      },
      {
         name: 'destination',
         label: 'Destino',
         type: 'searchable-select',
         options: destOptions,
         optionLabels: destLabels,
         required: true,
         section: 'Destino'
      },
      { name: 'class', label: 'Categoría Vehículo', type: 'select', options: ['Standard', 'Luxury', 'Van', 'Bus'], required: true },
      { name: 'base_price', label: 'Precio Base (€)', type: 'number', required: true },
      { name: 'type', label: 'Tipo', type: 'select', options: ['Fija', 'Por KM', 'Variable'], required: true },
      { name: 'vat', label: 'IVA (%)', type: 'number', placeholder: '10' },
   ] as any;

   const handleSave = async (data: any) => {
      // ... (existing handleSave logic)
      const payload = {
         ...data,
         name: `${data.origin} - ${data.destination}`
      };
      try {
         if (editingItem) {
            await updateItem(editingItem.id, payload);
            addToast({ title: 'Tarifa Actualizada', description: 'La tarifa se ha guardado correctamente.', type: 'success' });
         } else {
            await addItem(payload);
            addToast({ title: 'Tarifa Creada', description: 'La nueva tarifa se ha añadido.', type: 'success' });
         }
         setIsModalOpen(false);
      } catch (err: any) {
         addToast({ title: 'Error al Guardar', description: err.message, type: 'error' });
      }
   };

   return (
      <div className="flex-1 flex flex-col h-full bg-brand-black overflow-hidden relative">
         <header className="h-20 border-b border-white/5 bg-brand-charcoal px-8 flex items-center justify-between shrink-0">
            <div>
               <h1 className="text-xl font-bold text-white tracking-tight">Tarifas y Precios</h1>
               <p className="text-[10px] text-brand-platinum/50 uppercase font-bold tracking-widest">Configuración de Rutas y Precios Fijos/Variables</p>
            </div>
            <div className="flex gap-3">
               <button
                  onClick={() => { setEditingItem(null); setModalData({}); setIsModalOpen(true); }}
                  className="bg-brand-gold hover:bg-brand-gold/80 text-black px-4 py-2 rounded-lg font-bold text-sm shadow-lg transition-all flex items-center gap-2 active:scale-95"
               >
                  <span className="material-icons-round text-lg">add</span>
                  Nueva Tarifa
               </button>
               <div className="relative">
                  <input
                     type="file"
                     id="tariff-upload"
                     className="hidden"
                     accept=".xlsx, .xls"
                     onChange={handleImportTariffs}
                     disabled={importing}
                  />
                  <label htmlFor="tariff-upload" className={`px-4 py-2 ${importing ? 'bg-slate-600' : 'bg-brand-platinum/10 hover:bg-brand-platinum/20 text-brand-platinum'} border border-white/5 rounded-lg text-sm font-bold flex items-center gap-2 transition-all cursor-pointer active:scale-95`}>
                     {importing ? (
                        <>
                           <span className="animate-spin h-4 w-4 border-2 border-white/30 border-t-white rounded-full"></span>
                           Importando...
                        </>
                     ) : (
                        <>
                           <span className="material-icons-round text-sm">upload_file</span> Importar Excel
                        </>
                     )}
                  </label>
               </div>
            </div>
         </header>

         <div className="p-8 overflow-y-auto custom-scrollbar">
            {loading ? (
               <div className="p-20 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-gold mx-auto mb-4"></div>
                  <p className="text-brand-platinum/50 uppercase tracking-widest text-[10px] font-bold">Cargando tarifas...</p>
               </div>
            ) : (
               <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6 pb-20">
                  {rates?.map((r: any) => (
                     <div key={r.id} className="bg-brand-charcoal border border-white/5 rounded-2xl p-6 hover:border-brand-gold/50 transition-all group relative overflow-hidden shadow-xl">
                        {/* ... (card content) ... */}
                        {/* Type Badge */}
                        <div className="absolute top-0 right-0">
                           <div className={`px-4 py-1 text-[10px] font-bold uppercase rounded-bl-xl ${r.type === 'Por KM' ? 'bg-purple-500/10 text-purple-400 border-l border-b border-purple-500/20' :
                              'bg-blue-500/10 text-blue-400 border-l border-b border-blue-500/20'
                              }`}>
                              {r.type || 'Fija'}
                           </div>
                        </div>

                        <div className="flex items-start gap-4 mb-6">
                           <div className="p-3 rounded-xl bg-slate-800 text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                              <span className="material-icons-round text-2xl">
                                 {r.class === 'Van' ? 'group' : r.class === 'Luxury' ? 'star' : 'local_taxi'}
                              </span>
                           </div>
                           <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                 <span className="font-mono text-blue-400 text-[10px] font-bold">#{r.display_id || (r.id && r.id.slice(0, 4))}</span>
                                 <h3 className="font-bold text-white text-lg leading-tight">{r.name}</h3>
                              </div>
                              <p className="text-xs text-slate-500 uppercase tracking-tighter">{r.class || 'Standard'} Class</p>
                           </div>
                        </div>

                        <div className="flex items-end justify-between">
                           <div>
                              {/* ... (price info) ... */}
                              <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Precio Base</p>
                              <div className="flex items-baseline gap-1">
                                 <span className="text-3xl font-bold text-white tracking-tighter">{r.base_price || r.price || '0'}</span>
                                 <span className="text-lg font-medium text-slate-400">€</span>
                                 {r.type === 'Por KM' && <span className="text-xs text-slate-500 ml-1">/ KM</span>}
                              </div>
                           </div>
                           <div className="flex gap-2">
                              {/* Edit Button */}
                              <button
                                 onClick={() => { setEditingItem(r); setIsModalOpen(true); }}
                                 className="w-8 h-8 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 flex items-center justify-center transition-colors"
                              >
                                 <span className="material-icons-round text-sm">edit</span>
                              </button>
                              {/* Delete Button */}
                              <button
                                 onClick={async () => {
                                    if (confirm('¿Eliminar tarifa?')) {
                                       try {
                                          console.log('Deleting tariff:', r.id);
                                          await deleteItem(r.id);
                                          addToast({ title: 'Tarifa Eliminada', description: 'La tarifa se ha eliminado correctamente.', type: 'success' });
                                       } catch (err: any) {
                                          console.error('Delete error:', err);
                                          addToast({ title: 'Error al Eliminar', description: err.message || 'No se pudo eliminar la tarifa.', type: 'error' });
                                       }
                                    }
                                 }}
                                 className="w-8 h-8 rounded-lg bg-slate-800 text-slate-400 hover:text-red-400 hover:bg-red-400/10 flex items-center justify-center transition-colors"
                              >
                                 <span className="material-icons-round text-sm">delete</span>
                              </button>
                           </div>
                        </div>

                        {/* Decoration */}
                        <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl group-hover:bg-blue-500/10 transition-all"></div>
                     </div>
                  ))}

                  {/* Empty State / Add Card */}
                  <div
                     onClick={() => { setEditingItem(null); setIsModalOpen(true); }}
                     className="bg-brand-charcoal/50 border-2 border-dashed border-white/10 rounded-2xl p-6 flex flex-col items-center justify-center text-brand-platinum/30 hover:border-brand-gold/50 hover:text-brand-gold cursor-pointer transition-all min-h-[160px]"
                  >
                     <span className="material-icons-round text-3xl mb-2">add_circle_outline</span>
                     <span className="font-bold">Nueva Tarifa</span>
                  </div>
               </div>
            )}
         </div>

         <DataEntryModal
            isOpen={isModalOpen}
            onClose={() => { setIsModalOpen(false); setEditingItem(null); setModalData({}); }}
            onSubmit={handleSave}
            initialData={editingItem}
            title={editingItem ? 'Editar Tarifa' : 'Nueva Tarifa'}
            fields={fields}
            onFormDataChange={setModalData}
         />
      </div>
   );
};

export const UsuariosView = () => {
   const { data: users, loading, updateItem } = useSupabaseData('profiles');
   const [isModalOpen, setIsModalOpen] = useState(false);
   const [editingItem, setEditingItem] = useState<any>(null);

   const fields = [
      { name: 'full_name', label: 'Nombre Completo', type: 'text', required: true },
      { name: 'role', label: 'Rol del Sistema', type: 'select', options: ['admin', 'operator', 'accountant', 'driver', 'client'], required: true },
   ] as any;

   const handleSave = async (data: any) => {
      if (editingItem) {
         await updateItem(editingItem.id, {
            role: data.role,
            full_name: data.full_name
         });
      }
      setIsModalOpen(false);
   };

   return (
      <>
         <GenericListView
            title="Usuarios del Sistema"
            subtitle="Control de Acceso y Roles"
            columns={['Usuario', 'Rol', 'Email', 'Último Acceso', 'Acciones']}
            data={users}
            loading={loading}
            actions={<AddButton label="Invitar Usuario" onClick={() => alert('Para habilitar invitaciones, contacte con soporte técnico para configurar las políticas RLS y triggers de perfiles.')} />}
            renderRow={(u: any, i: number) => (
               <tr key={u.id || i} className="hover:bg-slate-800/30">
                  <td className="px-6 py-4 font-bold text-white">{u.full_name || u.email || 'Usuario Desconocido'}</td>
                  <td className="px-6 py-4 text-blue-400">
                     <span className="bg-blue-500/10 inline-block rounded-md px-2 py-0.5 mt-3 text-xs border border-blue-500/20 uppercase tracking-widest font-black">
                        {u.role || 'client'}
                     </span>
                  </td>
                  <td className="px-6 py-4 text-slate-400">{u.email}</td>
                  <td className="px-6 py-4 text-slate-400">{u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleDateString() : 'Never'}</td>
                  <td className="px-6 py-4">
                     <EditButton onClick={() => { setEditingItem(u); setIsModalOpen(true); }} />
                  </td>
               </tr>
            )}
         />
         <DataEntryModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            onSubmit={handleSave}
            initialData={editingItem}
            title={'Editar Rol de Usuario'}
            fields={fields}
         />
      </>
   );
};

export const FacturasView = () => {
   const { data: invoices, loading } = useSupabaseData('invoices');

   return (
      <GenericListView
         title="Facturación"
         subtitle="Facturas y Cobros"
         columns={['Nº Factura', 'Cliente', 'Fecha Emisión', 'Importe', 'Estado', 'Descargar']}
         data={invoices}
         loading={loading}
         actions={<button className="px-4 py-2 border border-slate-700 text-slate-300 rounded-lg text-sm hover:bg-slate-800">Generar Remesa</button>}
         renderRow={(f: any, i: number) => (
            <tr key={f.id || i} className="hover:bg-slate-800/30">
               <td className="px-6 py-4 font-mono text-blue-400">{f.id ? `F-${f.id.split('-')[0]}` : i + 1}</td>
               <td className="px-6 py-4 text-white">{f.client_id || 'Cliente'}</td>
               <td className="px-6 py-4 text-slate-400">{f.date_issued}</td>
               <td className="px-6 py-4 font-bold text-white text-right">{f.amount}€</td>
               <td className="px-6 py-4 text-center">
                  <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${f.status === 'Paid' ? 'text-emerald-500 bg-emerald-500/10' :
                     f.status === 'Pending' ? 'text-amber-500 bg-amber-500/10' :
                        'text-slate-500 bg-slate-700/50'
                     }`}>{f.status}</span>
               </td>
               <td className="px-6 py-4 text-center text-slate-400 hover:text-white cursor-pointer"><span className="material-icons-round text-sm">download</span></td>
            </tr>
         )}
      />
   );
};

export const ExtrasView = () => {
   const { data: extras, loading, addItem, updateItem, deleteItem } = useSupabaseData('service_extras');
   const [isModalOpen, setIsModalOpen] = useState(false);
   const [editingItem, setEditingItem] = useState<any>(null);

   const fields = [
      { name: 'name', label: 'Nombre Extra', type: 'text', required: true },
      { name: 'price', label: 'Precio (€)', type: 'number', required: true },
      { name: 'icon', label: 'Icono (Material Icon)', type: 'text', placeholder: 'ej: luggage, child_care' },
   ] as any;

   const handleSave = async (data: any) => {
      if (editingItem) {
         await updateItem(editingItem.id, data);
      } else {
         await addItem(data);
      }
      setIsModalOpen(false);
   };

   return (
      <>
         <GenericListView
            title="Gestión de Extras"
            subtitle="Configuración de servicios adicionales para reservas"
            columns={['ID', 'Servicio', 'Precio', 'Icono', 'Acciones']}
            data={extras}
            loading={loading}
            actions={<AddButton label="Nuevo Extra" onClick={() => { setEditingItem(null); setIsModalOpen(true); }} />}
            renderRow={(e: any, i: number) => (
               <tr key={e.id || i} className="hover:bg-slate-800/30">
                  <td className="px-6 py-4 font-mono text-blue-400 text-xs text-nowrap">#{e.display_id || (e.id && e.id.slice(0, 4)) || i + 1}</td>
                  <td className="px-6 py-4 font-bold text-white">{e.name}</td>
                  <td className="px-6 py-4 text-emerald-400 font-mono font-bold">{e.price}€</td>
                  <td className="px-6 py-4 text-slate-400 flex items-center gap-2">
                     <span className="material-icons-round text-sm">{e.icon || 'star'}</span>
                     <span className="text-xs">({e.icon})</span>
                  </td>
                  <td className="px-6 py-4">
                     <EditButton onClick={() => { setEditingItem(e); setIsModalOpen(true); }} />
                     <DeleteButton onClick={() => { if (confirm('¿Eliminar extra?')) deleteItem(e.id); }} />
                  </td>
               </tr>
            )}
         />
         <DataEntryModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            onSubmit={handleSave}
            initialData={editingItem}
            title={editingItem ? 'Editar Extra' : 'Nuevo Extra'}
            fields={fields}
         />
      </>
   );
};

// --- MANTENIMIENTO / TALLER VIEW ---
export const TallerView = () => {
   const { data: maintenance, loading, addItem, updateItem, deleteItem } = useSupabaseData('vehicle_maintenance');
   const { data: vehicles } = useSupabaseData('vehicles');
   const [isModalOpen, setIsModalOpen] = useState(false);
   const [editingItem, setEditingItem] = useState<any>(null);

   const fields = [
      {
         name: 'vehicle_id',
         label: 'Vehículo',
         type: 'select',
         options: vehicles?.map((v: any) => v.id) || [],
         optionLabels: vehicles?.map((v: any) => `${v.plate} - ${v.model}`) || [],
         required: true
      },
      { name: 'entry_time', label: 'Fecha/Hora Entrada', type: 'datetime-local', required: true },
      { name: 'exit_time', label: 'Fecha/Hora Salida (Opcional)', type: 'datetime-local' },
      { name: 'notes', label: 'Descripción / Trabajo Realizado', type: 'textarea' },
   ] as any;

   const handleSave = async (data: any) => {
      if (editingItem) {
         await updateItem(editingItem.id, data);
      } else {
         await addItem(data);
      }
      setIsModalOpen(false);
   };

   return (
      <>
         <GenericListView
            title="Mantenimiento en Taller"
            subtitle="Registro de entradas/salidas y reparaciones"
            columns={['Vehículo', 'Entrada', 'Salida (Est.)', 'Días', 'Estado', 'Acciones']}
            data={maintenance}
            loading={loading}
            actions={<AddButton label="Nueva Entrada a Taller" onClick={() => { setEditingItem(null); setIsModalOpen(true); }} />}
            renderRow={(m: any, i: number) => {
               const v = vehicles?.find((v: any) => v.id === m.vehicle_id);
               const entry = new Date(m.entry_time);
               const exit = m.exit_time ? new Date(m.exit_time) : null;

               return (
                  <tr key={m.id || i} className="hover:bg-slate-800/30">
                     <td className="px-6 py-4">
                        <div className="font-bold text-white">{v?.plate || '???'}</div>
                        <div className="text-[10px] text-slate-500 uppercase">{v?.model || 'Desconocido'}</div>
                     </td>
                     <td className="px-6 py-4 text-slate-300 text-xs">
                        {entry.toLocaleString()}
                     </td>
                     <td className="px-6 py-4 text-slate-300 text-xs">
                        {exit ? exit.toLocaleString() : 'En taller...'}
                     </td>
                     <td className="px-6 py-4 text-slate-400 font-mono text-xs">
                        {exit ? Math.ceil((exit.getTime() - entry.getTime()) / (1000 * 60 * 60 * 24)) : '--'}
                     </td>
                     <td className="px-6 py-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${!exit ? 'bg-red-500/10 text-red-500 border-red-500/20' : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'}`}>
                           {!exit ? 'En Taller' : 'Finalizado'}
                        </span>
                     </td>
                     <td className="px-6 py-4">
                        <EditButton onClick={() => { setEditingItem(m); setIsModalOpen(true); }} />
                        <DeleteButton onClick={() => { if (confirm('¿Eliminar registro?')) deleteItem(m.id); }} />
                     </td>
                  </tr>
               );
            }}
         />
         <DataEntryModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            onSubmit={handleSave}
            initialData={editingItem}
            title={editingItem ? 'Editar Registro' : 'Nueva Entrada a Taller'}
            fields={fields}
         />
      </>
   );
};
