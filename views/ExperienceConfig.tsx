import React, { useState, useEffect } from 'react';
import { useToast } from '../components/ui/Toast';
import { supabase } from '../services/supabase';

export const ExperienceConfig: React.FC = () => {
   const { addToast } = useToast();
   const [loading, setLoading] = useState(true);
   const [saving, setSaving] = useState(false);
   const [formData, setFormData] = useState<any>({
      // Fiscal defaults
      company_comercial_name: 'Palladium Transfers',
      company_legal_name: 'Palladium Logistics S.L.',
      company_nif: 'B-12345678',
      company_address: 'Av. de Elche, 12, 03008 Alicante',
      company_postal_code: '03008',
      company_city: 'Alicante',
      company_province: 'Alicante',
      // VTC defaults
      vtc_min_time: 24,
      vtc_digital_roadmap: true,
      vtc_traveler_registry: true,
      vtc_docs_blocking: true,
      vtc_mandatory_gps: true,
      // Wait defaults
      wait_time_airport: 60,
      wait_time_station: 15,
      wait_time_other: 15,
      // Meeting points defaults
      meeting_point_airport_name: 'Aeropuerto Alicante (ALC)',
      meeting_point_airport_desc: 'El conductor le esperará en el hall de llegadas sosteniendo un cartel con su nombre, justo después de la recogida de equipajes, frente a la cafetería Costa Coffee.',
      meeting_point_airport_map: 'https://goo.gl/maps/examplealc',
      meeting_point_station_name: 'Estación Renfe Alicante',
      meeting_point_station_desc: "Salida principal de la estación. Diríjase a la zona de 'Parking VTC / Taxi' situada a la derecha al salir del edificio principal.",
      meeting_point_station_map: 'https://goo.gl/maps/examplerenfe'
   });

   useEffect(() => {
      const fetchSettings = async () => {
         try {
            const { data, error } = await supabase.from('system_settings').select('*');
            if (!error && data) {
               const settingsMap = { ...formData };
               data.forEach((item: any) => {
                  // Handle boolean strings
                  if (item.value === 'true') settingsMap[item.key] = true;
                  else if (item.value === 'false') settingsMap[item.key] = false;
                  // Handle numbers
                  else if (!isNaN(Number(item.value)) && item.value !== '') settingsMap[item.key] = Number(item.value);
                  else settingsMap[item.key] = item.value;
               });
               setFormData(settingsMap);
            }
         } catch (err) {
            console.error('Error fetching settings:', err);
         } finally {
            setLoading(false);
         }
      };
      fetchSettings();
   }, []);

   const handleChange = (key: string, value: any) => {
      setFormData((prev: any) => ({ ...prev, [key]: value }));
   };

   const handleSave = async () => {
      setSaving(true);
      try {
         const updates = Object.entries(formData).map(([key, value]) => ({
            key,
            value: String(value),
            updated_at: new Date().toISOString()
         }));

         const { error } = await supabase.from('system_settings').upsert(updates, { onConflict: 'key' });

         if (error) throw error;

         addToast({
            description: 'Configuración guardada correctamente',
            type: 'success'
         });
      } catch (err: any) {
         addToast({
            description: 'Error al guardar: ' + err.message,
            type: 'error'
         });
      } finally {
         setSaving(false);
      }
   };

   if (loading) {
      return (
         <div className="flex-1 flex items-center justify-center bg-[#0a0a0a]">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-gold"></div>
         </div>
      );
   }

   return (
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative bg-[#0a0a0a]">
         {/* Header */}
         <header className="h-20 bg-brand-charcoal border-b border-white/5 flex items-center justify-between px-6 lg:px-10 shrink-0 z-10">
            <div className="flex flex-col">
               <h1 className="text-xl font-bold text-white">Configuración Operativa</h1>
               <p className="text-xs text-brand-platinum/50">Datos Fiscales, Reglas VTC y Personalización</p>
            </div>
            <div className="flex items-center gap-4">
               <button
                  onClick={handleSave}
                  disabled={saving}
                  className="bg-brand-gold hover:bg-[#B3932F] text-brand-black px-6 py-2 rounded-full font-bold transition-colors shadow-lg flex items-center gap-2 disabled:opacity-50"
               >
                  {saving ? (
                     <span className="w-5 h-5 border-2 border-brand-black/30 border-t-brand-black rounded-full animate-spin"></span>
                  ) : (
                     <span className="material-icons-round text-lg">save</span>
                  )}
                  {saving ? 'Guardando...' : 'Guardar Cambios'}
               </button>
            </div>
         </header>

         <div className="flex-1 overflow-y-auto p-6 lg:p-10 scroll-smooth custom-scrollbar">
            <div className="max-w-7xl mx-auto space-y-8">

               {/* Datos Fiscales */}
               <section className="bg-brand-charcoal rounded-xl p-8 border border-white/5 shadow-xl">
                  <div className="flex items-center gap-3 mb-6 border-b border-white/5 pb-4">
                     <span className="material-icons-round text-brand-gold text-2xl">business</span>
                     <h2 className="text-xl font-bold text-white">Datos Fiscales de la Empresa</h2>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                     <div>
                        <label className="block text-xs font-bold text-brand-platinum/30 uppercase mb-2">Nombre Comercial</label>
                        <input
                           type="text"
                           value={formData.company_comercial_name}
                           onChange={(e) => handleChange('company_comercial_name', e.target.value)}
                           className="w-full bg-brand-black text-white border border-slate-700/50 rounded-lg px-4 py-3 text-sm placeholder-slate-500 focus:border-brand-gold focus:ring-1 focus:ring-brand-gold outline-none"
                        />
                     </div>
                     <div>
                        <label className="block text-xs font-bold text-brand-platinum/30 uppercase mb-2">Razón Social</label>
                        <input
                           type="text"
                           value={formData.company_legal_name}
                           onChange={(e) => handleChange('company_legal_name', e.target.value)}
                           className="w-full bg-brand-black text-white border border-slate-700/50 rounded-lg px-4 py-3 text-sm placeholder-slate-500 focus:border-brand-gold focus:ring-1 focus:ring-brand-gold outline-none"
                        />
                     </div>
                     <div>
                        <label className="block text-xs font-bold text-brand-platinum/30 uppercase mb-2">NIF / CIF</label>
                        <input
                           type="text"
                           value={formData.company_nif}
                           onChange={(e) => handleChange('company_nif', e.target.value)}
                           className="w-full bg-brand-black text-white border border-slate-700/50 rounded-lg px-4 py-3 text-sm placeholder-slate-500 focus:border-brand-gold focus:ring-1 focus:ring-brand-gold outline-none"
                        />
                     </div>
                     <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-brand-platinum/30 uppercase mb-2">Dirección Fiscal</label>
                        <input
                           type="text"
                           value={formData.company_address}
                           onChange={(e) => handleChange('company_address', e.target.value)}
                           className="w-full bg-brand-black text-white border border-slate-700/50 rounded-lg px-4 py-3 text-sm placeholder-slate-500 focus:border-brand-gold focus:ring-1 focus:ring-brand-gold outline-none"
                        />
                     </div>
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:col-span-3">
                        <div>
                           <label className="block text-xs font-bold text-brand-platinum/30 uppercase mb-2">Código Postal</label>
                           <input
                              type="text"
                              value={formData.company_postal_code}
                              onChange={(e) => handleChange('company_postal_code', e.target.value)}
                              className="w-full bg-brand-black text-white border border-slate-700/50 rounded-lg px-4 py-3 text-sm placeholder-slate-500 focus:border-brand-gold focus:ring-1 focus:ring-brand-gold outline-none"
                           />
                        </div>
                        <div>
                           <label className="block text-xs font-bold text-brand-platinum/30 uppercase mb-2">Población</label>
                           <input
                              type="text"
                              value={formData.company_city}
                              onChange={(e) => handleChange('company_city', e.target.value)}
                              className="w-full bg-brand-black text-white border border-slate-700/50 rounded-lg px-4 py-3 text-sm placeholder-slate-500 focus:border-brand-gold focus:ring-1 focus:ring-brand-gold outline-none"
                           />
                        </div>
                        <div>
                           <label className="block text-xs font-bold text-brand-platinum/30 uppercase mb-2">Provincia</label>
                           <input
                              type="text"
                              value={formData.company_province}
                              onChange={(e) => handleChange('company_province', e.target.value)}
                              className="w-full bg-brand-black text-white border border-slate-700/50 rounded-lg px-4 py-3 text-sm placeholder-slate-500 focus:border-brand-gold focus:ring-1 focus:ring-brand-gold outline-none"
                           />
                        </div>
                     </div>
                  </div>
               </section>

               {/* VTC Compliance Rules */}
               <section className="bg-brand-charcoal rounded-xl border border-white/5 shadow-xl overflow-hidden">
                  <div className="bg-brand-charcoal/80 px-8 py-4 border-b border-white/5 flex justify-between items-center">
                     <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        <span className="material-icons-round text-brand-platinum/50">gavel</span> Normativa VTC
                     </h2>
                     <span className="text-xs text-emerald-500 font-medium bg-emerald-500/10 px-2 py-1 rounded">Activo</span>
                  </div>

                  <div className="p-8">
                     <div className="space-y-6">
                        {/* Pre-reserva simple row */}
                        <div className="flex items-center justify-between pb-6 border-b border-white/5/50">
                           <div>
                              <label className="text-sm font-bold text-white block mb-1">Tiempo Mínimo Pre-Reserva</label>
                              <p className="text-xs text-brand-platinum/50">Horas mínimas de antelación para nuevas reservas web.</p>
                           </div>
                           <div className="flex items-center gap-3">
                              <input
                                 type="number"
                                 value={formData.vtc_min_time}
                                 onChange={(e) => handleChange('vtc_min_time', Number(e.target.value))}
                                 className="w-20 bg-brand-black border border-slate-600 rounded px-3 py-2 text-right font-mono text-white text-sm"
                              />
                              <span className="text-sm text-slate-300">Horas</span>
                           </div>
                        </div>

                        {/* Toggles List */}
                        {[
                           { key: 'vtc_digital_roadmap', label: 'Generar Hoja de Ruta Digital', desc: 'Envío automático al conductor 60 min antes.' },
                           { key: 'vtc_traveler_registry', label: 'Registro de Viajeros (SES.HOSPEDAJES)', desc: 'Envío de datos a Guardia Civil / Mossos.' },
                           { key: 'vtc_docs_blocking', label: 'Bloqueo por Documentación', desc: 'No asignar si ITV/Seguro caducado.' },
                           { key: 'vtc_mandatory_gps', label: 'Geolocalización Obligatoria', desc: 'Exigir GPS activo en app conductor.' }
                        ].map((item) => (
                           <div key={item.key} className="flex items-center justify-between pb-4 border-b border-white/5/50 last:border-0">
                              <div>
                                 <p className="text-sm font-medium text-white">{item.label}</p>
                                 <p className="text-xs text-brand-platinum/30">{item.desc}</p>
                              </div>
                              <label className="relative inline-flex items-center cursor-pointer">
                                 <input
                                    type="checkbox"
                                    className="sr-only peer"
                                    checked={formData[item.key]}
                                    onChange={(e) => handleChange(item.key, e.target.checked)}
                                 />
                                 <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                              </label>
                           </div>
                        ))}
                     </div>
                  </div>
               </section>

               {/* Wait Policy */}
               <section className="bg-brand-charcoal rounded-xl p-8 border border-white/5 shadow-xl">
                  <div className="flex items-center gap-3 mb-6 border-b border-white/5 pb-4">
                     <span className="material-icons-round text-amber-500 text-2xl">hourglass_empty</span>
                     <div className="flex-1">
                        <h2 className="text-xl font-bold text-white">Políticas de Tiempo de Espera</h2>
                        <p className="text-xs text-brand-platinum/50">Tiempos máximos de cortesía antes de aplicar "Customer No Show"</p>
                     </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                     {/* Airport */}
                     <div className="bg-brand-black border border-white/5 rounded-lg p-5">
                        <div className="flex items-center gap-3 mb-4">
                           <div className="p-2 bg-slate-800 rounded text-brand-platinum/50"><span className="material-icons-round text-sm">flight</span></div>
                           <p className="text-sm font-bold text-white">Aeropuertos</p>
                        </div>
                        <div className="flex items-center justify-between gap-2 mb-2">
                           <input
                              type="number"
                              value={formData.wait_time_airport}
                              onChange={(e) => handleChange('wait_time_airport', Number(e.target.value))}
                              className="w-20 bg-slate-800 border border-slate-600 rounded px-2 py-1 text-right font-mono text-white text-sm"
                           />
                           <span className="text-xs text-brand-platinum/30">minutos</span>
                        </div>
                        <input
                           type="range"
                           min="15"
                           max="120"
                           step="15"
                           value={formData.wait_time_airport}
                           onChange={(e) => handleChange('wait_time_airport', Number(e.target.value))}
                           className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                        />
                     </div>

                     {/* Station */}
                     <div className="bg-brand-black border border-white/5 rounded-lg p-5">
                        <div className="flex items-center gap-3 mb-4">
                           <div className="p-2 bg-slate-800 rounded text-brand-platinum/50"><span className="material-icons-round text-sm">train</span></div>
                           <p className="text-sm font-bold text-white">Estaciones (Renfe)</p>
                        </div>
                        <div className="flex items-center justify-between gap-2 mb-2">
                           <input
                              type="number"
                              value={formData.wait_time_station}
                              onChange={(e) => handleChange('wait_time_station', Number(e.target.value))}
                              className="w-20 bg-slate-800 border border-slate-600 rounded px-2 py-1 text-right font-mono text-white text-sm"
                           />
                           <span className="text-xs text-brand-platinum/30">minutos</span>
                        </div>
                        <input
                           type="range"
                           min="5"
                           max="60"
                           step="5"
                           value={formData.wait_time_station}
                           onChange={(e) => handleChange('wait_time_station', Number(e.target.value))}
                           className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                        />
                     </div>

                     {/* Other */}
                     <div className="bg-brand-black border border-white/5 rounded-lg p-5">
                        <div className="flex items-center gap-3 mb-4">
                           <div className="p-2 bg-slate-800 rounded text-brand-platinum/50"><span className="material-icons-round text-sm">place</span></div>
                           <p className="text-sm font-bold text-white">Otros Puntos</p>
                        </div>
                        <div className="flex items-center justify-between gap-2 mb-2">
                           <input
                              type="number"
                              value={formData.wait_time_other}
                              onChange={(e) => handleChange('wait_time_other', Number(e.target.value))}
                              className="w-20 bg-slate-800 border border-slate-600 rounded px-2 py-1 text-right font-mono text-white text-sm"
                           />
                           <span className="text-xs text-brand-platinum/30">minutos</span>
                        </div>
                        <input
                           type="range"
                           min="5"
                           max="60"
                           step="5"
                           value={formData.wait_time_other}
                           onChange={(e) => handleChange('wait_time_other', Number(e.target.value))}
                           className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                        />
                     </div>
                  </div>
               </section>

               {/* Meeting Points Configuration */}
               <section className="bg-brand-charcoal rounded-xl p-8 border border-white/5 shadow-xl">
                  <div className="flex items-center justify-between mb-6 border-b border-white/5 pb-4">
                     <div className="flex items-center gap-3">
                        <span className="material-icons-round text-brand-gold text-2xl">place</span>
                        <h2 className="text-xl font-bold text-white">Puntos de Encuentro</h2>
                     </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     {/* Airport Config */}
                     <div className="bg-brand-black border border-white/5 rounded-lg p-5">
                        <div className="flex items-center gap-3 mb-4">
                           <span className="material-icons-round text-brand-platinum/50">flight</span>
                           <input
                              type="text"
                              value={formData.meeting_point_airport_name}
                              onChange={(e) => handleChange('meeting_point_airport_name', e.target.value)}
                              className="bg-transparent font-bold text-white text-sm border-none p-0 focus:ring-0 w-full"
                           />
                        </div>
                        <div className="space-y-3">
                           <div>
                              <label className="block text-[10px] font-bold text-brand-platinum/30 uppercase mb-1">Instrucciones Llegadas</label>
                              <textarea
                                 rows={3}
                                 value={formData.meeting_point_airport_desc}
                                 onChange={(e) => handleChange('meeting_point_airport_desc', e.target.value)}
                                 className="w-full bg-brand-charcoal text-white border border-white/5 rounded-lg px-3 py-2 text-xs focus:border-brand-gold outline-none resize-none"
                              />
                           </div>
                           <div>
                              <label className="block text-[10px] font-bold text-brand-platinum/30 uppercase mb-1">Enlace Google Maps (Coordenadas)</label>
                              <div className="flex gap-2">
                                 <input
                                    type="text"
                                    value={formData.meeting_point_airport_map}
                                    onChange={(e) => handleChange('meeting_point_airport_map', e.target.value)}
                                    className="flex-1 bg-brand-black text-blue-400 border border-slate-700/50 rounded-lg px-3 py-2 text-xs placeholder-slate-500 focus:border-brand-gold focus:ring-1 focus:ring-brand-gold outline-none"
                                 />
                                 <button className="p-2 bg-slate-700 rounded hover:bg-slate-600 text-white"><span className="material-icons-round text-sm">map</span></button>
                              </div>
                           </div>
                        </div>
                     </div>

                     {/* Renfe Config */}
                     <div className="bg-brand-black border border-white/5 rounded-lg p-5">
                        <div className="flex items-center gap-3 mb-4">
                           <span className="material-icons-round text-brand-platinum/50">train</span>
                           <input
                              type="text"
                              value={formData.meeting_point_station_name}
                              onChange={(e) => handleChange('meeting_point_station_name', e.target.value)}
                              className="bg-transparent font-bold text-white text-sm border-none p-0 focus:ring-0 w-full"
                           />
                        </div>
                        <div className="space-y-3">
                           <div>
                              <label className="block text-[10px] font-bold text-brand-platinum/30 uppercase mb-1">Instrucciones Llegadas</label>
                              <textarea
                                 rows={3}
                                 value={formData.meeting_point_station_desc}
                                 onChange={(e) => handleChange('meeting_point_station_desc', e.target.value)}
                                 className="w-full bg-brand-black text-white border border-slate-700/50 rounded-lg px-3 py-2 text-xs placeholder-slate-500 focus:border-brand-gold focus:ring-1 focus:ring-brand-gold outline-none resize-none"
                              />
                           </div>
                           <div>
                              <label className="block text-[10px] font-bold text-brand-platinum/30 uppercase mb-1">Enlace Google Maps (Coordenadas)</label>
                              <div className="flex gap-2">
                                 <input
                                    type="text"
                                    value={formData.meeting_point_station_map}
                                    onChange={(e) => handleChange('meeting_point_station_map', e.target.value)}
                                    className="flex-1 bg-brand-black text-blue-400 border border-slate-700/50 rounded-lg px-3 py-2 text-xs placeholder-slate-500 focus:border-brand-gold focus:ring-1 focus:ring-brand-gold outline-none"
                                 />
                                 <button className="p-2 bg-slate-700 rounded hover:bg-slate-600 text-white"><span className="material-icons-round text-sm">map</span></button>
                              </div>
                           </div>
                        </div>
                     </div>
                  </div>
               </section>

            </div>
         </div>
      </div>
   );
};
