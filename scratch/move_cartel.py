import re

# 1. Update DataEntryModal.tsx
filepath = r"j:\PALLADIUM TRANSFERS\palladium-operations-hub\components\DataEntryModal.tsx"
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Add 'file' type to interface
content = content.replace(
    "type: 'text' | 'number' | 'email' | 'select' | 'searchable-select' | 'date' | 'time' | 'checkbox' | 'textarea';",
    "type: 'text' | 'number' | 'email' | 'select' | 'searchable-select' | 'date' | 'time' | 'checkbox' | 'textarea' | 'file';"
)

# Add file input logic
checkbox_logic = """                                        ) : field.type === 'checkbox' ? (
                                            // ... (existing checkbox)
                                            <div className="flex items-center gap-3 p-3 bg-white/5 rounded-2xl border border-white/5 h-full">
                                                <input
                                                    type="checkbox"
                                                    name={field.name}
                                                    checked={formData[field.name] || false}
                                                    onChange={handleChange}
                                                    className="w-5 h-5 rounded-lg bg-[#101822] border-white/10 text-blue-600 focus:ring-blue-500"
                                                />
                                                <span className="text-sm font-bold text-slate-300">{field.placeholder || field.label}</span>
                                            </div>
                                        ) : (
                                            // ... (existing input)"""

file_input_logic = """                                        ) : field.type === 'checkbox' ? (
                                            // ... (existing checkbox)
                                            <div className="flex items-center gap-3 p-3 bg-white/5 rounded-2xl border border-white/5 h-full">
                                                <input
                                                    type="checkbox"
                                                    name={field.name}
                                                    checked={formData[field.name] || false}
                                                    onChange={handleChange}
                                                    className="w-5 h-5 rounded-lg bg-[#101822] border-white/10 text-blue-600 focus:ring-blue-500"
                                                />
                                                <span className="text-sm font-bold text-slate-300">{field.placeholder || field.label}</span>
                                            </div>
                                        ) : field.type === 'file' ? (
                                            <div className="w-full bg-[#101822] border border-white/10 rounded-2xl px-4 py-2 text-white text-sm font-bold flex items-center justify-between">
                                                <input
                                                    type="file"
                                                    name={field.name}
                                                    onChange={(e) => {
                                                        const file = e.target.files?.[0];
                                                        if (file) {
                                                            const reader = new FileReader();
                                                            reader.onload = (ev) => {
                                                                updateFormData(field.name, ev.target?.result);
                                                            };
                                                            reader.readAsDataURL(file);
                                                        } else {
                                                            updateFormData(field.name, null);
                                                        }
                                                    }}
                                                    className="w-full text-xs file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-blue-600/20 file:text-blue-400 hover:file:bg-blue-600/30 cursor-pointer"
                                                />
                                                {formData[field.name] && <span className="material-icons-round text-emerald-500 text-sm">check_circle</span>}
                                            </div>
                                        ) : ("""

content = content.replace(checkbox_logic, file_input_logic)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("Updated DataEntryModal.tsx")

# 2. Update ReservasView.tsx
filepath = r"j:\PALLADIUM TRANSFERS\palladium-operations-hub\views\ReservasView.tsx"
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

booking_fields_old = """      { name: 'return_pax_count', label: 'Pasajeros (Vuelta)', type: 'number', section: 'Trayecto de Vuelta', required: false, defaultValue: 1 },
   ];"""

booking_fields_new = """      { name: 'return_pax_count', label: 'Pasajeros (Vuelta)', type: 'number', section: 'Trayecto de Vuelta', required: false, defaultValue: 1 },

      // Cartel PDF Section
      { name: 'cartel_text', label: 'Texto Personalizado para Cartel', type: 'text', section: 'Cartel PDF (Opcional)', placeholder: 'Ej: VIP, Happy Birthday... (Si está vacío, usa el nombre del pasajero)' },
      { name: 'cartel_logo', label: 'Logo Personalizado', type: 'file', section: 'Cartel PDF (Opcional)' },
   ];"""

content = content.replace(booking_fields_old, booking_fields_new)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("Updated ReservasView.tsx")

# 3. Update DriverAppView.tsx
filepath = r"j:\PALLADIUM TRANSFERS\palladium-operations-hub\views\DriverAppView.tsx"
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Remove Cartel Modal State
content = content.replace(
"""   // Cartel Modal State
   const [cartelModalOpen, setCartelModalOpen] = useState(false);
   const [cartelData, setCartelData] = useState({ passenger: '', subtitle: '', logoDataUrl: '' });
   const [cartelBookingId, setCartelBookingId] = useState<string | null>(null);""",
"""   // Cartel configuration is now in ReservasView"""
)

# Update generatePDF function to take a booking object
generate_pdf_old = """   const generatePDF = () => {
      const doc = new jsPDF({ orientation: 'landscape' });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      // Background
      doc.setFillColor(15, 15, 15); // brand-black
      doc.rect(0, 0, pageWidth, pageHeight, 'F');

      if (cartelData.logoDataUrl) {
         try {
            doc.addImage(cartelData.logoDataUrl, 'PNG', pageWidth / 2 - 25, 20, 50, 50);
         } catch(e) {
            console.error("Error adding image to PDF", e);
         }
      } else {
         doc.setTextColor(197, 160, 89); // brand-gold
         doc.setFontSize(24);
         doc.text("PALLADIUM TRANSFERS", pageWidth / 2, 40, { align: 'center' });
      }

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(48);
      doc.text(cartelData.passenger.toUpperCase(), pageWidth / 2, pageHeight / 2 + 10, { align: 'center' });

      if (cartelData.subtitle) {
         doc.setTextColor(197, 160, 89);
         doc.setFontSize(24);
         doc.text(cartelData.subtitle, pageWidth / 2, pageHeight / 2 + 40, { align: 'center' });
      }

      window.open(doc.output('bloburl'), '_blank');
      setCartelModalOpen(false);
   };"""

generate_pdf_new = """   const generatePDF = (booking: any) => {
      const doc = new jsPDF({ orientation: 'landscape' });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      // Background
      doc.setFillColor(15, 15, 15); // brand-black
      doc.rect(0, 0, pageWidth, pageHeight, 'F');

      if (booking.cartel_logo) {
         try {
            // Depending on image aspect ratio, width/height could be adjusted
            doc.addImage(booking.cartel_logo, 'PNG', pageWidth / 2 - 25, 20, 50, 50);
         } catch(e) {
            console.error("Error adding image to PDF", e);
            // Fallback to text if image fails
            doc.setTextColor(197, 160, 89); // brand-gold
            doc.setFontSize(24);
            doc.text("PALLADIUM TRANSFERS", pageWidth / 2, 40, { align: 'center' });
         }
      } else {
         doc.setTextColor(197, 160, 89); // brand-gold
         doc.setFontSize(24);
         doc.text("PALLADIUM TRANSFERS", pageWidth / 2, 40, { align: 'center' });
      }

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(48);
      // Use cartel_text if present, otherwise fallback to passenger name
      const mainText = booking.cartel_text || booking.passenger;
      doc.text(mainText.toUpperCase(), pageWidth / 2, pageHeight / 2 + 10, { align: 'center' });

      // We can use the notes as subtitle or just omit it if the cartel text overrides it.
      // We will only render subtitle if they provided custom text AND a separate passenger name, but to keep it simple, we just print the main text.

      window.open(doc.output('bloburl'), '_blank');
   };"""

content = content.replace(generate_pdf_old, generate_pdf_new)


# Update "Generar Cartel" button in DriverAppView
button_old = """                                       <button 
                                          onClick={() => {
                                             setCartelData({ passenger: currentBooking.passenger, subtitle: '', logoDataUrl: '' });
                                             setCartelBookingId(currentBooking.id);
                                             setCartelModalOpen(true);
                                          }}
                                          className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-gold/10 border border-brand-gold/20 text-brand-gold rounded-full hover:bg-brand-gold hover:text-black transition-all"
                                       >
                                          <span className="material-icons-round text-[10px]">edit_document</span>
                                          <span className="text-[8px] font-black uppercase tracking-widest">Cartel PDF</span>
                                       </button>"""

button_new = """                                       <button 
                                          onClick={() => generatePDF(currentBooking)}
                                          className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-gold/10 border border-brand-gold/20 text-brand-gold rounded-full hover:bg-brand-gold hover:text-black transition-all"
                                       >
                                          <span className="material-icons-round text-[10px]">edit_document</span>
                                          <span className="text-[8px] font-black uppercase tracking-widest">Descargar Cartel</span>
                                       </button>"""

content = content.replace(button_old, button_new)


# Remove the Cartel Modal JSX
modal_pattern = re.compile(r'\{\/\*\s*Cartel PDF Modal\s*\*\/\}.*?\{\/\*\s*Payment Collection Modal\s*\*\/\}', re.DOTALL)
if re.search(modal_pattern, content):
    content = re.sub(modal_pattern, '{/* Payment Collection Modal */}', content)
else:
    # If standard modal replacement didn't work because of specific positioning, just look for the cartel modal code:
    modal_pattern_2 = re.compile(r'\{\/\*\s*Cartel PDF Modal\s*\*\/\}.*?\}\)\}', re.DOTALL)
    # Actually, it was added at the bottom. Let's just remove the exact string we inserted earlier.
    cartel_modal_jsx = """
         {/* Cartel PDF Modal */}
         {cartelModalOpen && (
            <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
               <div className="bg-brand-charcoal border border-brand-gold/30 rounded-3xl w-full max-w-md p-6">
                  <h2 className="text-lg font-black text-brand-gold mb-2">Generar Cartel PDF</h2>
                  <p className="text-xs text-brand-platinum mb-6">
                     Diseña un cartel elegante para mostrar en la tablet al cliente en el aeropuerto.
                  </p>

                  <div className="space-y-4">
                     <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Nombre Pasajero</label>
                        <input type="text" value={cartelData.passenger} onChange={e => setCartelData({...cartelData, passenger: e.target.value})} className="w-full bg-slate-800 text-white p-3 rounded-xl border border-white/5 focus:border-brand-gold outline-none uppercase font-black" />
                     </div>
                     <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Subtítulo / Mensaje (Opcional)</label>
                        <input type="text" value={cartelData.subtitle} onChange={e => setCartelData({...cartelData, subtitle: e.target.value})} placeholder="Ej: VIP, Happy Birthday..." className="w-full bg-slate-800 text-white p-3 rounded-xl border border-white/5 focus:border-brand-gold outline-none" />
                     </div>
                     <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Logo / Imagen (Opcional)</label>
                        <input type="file" accept="image/*" onChange={(e) => {
                           const file = e.target.files?.[0];
                           if (file) {
                              const reader = new FileReader();
                              reader.onload = (ev) => {
                                 setCartelData({...cartelData, logoDataUrl: ev.target?.result as string});
                              };
                              reader.readAsDataURL(file);
                           }
                        }} className="w-full text-[10px] text-brand-platinum file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-[10px] file:font-bold file:bg-brand-gold/10 file:text-brand-gold hover:file:bg-brand-gold/20 cursor-pointer"/>
                     </div>
                  </div>

                  <div className="flex gap-3 mt-8">
                     <button onClick={() => setCartelModalOpen(false)} className="flex-1 bg-white/5 text-white font-bold p-3 rounded-xl hover:bg-white/10 transition text-[10px] uppercase tracking-widest">Cancelar</button>
                     <button onClick={generatePDF} className="flex-1 bg-brand-gold text-brand-black font-black uppercase tracking-widest p-3 rounded-xl hover:bg-yellow-500 transition text-[10px] flex items-center justify-center gap-2">
                        <span className="material-icons-round text-sm">print</span> Generar PDF
                     </button>
                  </div>
               </div>
            </div>
         )}
"""
    content = content.replace(cartel_modal_jsx, "")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("Updated DriverAppView.tsx")
