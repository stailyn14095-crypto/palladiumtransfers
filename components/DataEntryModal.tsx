import React, { useState, useEffect } from 'react';

interface Field {
    name: string;
    label: string;
    type: 'text' | 'number' | 'email' | 'select' | 'searchable-select' | 'date' | 'time' | 'checkbox' | 'textarea';
    required?: boolean;
    options?: string[]; // For select inputs
    optionLabels?: string[]; // Display labels for select inputs
    placeholder?: string;
    defaultValue?: any;
    section?: string;
}

export interface DataEntryModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: any) => Promise<void>;
    initialData?: any;
    title: string;
    fields: Field[];
    onFormDataChange?: (data: any) => void;
}

// ... (imports)

// Helper Component for Searchable Select
const SearchableSelect = ({ field, value, onChange }: { field: Field, value: string, onChange: (value: string) => void }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const containerRef = React.useRef<HTMLDivElement>(null);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const filteredOptions = field.options?.filter((opt, idx) => {
        const label = field.optionLabels ? field.optionLabels[idx] : opt;
        return label?.toLowerCase().includes(search.toLowerCase());
    }) || [];

    const currentLabel = field.options?.reduce((acc, opt, idx) => {
        if (opt === value) return field.optionLabels ? field.optionLabels[idx] : opt;
        return acc;
    }, '') || value || 'Seleccionar...';

    return (
        <div className="relative" ref={containerRef}>
            <div
                onClick={() => { setIsOpen(!isOpen); setSearch(''); }}
                className="w-full bg-[#101822] border border-white/10 rounded-2xl px-4 py-3 text-white text-sm font-bold flex justify-between items-center cursor-pointer focus:ring-2 focus:ring-blue-500 transition-all hover:bg-white/5"
            >
                <span className={!value ? 'text-slate-500' : ''}>{currentLabel}</span>
                <span className="material-icons-round text-slate-400 text-sm">{isOpen ? 'expand_less' : 'expand_more'}</span>
            </div>

            {isOpen && (
                <div className="absolute z-50 w-full mt-2 bg-[#1a2533] border border-white/10 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-100 max-h-60 flex flex-col">
                    <div className="p-2 border-b border-white/5 sticky top-0 bg-[#1a2533]">
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 material-icons-round text-slate-500 text-sm">search</span>
                            <input
                                type="text"
                                autoFocus
                                placeholder="Buscar..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full bg-[#101822] text-white text-xs p-2 pl-9 rounded-lg border border-white/10 focus:outline-none focus:border-blue-500"
                                onClick={(e) => e.stopPropagation()}
                            />
                        </div>
                    </div>
                    <div className="overflow-y-auto custom-scrollbar flex-1">
                        {filteredOptions.length > 0 ? (
                            filteredOptions.map((opt) => {
                                const idx = field.options?.indexOf(opt) ?? -1;
                                const label = field.optionLabels ? field.optionLabels[idx] : opt;
                                return (
                                    <div
                                        key={opt}
                                        onClick={() => {
                                            onChange(opt);
                                            setIsOpen(false);
                                        }}
                                        className={`px-4 py-2 text-sm text-slate-300 hover:text-white hover:bg-blue-600/20 cursor-pointer transition-colors ${value === opt ? 'bg-blue-600/10 text-blue-400 font-bold' : ''}`}
                                    >
                                        {label}
                                    </div>
                                );
                            })
                        ) : (
                            <div className="p-4 text-center text-xs text-slate-500 italic">No hay resultados</div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export const DataEntryModal: React.FC<DataEntryModalProps> = ({ isOpen, onClose, onSubmit, initialData, title, fields, onFormDataChange }) => {
    // ... (rest of state and hooks remain same)
    const [formData, setFormData] = useState<any>({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                // Ensure date fields are in proper format for HTML5 inputs
                const sanitizedData = { ...initialData };
                fields.forEach(f => {
                    if (sanitizedData[f.name]) {
                        if (f.type === 'date') {
                            if (typeof sanitizedData[f.name] === 'string' && sanitizedData[f.name].length > 10) {
                                sanitizedData[f.name] = sanitizedData[f.name].substring(0, 10);
                            }
                        } else if (f.type === 'datetime-local') {
                            const dateValue = new Date(sanitizedData[f.name]);
                            if (!isNaN(dateValue.getTime())) {
                                // Adjust to local timezone for input display
                                const offset = dateValue.getTimezoneOffset() * 60000;
                                const localDate = new Date(dateValue.getTime() - offset);
                                sanitizedData[f.name] = localDate.toISOString().slice(0, 16);
                            }
                        }
                    }
                });
                setFormData(sanitizedData);
            } else {
                const defaults: any = {};
                fields.forEach(f => {
                    if ((f as any).defaultValue !== undefined) {
                        defaults[f.name] = (f as any).defaultValue;
                    }
                });
                setFormData(defaults);
            }
            setError(null);
        }
    }, [isOpen, initialData]);

    if (!isOpen) return null;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        // ... (existing handleChange logic)
        const { name, value, type } = e.target as any;
        let finalValue: any = value;

        if (type === 'checkbox') {
            finalValue = (e.target as HTMLInputElement).checked;
        } else if (type === 'number') {
            finalValue = value === '' ? '' : parseFloat(value);
        }

        updateFormData(name, finalValue);
    };

    const updateFormData = (name: string, value: any) => {
        setFormData((prev: any) => {
            const newData = { ...prev, [name]: value };

            // Legacy logic removed - handled by onFormDataChange prop in parent
            if (onFormDataChange) {
                onFormDataChange(newData);
            }

            return newData;
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        // ... (existing handleSubmit logic)
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            const submittedData = { ...formData };
            // Ensure datetime-local fields are sent as UTC ISO strings
            fields.forEach(f => {
                if (f.type === 'datetime-local' && submittedData[f.name]) {
                    const d = new Date(submittedData[f.name]);
                    if (!isNaN(d.getTime())) {
                        submittedData[f.name] = d.toISOString();
                    }
                }
            });

            if (submittedData.pickup_date && submittedData.pickup_time && !submittedData.time) {
                submittedData.time = new Date(`${submittedData.pickup_date}T${submittedData.pickup_time}`).toISOString();
            }

            await onSubmit(submittedData);
            onClose();
        } catch (err: any) {
            setError(err.message || 'Error saving data');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
            {/* ... (keep modal structure) */}
            <div className="bg-[#1a2533] border border-white/10 rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.5)] w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-300">
                <div className="flex justify-between items-center p-8 border-b border-white/5 bg-[#141e2b]">
                    <h2 className="text-2xl font-black text-white tracking-tight">{title}</h2>
                    <button onClick={onClose} className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-all">
                        <span className="material-icons-round">close</span>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
                    {/* ... (error message) */}
                    {error && (
                        <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl text-xs font-bold animate-pulse">
                            {error}
                        </div>
                    )}

                    {Object.entries(fields.reduce((acc, field) => {
                        const section = field.section || 'General';
                        if (!acc[section]) acc[section] = [];
                        acc[section].push(field);
                        return acc;
                    }, {} as Record<string, Field[]>)).map(([section, sectionFields]) => (
                        <div key={section} className="space-y-4">
                            {/* ... (section header) */}
                            {section !== 'General' && (
                                <h3 className="text-xs font-black text-blue-400 uppercase tracking-widest border-b border-blue-500/20 pb-2 mb-4">
                                    {section}
                                </h3>
                            )}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                {(sectionFields as Field[]).map((field: Field) => (
                                    <div key={field.name} className={`space-y-1.5 ${field.type === 'textarea' || (field as any).type === 'location' || (field as any).type === 'searchable-select' ? 'col-span-1 md:col-span-2' : ''}`}>
                                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{field.label}</label>

                                        {/* Field Rendering Logic */}
                                        {field.type === 'searchable-select' ? (
                                            <SearchableSelect
                                                field={field}
                                                value={formData[field.name] || ''}
                                                onChange={(val) => updateFormData(field.name, val)}
                                            />
                                        ) : field.type === 'select' ? (
                                            // ... (existing select)
                                            <select
                                                name={field.name}
                                                value={formData[field.name] || ''}
                                                onChange={handleChange}
                                                className="w-full bg-[#101822] border border-white/10 rounded-2xl px-4 py-3 text-white text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all appearance-none cursor-pointer"
                                                required={field.required}
                                            >
                                                <option value="" className="bg-[#101822]">Seleccionar...</option>
                                                {field.options?.map((opt, idx) => (
                                                    <option key={opt} value={opt} className="bg-[#101822]">
                                                        {field.optionLabels ? field.optionLabels[idx] : opt}
                                                    </option>
                                                ))}
                                            </select>
                                        ) : field.type === 'textarea' ? (
                                            // ... (existing textarea)
                                            <textarea
                                                name={field.name}
                                                value={formData[field.name] || ''}
                                                onChange={handleChange}
                                                placeholder={field.placeholder}
                                                rows={3}
                                                className="w-full bg-[#101822] border border-white/10 rounded-2xl px-4 py-3 text-white text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none"
                                                required={field.required}
                                            />
                                        ) : field.type === 'checkbox' ? (
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
                                            // ... (existing input)
                                            <input
                                                type={field.type}
                                                name={field.name}
                                                value={formData[field.name] || ''}
                                                onChange={handleChange}
                                                placeholder={field.placeholder}
                                                className="w-full bg-[#101822] border border-white/10 rounded-2xl px-4 py-3 text-white text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                                required={field.required}
                                            />
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </form>

                <div className="p-8 border-t border-white/5 bg-[#141e2b] flex justify-end gap-4">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-6 py-3 text-slate-500 hover:text-white font-black uppercase text-[10px] tracking-widest transition-all"
                        disabled={loading}
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-blue-900/40 transition-all disabled:opacity-50 flex items-center gap-3 active:scale-95"
                    >
                        {loading && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>}
                        {initialData ? 'Actualizar' : 'Crear Registro'}
                    </button>
                </div>
            </div>
        </div>
    );
};
