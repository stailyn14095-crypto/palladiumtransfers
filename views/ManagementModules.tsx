import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import * as XLSX from 'xlsx';
import { useSupabaseData } from '../hooks/useSupabaseData';
import { DataEntryModal } from '../components/DataEntryModal';
import { useToast } from '../components/ui/Toast';

const GenericListView = ({ title, subtitle, columns, data, renderRow, actions, loading }: any) => {
   return (
      <div className="flex-1 flex flex-col h-full bg-brand-black overflow-hidden relative">
         <header className="min-h-[5rem] border-b border-white/5 bg-brand-charcoal px-4 md:px-8 py-4 md:py-0 flex flex-col md:flex-row items-start md:items-center justify-between shrink-0 gap-4 md:gap-0">
            <div>
               <h1 className="text-xl font-bold text-white tracking-tight">{title}</h1>
               <p className="text-[10px] text-brand-platinum/50 uppercase font-bold tracking-widest">{subtitle}</p>
            </div>
            <div className="flex flex-wrap gap-3 w-full md:w-auto">
               {actions}
            </div>
         </header>
         <div className="p-4 md:p-8 overflow-y-auto custom-scrollbar">
            <div className="bg-brand-black border border-white/5 rounded-2xl overflow-hidden shadow-2xl relative">
               {loading ? (
                  <div className="p-20 text-center">
                     <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-gold mx-auto mb-4"></div>
                     <p className="text-brand-platinum/50 uppercase tracking-widest text-[10px] font-bold">Cargando base de datos...</p>
                  </div>
               ) : (
                  <div className="overflow-x-auto custom-scrollbar w-full">
                     <div className="min-w-[800px]">
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
                     </div>
                  </div>
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

   const { addToast } = useToast();

   const handleSave = async (data: any) => {
      try {
         if (editingItem) {
            await updateItem(editingItem.id, data);
            addToast({ title: 'Conductor Actualizado', description: 'Los datos se han guardado correctamente.', type: 'success' });
         } else {
            await addItem(data);
            addToast({ title: 'Conductor Añadido', description: 'El conductor se ha registrado correctamente.', type: 'success' });
         }
         setIsModalOpen(false);
      } catch (err: any) {
         addToast({ title: 'Error al Guardar', description: err.message || 'No se pudo guardar el conductor.', type: 'error' });
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
                     <DeleteButton onClick={async () => {
                        if (confirm('¿Eliminar conductor?')) {
                           try {
                              await deleteItem(d.id);
                              addToast({ title: 'Conductor Eliminado', description: 'El conductor se ha eliminado correctamente.', type: 'success' });
                           } catch (err: any) {
                              addToast({ title: 'Error al Eliminar', description: 'No se puede eliminar porque tiene historial asociado. Prueba a cambiar su estado a "Inactive".', type: 'error' });
                           }
                        }
                     }} />
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

// --- VEHICLE EXPENSES MODAL ---
const VehicleExpensesModal = ({ isOpen, onClose, vehicle }: { isOpen: boolean, onClose: () => void, vehicle: any }) => {
   const { data: expenses, addItem, deleteItem, loading } = useSupabaseData('vehicle_expenses');
   const [amount, setAmount] = useState('');
   const [type, setType] = useState('Combustible');
   const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
   const [description, setDescription] = useState('');

   if (!isOpen || !vehicle) return null;

   const vehicleExpenses = (expenses || []).filter((e: any) => e.vehicle_id === vehicle.id).sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
   const totalExpenses = vehicleExpenses.reduce((acc: number, curr: any) => acc + Number(curr.amount), 0);

   const handleAdd = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!amount) return;
      await addItem({
         vehicle_id: vehicle.id,
         expense_type: type,
         amount: parseFloat(amount),
         date,
         description
      });
      setAmount('');
      setDescription('');
   };

   return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
         <div className="bg-[#1a2533] border border-white/10 rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.5)] w-full max-w-4xl overflow-hidden animate-in fade-in zoom-in duration-300 flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-8 border-b border-white/5 bg-[#141e2b]">
               <div>
                  <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
                     <span className="material-icons-round text-brand-gold">payments</span>
                     Gastos del Vehículo
                  </h2>
                  <p className="text-brand-platinum/50 text-sm mt-1 uppercase tracking-widest font-bold">
                     <span className="text-white">{vehicle.model}</span> <span className="text-brand-gold ml-2">{vehicle.plate}</span>
                  </p>
               </div>
               <button onClick={onClose} className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-all">
                  <span className="material-icons-round">close</span>
               </button>
            </div>

            <div className="p-8 flex-1 overflow-hidden flex flex-col md:flex-row gap-8">
               {/* Fixed Form Section */}
               <div className="w-full md:w-1/3 space-y-6">
                  <div className="bg-brand-black/50 border border-white/5 rounded-2xl p-6">
                     <h3 className="text-xs font-black text-brand-gold uppercase tracking-widest mb-6 border-b border-white/5 pb-4">Añadir Gasto</h3>
                     <form onSubmit={handleAdd} className="space-y-4">
                        <div>
                           <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Tipo de Gasto</label>
                           <select value={type} onChange={(e) => setType(e.target.value)} className="w-full bg-[#101822] border border-white/10 rounded-2xl px-4 py-3 text-white text-sm font-bold focus:outline-none focus:ring-2 focus:ring-brand-gold appearance-none">
                              <option value="Combustible">Combustible</option>
                              <option value="Taller / Mantenimiento">Taller / Mantenimiento</option>
                              <option value="Seguro">Seguro</option>
                              <option value="Peaje">Peaje</option>
                              <option value="ITV">ITV</option>
                              <option value="Otro">Otro</option>
                           </select>
                        </div>
                        <div>
                           <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Importe (€)</label>
                           <input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required className="w-full bg-[#101822] border border-white/10 rounded-2xl px-4 py-3 text-white text-sm font-bold focus:outline-none focus:ring-2 focus:ring-brand-gold placeholder-white/20" placeholder="0.00" />
                        </div>
                        <div>
                           <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Fecha</label>
                           <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required className="w-full bg-[#101822] border border-white/10 rounded-2xl px-4 py-3 text-white text-sm font-bold focus:outline-none focus:ring-2 focus:ring-brand-gold" />
                        </div>
                        <div>
                           <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Descripción (Opcional)</label>
                           <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="w-full bg-[#101822] border border-white/10 rounded-2xl px-4 py-3 text-white text-sm font-bold focus:outline-none focus:ring-2 focus:ring-brand-gold resize-none" rows={3} placeholder="Detalles del ticket o factura..."></textarea>
                        </div>
                        <button type="submit" disabled={!amount} className="w-full py-4 bg-brand-gold text-brand-black rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-brand-gold/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50">
                           Añadir Gasto
                        </button>
                     </form>
                  </div>
               </div>

               {/* Scrollable List Section */}
               <div className="w-full md:w-2/3 flex flex-col bg-brand-black/30 border border-white/5 rounded-2xl overflow-hidden">
                  <div className="bg-[#141e2b] p-6 border-b border-white/5 flex justify-between items-center z-10">
                     <h3 className="text-xs font-black text-white uppercase tracking-widest">Historial de Gastos</h3>
                     <div className="bg-brand-black/50 border border-white/10 rounded-xl px-4 py-2">
                        <span className="text-[10px] text-brand-platinum/50 uppercase tracking-widest font-bold mr-3">Total</span>
                        <span className="text-xl font-black text-white">{totalExpenses.toFixed(2)}</span>
                        <span className="text-brand-gold text-xs font-bold ml-1">€</span>
                     </div>
                  </div>

                  <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-3">
                     {loading ? (
                        <div className="text-center py-10 text-brand-platinum/30 animate-pulse">Cargando...</div>
                     ) : vehicleExpenses.length === 0 ? (
                        <div className="text-center py-20 text-brand-platinum/30 italic text-sm">No hay gastos registrados para este vehículo.</div>
                     ) : (
                        vehicleExpenses.map((exp: any) => (
                           <div key={exp.id} className="bg-brand-charcoal border border-white/5 hover:border-white/10 rounded-2xl p-5 flex items-center justify-between group transition-all">
                              <div className="flex items-center gap-5">
                                 <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${exp.expense_type === 'Combustible' ? 'bg-orange-500/10 text-orange-500 border border-orange-500/20' :
                                    exp.expense_type === 'Taller / Mantenimiento' ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20' :
                                       exp.expense_type === 'Seguro' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' :
                                          exp.expense_type === 'Peaje' ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20' :
                                             'bg-brand-platinum/10 text-brand-platinum border border-brand-platinum/20'
                                    }`}>
                                    <span className="material-icons-round">
                                       {exp.expense_type === 'Combustible' ? 'local_gas_station' :
                                          exp.expense_type === 'Taller / Mantenimiento' ? 'build' :
                                             exp.expense_type === 'Seguro' ? 'gavel' :
                                                exp.expense_type === 'Peaje' ? 'toll' : 'receipt'}
                                    </span>
                                 </div>
                                 <div>
                                    <p className="text-sm font-bold text-white tracking-tight">{exp.expense_type}</p>
                                    <div className="flex items-center gap-3 mt-1">
                                       <p className="text-[10px] text-brand-platinum/50 font-bold uppercase tracking-widest flex items-center gap-1">
                                          <span className="material-icons-round text-[10px]">calendar_today</span>
                                          {new Date(exp.date).toLocaleDateString()}
                                       </p>
                                       {exp.description && (
                                          <p className="text-[10px] text-slate-400 truncate max-w-[150px] shadow-sm">• {exp.description}</p>
                                       )}
                                    </div>
                                 </div>
                              </div>
                              <div className="flex items-center gap-6">
                                 <div className="text-right">
                                    <p className="text-lg font-black text-white">{Number(exp.amount).toFixed(2)} <span className="text-brand-gold text-xs">€</span></p>
                                 </div>
                                 <button onClick={async () => {
                                    if (confirm('¿Eliminar este gasto?')) {
                                       await deleteItem(exp.id);
                                    }
                                 }} className="w-8 h-8 rounded-lg hover:bg-rose-500/20 text-rose-500/50 hover:text-rose-500 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                                    <span className="material-icons-round text-sm">delete</span>
                                 </button>
                              </div>
                           </div>
                        ))
                     )}
                  </div>
               </div>
            </div>
         </div>
      </div>
   );
};

// --- VEHICULOS VIEW ---
export const VehiculosView = () => {
   const { data: cars, loading, addItem, updateItem, deleteItem } = useSupabaseData('vehicles');
   const [isModalOpen, setIsModalOpen] = useState(false);
   const [editingItem, setEditingItem] = useState<any>(null);

   const fields = [
      { name: 'plate', label: 'Matrícula', type: 'text', required: true, section: 'Datos Básicos' },
      { name: 'model', label: 'Modelo', type: 'text', required: true, section: 'Datos Básicos' },
      { name: 'category', label: 'Tipo Vehículo', type: 'select', options: ['Standard', 'Premium', 'Minivan', 'Minibus'], required: true, section: 'Especificaciones' },
      { name: 'capacity', label: 'Max Pax', type: 'number', required: true, section: 'Especificaciones' },
      { name: 'year', label: 'Año', type: 'number', required: true, section: 'Especificaciones' },
      { name: 'km', label: 'Kilometraje Actual', type: 'number', required: true, section: 'Mantenimiento' },
      { name: 'last_maintenance_km', label: 'Km Último Mantenimiento', type: 'number', section: 'Mantenimiento' },
      { name: 'maintenance_interval', label: 'Intervalo de Mantenimiento (Ej: 15.000)', type: 'number', defaultValue: 15000, section: 'Mantenimiento' },
      { name: 'itv', label: 'Próxima ITV', type: 'date', section: 'Documentación' },
      { name: 'insurance_expiry', label: 'Renovación Seguro', type: 'date', section: 'Documentación' },
      { name: 'image_url', label: 'URL de la foto', type: 'text', section: 'Datos Básicos' },
      { name: 'status', label: 'Estado', type: 'select', options: ['Operativo', 'Taller', 'Baja'], required: true, section: 'Datos Básicos' },
   ] as any;

   const [expensesModalOpen, setExpensesModalOpen] = useState(false);
   const [selectedVehicleForExpenses, setSelectedVehicleForExpenses] = useState<any>(null);

   const { addToast } = useToast();

   const handleSave = async (data: any) => {
      try {
         if (editingItem) {
            await updateItem(editingItem.id, data);
            addToast({ title: 'Vehículo Actualizado', description: 'Los datos se han guardado correctamente.', type: 'success' });
         } else {
            await addItem(data);
            addToast({ title: 'Vehículo Añadido', description: 'El vehículo se ha registrado correctamente.', type: 'success' });
         }
         setIsModalOpen(false);
      } catch (err: any) {
         addToast({ title: 'Error al Guardar', description: err.message || 'No se pudo guardar el vehículo.', type: 'error' });
      }
   };

   return (
      <>
         <GenericListView
            title="Flota de Vehículos"
            subtitle="CONTROL DE KILOMETRAJE E ITV"
            columns={['ID', 'Matrícula', 'Modelo / Año', 'Tipo', 'Pax', 'KM Actuales', 'Mantenimiento / Seguro', 'Estado', 'Acciones']}
            data={cars}
            loading={loading}
            onAdd={() => { setEditingItem(null); setIsModalOpen(true); }}
            renderRow={(c: any, displayId: string) => {
               const interval = c.maintenance_interval || 15000;
               const nextMaintenance = (c.last_maintenance_km || 0) + interval;
               const kmToMaintenance = nextMaintenance - (c.km || 0);
               const needsMaintenance = kmToMaintenance <= 1000;

               const expiry = c.insurance_expiry ? new Date(c.insurance_expiry) : null;
               const daysToInsurance = expiry ? Math.ceil((expiry.getTime() - new Date().getTime()) / (1000 * 3600 * 24)) : null;
               const needsInsurance = daysToInsurance !== null && daysToInsurance <= 30;

               return (
                  <tr key={c.id} className="border-b border-white/5 hover:bg-white/5 transition-colors group">
                     <td className="px-6 py-4 text-brand-gold font-bold text-xs uppercase tracking-widest">#{displayId}</td>
                     <td className="px-6 py-4"><span className="font-bold text-white bg-white/5 px-3 py-1 rounded-lg border border-white/10">{c.plate}</span></td>
                     <td className="px-6 py-4">
                        <span className="font-bold text-slate-200 uppercase text-xs">{c.model}</span>
                        <span className="text-brand-platinum/50 text-[10px] ml-2 tracking-widest">({c.year})</span>
                     </td>
                     <td className="px-6 py-4 font-bold text-xs uppercase tracking-widest text-slate-400">{c.category}</td>
                     <td className="px-6 py-4"><span className="bg-blue-600/20 text-blue-400 px-2 py-1 rounded-md text-xs font-bold">{c.capacity} pax</span></td>
                     <td className="px-6 py-4">
                        <div className="bg-brand-black/50 border border-white/5 rounded-xl px-4 py-2 inline-block">
                           <span className="font-black text-white">{c.km?.toLocaleString() || 0}</span>
                           <span className="text-brand-gold text-xs font-bold ml-1">km</span>
                        </div>
                     </td>
                     <td className="px-6 py-4 space-y-2">
                        {needsMaintenance && (
                           <div className="flex items-center gap-2 text-rose-500 bg-rose-500/10 px-2 py-1 rounded border border-rose-500/20 text-[10px] font-bold uppercase w-max animate-pulse">
                              <span className="material-icons-round text-[12px]">build</span>
                              Taller: Faltan {kmToMaintenance} km
                           </div>
                        )}
                        {!needsMaintenance && (c.last_maintenance_km > 0) && (
                           <div className="flex items-center gap-2 text-brand-platinum/50 text-[10px] uppercase w-max">
                              <span className="material-icons-round text-[12px]">check_circle</span>
                              Próx rev: {nextMaintenance.toLocaleString()} km
                           </div>
                        )}

                        {needsInsurance && (
                           <div className="flex items-center gap-2 text-amber-500 bg-amber-500/10 px-2 py-1 rounded border border-amber-500/20 text-[10px] font-bold uppercase w-max animate-pulse">
                              <span className="material-icons-round text-[12px]">gavel</span>
                              Renovar Seguro ({daysToInsurance} días)
                           </div>
                        )}
                        {expiry && !needsInsurance && (
                           <div className="flex items-center gap-2 text-emerald-500/70 text-[10px] uppercase w-max">
                              <span className="material-icons-round text-[12px]">gavel</span>
                              Seguro: {expiry.toLocaleDateString()}
                           </div>
                        )}
                     </td>
                     <td className="px-6 py-4">
                        <span className={`px-4 py-1.5 rounded-full text-xs font-bold border ${c.status === 'Operativo' ? 'bg-blue-600/10 text-blue-400 border-blue-500/20' :
                           c.status === 'Taller' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                              'bg-amber-600/10 text-amber-500 border-amber-500/20'
                           }`}>
                           {c.status}
                        </span>
                     </td>
                     <td className="px-6 py-4 flex items-center gap-3">
                        <button onClick={() => { setSelectedVehicleForExpenses(c); setExpensesModalOpen(true); }} className="w-8 h-8 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 flex items-center justify-center transition-colors group relative" title="Gestionar Gastos">
                           <span className="material-icons-round text-sm">payments</span>
                        </button>
                        <EditButton onClick={() => { setEditingItem(c); setIsModalOpen(true); }} />
                        <DeleteButton onClick={async () => {
                           if (confirm('¿Eliminar vehículo?')) {
                              try {
                                 await deleteItem(c.id);
                                 addToast({ title: 'Vehículo Eliminado', description: 'El vehículo se ha eliminado correctamente.', type: 'success' });
                              } catch (err: any) {
                                 addToast({ title: 'Error al Eliminar', description: 'No se puede eliminar porque tiene historial asociado. Prueba a cambiar su estado a "Baja".', type: 'error' });
                              }
                           }
                        }} />
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
            title={editingItem ? 'Editar Vehículo' : 'Nuevo Vehículo'}
            fields={fields}
         />

         {/* Gastos Modal */}
         <VehicleExpensesModal
            isOpen={expensesModalOpen}
            onClose={() => { setExpensesModalOpen(false); setSelectedVehicleForExpenses(null); }}
            vehicle={selectedVehicleForExpenses}
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

   const { addToast } = useToast();

   const handleSave = async (data: any) => {
      try {
         if (editingItem) {
            await updateItem(editingItem.id, data);
            addToast({ title: 'Cliente Actualizado', description: 'Los datos se han guardado correctamente.', type: 'success' });
         } else {
            await addItem(data);
            addToast({ title: 'Cliente Añadido', description: 'El cliente se ha registrado correctamente.', type: 'success' });
         }
         setIsModalOpen(false);
      } catch (err: any) {
         addToast({ title: 'Error al Guardar', description: err.message || 'No se pudo guardar el cliente.', type: 'error' });
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
                     <DeleteButton onClick={async () => {
                        if (confirm('¿Eliminar cliente?')) {
                           try {
                              await deleteItem(c.id);
                              addToast({ title: 'Cliente Eliminado', description: 'El cliente se ha eliminado correctamente.', type: 'success' });
                           } catch (err: any) {
                              addToast({ title: 'Error al Eliminar', description: 'No se puede eliminar porque tiene historial (reservas) asociado. Prueba a cambiar su estado a "Inactive".', type: 'error' });
                           }
                        }
                     }} />
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
         <header className="min-h-[5rem] border-b border-white/5 bg-brand-charcoal px-4 md:px-8 py-4 md:py-0 flex flex-col md:flex-row items-start md:items-center justify-between shrink-0 gap-4 md:gap-0">
            <div>
               <h1 className="text-xl font-bold text-white tracking-tight">Tarifas y Precios</h1>
               <p className="text-[10px] text-brand-platinum/50 uppercase font-bold tracking-widest">Configuración de Rutas y Precios Fijos/Variables</p>
            </div>
            <div className="flex flex-wrap gap-3 w-full md:w-auto">
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
