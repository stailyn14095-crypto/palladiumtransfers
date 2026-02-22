import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import * as XLSX from 'xlsx';
import { useToast } from '../components/ui/Toast';

export const MunicipalitiesView: React.FC = () => {
    const [municipalities, setMunicipalities] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [importing, setImporting] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedRegion, setSelectedRegion] = useState('10'); // Default: C. Valenciana
    const [selectedProvince, setSelectedProvince] = useState('03'); // Default: Alicante

    // New state for adding custom municipality
    const [isAdding, setIsAdding] = useState(false);
    const [newMuni, setNewMuni] = useState({
        name: '',
        type: 'municipio', // municipio, aeropuerto, tren, puerto
        cod_prov: '03', // Default to Alicante
        cod_auto: '10',
        cod_mun: '000',
        dc: '00'
    });

    // Search suggestions within modal
    const [munSearch, setMunSearch] = useState('');
    const [munSuggestions, setMunSuggestions] = useState<any[]>([]);

    const { addToast } = useToast();

    const regions = [
        { code: 'all', name: 'Todas las Comunidades' },
        { code: '01', name: 'Andalucía' },
        { code: '02', name: 'Aragón' },
        { code: '03', name: 'Asturias' },
        { code: '04', name: 'Illes Balears' },
        { code: '05', name: 'Canarias' },
        { code: '06', name: 'Cantabria' },
        { code: '07', name: 'Castilla y León' },
        { code: '08', name: 'Castilla - La Mancha' },
        { code: '09', name: 'Cataluña' },
        { code: '10', name: 'Comunitat Valenciana' },
        { code: '11', name: 'Extremadura' },
        { code: '12', name: 'Galicia' },
        { code: '13', name: 'Comunidad de Madrid' },
        { code: '14', name: 'Región de Murcia' },
        { code: '15', name: 'Navarra' },
        { code: '16', name: 'País Vasco' },
        { code: '17', name: 'La Rioja' },
        { code: '18', name: 'Ceuta' },
        { code: '19', name: 'Melilla' },
    ];

    // Mapped provinces (simplified for C. Valenciana and generic others logic if needed, but here's a fuller list for completeness)
    const provinces = [
        { code: 'all', name: 'Todas las Provincias', region: 'all' },
        // C. Valenciana
        { code: '03', name: 'Alicante/Alacant', region: '10' },
        { code: '12', name: 'Castellón/Castelló', region: '10' },
        { code: '46', name: 'Valencia/València', region: '10' },
        // Andalucía
        { code: '04', name: 'Almería', region: '01' },
        { code: '11', name: 'Cádiz', region: '01' },
        { code: '14', name: 'Córdoba', region: '01' },
        { code: '18', name: 'Granada', region: '01' },
        { code: '21', name: 'Huelva', region: '01' },
        { code: '23', name: 'Jaén', region: '01' },
        { code: '29', name: 'Málaga', region: '01' },
        { code: '41', name: 'Sevilla', region: '01' },
        // Aragón
        { code: '22', name: 'Huesca', region: '02' },
        { code: '44', name: 'Teruel', region: '02' },
        { code: '50', name: 'Zaragoza', region: '02' },
        // Others (Generic handling or partial list can be expanded)
        { code: '07', name: 'Illes Balears', region: '04' },
        { code: '08', name: 'Barcelona', region: '09' },
        { code: '13', name: 'Ciudad Real', region: '08' },
        { code: '15', name: 'A Coruña', region: '12' },
        { code: '28', name: 'Madrid', region: '13' },
        { code: '30', name: 'Murcia', region: '14' },
        // ... (Adding major ones or logic to filter available provinces dynamically would be better if table had relations, hardcoding for now)
    ];

    // Effect to reset province when region changes, unless it matches the default logic
    useEffect(() => {
        // If the currently selected province does not belong to the new selected region (and neither is 'all'), reset it.
        const prov = provinces.find(p => p.code === selectedProvince);
        if (selectedRegion !== 'all' && prov && prov.region !== 'all' && prov.region !== selectedRegion) {
            setSelectedProvince('all');
        }
        fetchMunicipalities();
    }, [selectedRegion, selectedProvince]);

    const fetchMunicipalities = async () => {
        try {
            console.log("Municipalities: Fetching for region", selectedRegion, "province", selectedProvince);
            setLoading(true);
            let query = supabase
                .from('municipalities')
                .select('*')
                .order('name', { ascending: true });

            if (selectedRegion !== 'all') {
                query = query.eq('cod_auto', selectedRegion);
            }
            if (selectedProvince !== 'all') {
                query = query.eq('cod_prov', selectedProvince);
            }

            const { data, error } = await query;

            if (error) throw error;
            console.log("Municipalities: Fetch success, rows:", data?.length || 0);
            setMunicipalities(data || []);
        } catch (err: any) {
            console.error("Error fetching municipalities:", err);
            addToast({ title: 'Error', description: 'No se pudieron cargar los municipios.', type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = async () => {
        if (!newMuni.name) {
            addToast({ title: 'Error', description: 'El nombre es obligatorio.', type: 'error' });
            return;
        }

        try {
            // Auto-fill region code based on province if not set (simple lookup)
            let finalCodAuto = newMuni.cod_auto;
            const provMeta = provinces.find(p => p.code === newMuni.cod_prov);
            if (provMeta && provMeta.region !== 'all') {
                finalCodAuto = provMeta.region;
            }

            const { data, error } = await supabase.from('municipalities').insert([{
                ...newMuni,
                cod_auto: finalCodAuto,
                type: newMuni.type
            }]).select().single();

            if (error) throw error;

            setMunicipalities(prev => [data, ...prev]);
            addToast({ title: 'Creado', description: 'Municipio/Punto creado correctamente.', type: 'success' });
            setIsAdding(false);
            setNewMuni({ name: '', type: 'municipio', cod_prov: selectedProvince !== 'all' ? selectedProvince : '03', cod_auto: '10', cod_mun: '000', dc: '00' });
        } catch (err: any) {
            addToast({ title: 'Error', description: err.message, type: 'error' });
        }
    };

    const deleteItem = async (id: string) => {
        try {
            const { error } = await supabase.from('municipalities').delete().eq('id', id);
            if (error) throw error;
            setMunicipalities(prev => prev.filter(m => m.id !== id));
            addToast({ title: 'Eliminado', description: 'Registro eliminado correctamente.', type: 'success' });
        } catch (err: any) {
            addToast({ title: 'Error', description: 'No se pudo eliminar.', type: 'error' });
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
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

                // Robust Header Detection
                const rawData = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];

                let headerRowIndex = 0;
                let foundHeader = false;

                // Look for 'CODAUTO' or 'CPRO' in the first 10 rows
                for (let i = 0; i < Math.min(10, rawData.length); i++) {
                    const row = rawData[i].map(cell => String(cell).toUpperCase().trim());
                    if (row.includes('CODAUTO') || row.includes('CPRO')) {
                        headerRowIndex = i;
                        foundHeader = true;
                        break;
                    }
                }

                if (!foundHeader) {
                    console.warn("Could not auto-detect header row. Assuming Row 1.");
                }

                const data = XLSX.utils.sheet_to_json(ws, { range: headerRowIndex });

                let count = 0;
                let errors = 0;

                const batchSize = 100;
                const chunks = [];
                let currentChunk = [];

                for (const row of data as any[]) {
                    const getVal = (keys: string[]) => {
                        for (const k of keys) {
                            if (row[k] !== undefined) return row[k];
                            const rowKey = Object.keys(row).find(rk => rk.toUpperCase() === k.toUpperCase());
                            if (rowKey) return row[rowKey];
                        }
                        return null;
                    };

                    const cod_auto = getVal(['CODAUTO', 'codauto']);
                    const cod_prov = getVal(['CPRO', 'cpro']);
                    const cod_mun = getVal(['CMUN', 'cmun']);
                    const dc = getVal(['DC', 'dc']);
                    const name = getVal(['NOMBRE', 'nombre']);

                    if (name) {
                        currentChunk.push({
                            cod_auto: cod_auto?.toString(),
                            cod_prov: cod_prov?.toString(),
                            cod_mun: cod_mun?.toString(),
                            dc: dc?.toString(),
                            name: name,
                            type: 'municipio' // Default type for imports
                        });
                    }
                    if (currentChunk.length >= batchSize) {
                        chunks.push(currentChunk);
                        currentChunk = [];
                    }
                }
                if (currentChunk.length > 0) chunks.push(currentChunk);

                for (const chunk of chunks) {
                    const { error } = await supabase.from('municipalities').insert(chunk);
                    if (error) {
                        console.error("Error inserting chunk:", error);
                        errors += chunk.length;
                    } else {
                        count += chunk.length;
                    }
                }

                addToast({ title: 'Importación Completada', description: `Se han importado ${count} municipios.`, type: 'success' });
                fetchMunicipalities(); // Refresh data
            } catch (err: any) {
                console.error("Import error:", err);
                addToast({ title: 'Error de Importación', description: err.message, type: 'error' });
            } finally {
                setImporting(false);
                e.target.value = '';
            }
        };
        reader.readAsBinaryString(file);
    };

    const filtered = municipalities.filter((m: any) =>
        m.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.cod_mun?.includes(searchTerm)
    );

    // Filter provinces based on selected region
    const availableProvinces = selectedRegion === 'all'
        ? provinces
        : provinces.filter(p => p.region === 'all' || p.region === selectedRegion);

    const getTypeIcon = (type: string) => {
        switch (type?.toLowerCase()) {
            case 'aeropuerto': return 'flight';
            case 'tren': return 'train';
            case 'puerto': return 'directions_boat';
            case 'hotel': return 'hotel';
            default: return 'location_city';
        }
    };

    const getTypeColor = (type: string) => {
        switch (type?.toLowerCase()) {
            case 'aeropuerto': return 'text-sky-400';
            case 'tren': return 'text-orange-400';
            case 'puerto': return 'text-indigo-400';
            default: return 'text-slate-500';
        }
    };

    return (
        <div className="flex-1 flex flex-col h-full bg-brand-black overflow-hidden relative">
            <header className="h-20 border-b border-white/5 bg-brand-charcoal px-8 flex items-center justify-between shrink-0">
                <div>
                    <h1 className="text-xl font-bold text-white">Municipios y Puntos</h1>
                    <p className="text-xs text-slate-500">Base de datos del Ministerio de Fomento + Personalizados</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => setIsAdding(true)}
                        className="px-4 py-2 bg-brand-gold hover:bg-brand-gold/80 text-black rounded-lg text-sm font-bold flex items-center gap-2 shadow-lg transition-all active:scale-95"
                    >
                        <span className="material-icons-round text-sm">add</span> Crear Nuevo
                    </button>
                    <div className="relative">
                        <label htmlFor="file-upload" className={`px-4 py-2 ${importing ? 'bg-slate-600' : 'bg-emerald-600 hover:bg-emerald-700'} text-white rounded-lg text-sm font-bold flex items-center gap-2 shadow-lg shadow-emerald-900/40 transition-all cursor-pointer active:scale-95`}>
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
                        <input id="file-upload" type="file" accept=".xlsx, .xls" onChange={handleFileUpload} disabled={importing} className="hidden" />
                    </div>
                </div>
            </header>

            <div className="p-8 overflow-y-auto">
                <div className="mb-6 flex gap-4">
                    {/* Checkbox or filter for types? Maybe later if requested. */}
                    <div className="relative max-w-md flex-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 material-icons-round text-sm">search</span>
                        <input
                            type="text"
                            placeholder="Buscar municipio, aeropuerto, estación..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-[#1a2533] border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
                        />
                    </div>

                    <select
                        value={selectedRegion}
                        onChange={(e) => setSelectedRegion(e.target.value)}
                        className="bg-brand-black border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-gold transition-colors cursor-pointer"
                    >
                        {regions.map(r => (
                            <option key={r.code} value={r.code} className="bg-brand-black text-white">{r.name}</option>
                        ))}
                    </select>

                    <select
                        value={selectedProvince}
                        onChange={(e) => setSelectedProvince(e.target.value)}
                        className="bg-brand-black border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-gold transition-colors cursor-pointer"
                    >
                        {availableProvinces.map(p => (
                            <option key={p.code} value={p.code} className="bg-brand-black text-white">{p.name}</option>
                        ))}
                    </select>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center p-20 text-brand-platinum/50 uppercase tracking-widest text-[10px] font-bold">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-gold mr-4"></div>
                        Cargando base de datos...
                    </div>
                ) : (
                    <div className="bg-brand-black border border-white/5 rounded-2xl overflow-hidden shadow-2xl">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-brand-charcoal text-brand-platinum/50 text-[10px] font-black uppercase tracking-widest border-b border-white/5">
                                    <th className="px-6 py-4">Tipo</th>
                                    <th className="px-6 py-4">Provincia (CPRO)</th>
                                    <th className="px-6 py-4">Municipio (CMUN)</th>
                                    <th className="px-6 py-4">Nombre</th>
                                    <th className="px-6 py-4 text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800 text-sm">
                                {filtered.length > 0 ? filtered.map((m: any) => (
                                    <tr key={m.id} className="hover:bg-slate-800/30 transition-colors">
                                        <td className="px-6 py-3">
                                            <div className="flex items-center gap-2" title={m.type || 'municipio'}>
                                                <span className={`material - icons - round text - lg ${getTypeColor(m.type || 'municipio')} `}>
                                                    {getTypeIcon(m.type || 'municipio')}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-3 font-mono text-slate-400">{m.cod_prov}</td>
                                        <td className="px-6 py-3 font-mono text-blue-400 font-bold">{m.cod_mun}</td>
                                        <td className="px-6 py-3 text-white font-medium">{m.name}</td>
                                        <td className="px-6 py-3 text-right">
                                            <button
                                                onClick={() => { if (confirm('¿Eliminar?')) deleteItem(m.id); }}
                                                className="text-slate-500 hover:text-red-400 transition-colors"
                                            >
                                                <span className="material-icons-round text-sm">delete</span>
                                            </button>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={5} className="p-10 text-center text-slate-500">
                                            {municipalities?.length === 0 ? 'No hay registros para esta selección.' : 'No se encontraron resultados.'}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Simple Modal for Adding */}
            {isAdding && (
                <div className="absolute inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-[#1a2533] border border-slate-700 rounded-2xl shadow-2xl w-full max-w-lg p-6 animate-in zoom-in-95 duration-200">
                        <h2 className="text-xl font-bold text-white mb-6">Crear Nuevo Punto / Municipio</h2>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Nombre</label>
                                <input
                                    type="text"
                                    className="w-full bg-[#0f172a] border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-blue-500 focus:outline-none"
                                    placeholder="Ej. Aeropuerto de Alicante, Estación Nord..."
                                    value={newMuni.name}
                                    onChange={e => setNewMuni({ ...newMuni, name: e.target.value })}
                                    autoFocus
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Tipo</label>
                                    <select
                                        className="w-full bg-[#0f172a] border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-blue-500 focus:outline-none"
                                        value={newMuni.type}
                                        onChange={e => setNewMuni({ ...newMuni, type: e.target.value })}
                                    >
                                        <option value="municipio">Municipio</option>
                                        <option value="aeropuerto">Aeropuerto</option>
                                        <option value="tren">Estación de Tren</option>
                                        <option value="puerto">Puerto</option>
                                        <option value="hotel">Hotel / Resort</option>
                                        <option value="otro">Otro / Personalizado</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Provincia</label>
                                    <select
                                        className="w-full bg-[#0f172a] border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-blue-500 focus:outline-none"
                                        value={newMuni.cod_prov}
                                        onChange={e => {
                                            setNewMuni({ ...newMuni, cod_prov: e.target.value });
                                            setMunSuggestions([]);
                                            setMunSearch('');
                                        }}
                                    >
                                        {provinces.filter(p => p.code !== 'all').map(p => (
                                            <option key={p.code} value={p.code}>{p.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Municipality Search */}
                            <div className="relative">
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Buscar Código por Nombre (Opcional)</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 material-icons-round text-sm">search</span>
                                    <input
                                        type="text"
                                        className="w-full bg-[#0f172a] border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-white focus:border-blue-500 focus:outline-none"
                                        placeholder="Escribe para buscar código..."
                                        value={munSearch}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            setMunSearch(val);
                                            if (val.length > 2) {
                                                const timer = setTimeout(async () => {
                                                    const { data } = await supabase.from('municipalities')
                                                        .select('cod_mun, dc, name')
                                                        .eq('cod_prov', newMuni.cod_prov)
                                                        .ilike('name', `%${val}%`)
                                                        .limit(5);
                                                    setMunSuggestions(data || []);
                                                }, 300);
                                            } else {
                                                setMunSuggestions([]);
                                            }
                                        }}
                                    />
                                    {munSuggestions.length > 0 && (
                                        <ul className="absolute z-10 w-full bg-[#0f172a] border border-slate-700 rounded-xl mt-1 max-h-40 overflow-y-auto shadow-xl">
                                            {munSuggestions.map((s, idx) => (
                                                <li
                                                    key={idx}
                                                    onClick={() => {
                                                        setNewMuni({ ...newMuni, cod_mun: s.cod_mun, dc: s.dc });
                                                        setMunSearch('');
                                                        setMunSuggestions([]);
                                                    }}
                                                    className="px-4 py-2 hover:bg-slate-800 cursor-pointer text-sm text-slate-300 hover:text-white transition-colors border-b border-slate-800 last:border-0"
                                                >
                                                    <span className="font-bold text-blue-400 mr-2">{s.cod_mun}</span>
                                                    {s.name}
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Cod. Mun (CMUN)</label>
                                    <input
                                        type="text"
                                        className="w-full bg-[#0f172a] border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-blue-500 focus:outline-none font-mono"
                                        placeholder="000"
                                        value={newMuni.cod_mun}
                                        onChange={e => setNewMuni({ ...newMuni, cod_mun: e.target.value })}
                                    />
                                </div>
                                <div className="flex flex-col justify-end">
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">DC</label>
                                    <input
                                        type="text"
                                        className="w-full bg-[#0f172a] border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-blue-500 focus:outline-none font-mono"
                                        placeholder="00"
                                        value={newMuni.dc}
                                        onChange={e => setNewMuni({ ...newMuni, dc: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="flex items-end text-xs text-slate-500 pb-1">
                                * Los códigos oficiales ayudan a la ordenación.
                            </div>

                        </div>

                        <div className="flex justify-end gap-3 mt-8">
                            <button
                                onClick={() => setIsAdding(false)}
                                className="px-4 py-2 text-slate-400 hover:text-white font-medium transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleAdd}
                                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-900/20 transition-all active:scale-95"
                            >
                                Crear Punto
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

