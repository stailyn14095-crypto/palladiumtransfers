import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';

interface Alias {
  id: number;
  bad_name: string;
  good_name: string;
  created_at?: string;
}

export const AliasDictionaryView: React.FC = () => {
    const [aliases, setAliases] = useState<Alias[]>([]);
    const [loading, setLoading] = useState(false);
    const [badName, setBadName] = useState('');
    const [goodName, setGoodName] = useState('');

    const fetchAliases = async () => {
        setLoading(true);
        const { data, error } = await supabase.from('efectivo_aliases').select('*').order('good_name', { ascending: true });
        if (!error && data) {
            setAliases(data);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchAliases();
    }, []);

    const handleAddAlias = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!badName.trim() || !goodName.trim()) return;

        const normalizedBad = badName.trim().replace(/\s+/g, ' ').toUpperCase();
        const normalizedGood = goodName.trim().replace(/\s+/g, ' ').toUpperCase();

        const { error } = await supabase.from('efectivo_aliases').insert({
            bad_name: normalizedBad,
            good_name: normalizedGood
        });

        if (error) {
            alert('Error al añadir alias: ' + error.message);
        } else {
            setBadName('');
            setGoodName('');
            fetchAliases();
        }
    };

    const handleDeleteAlias = async (id: number) => {
        if (!window.confirm('¿Seguro que deseas eliminar este alias?')) return;
        const { error } = await supabase.from('efectivo_aliases').delete().eq('id', id);
        if (error) {
            alert('Error al eliminar alias: ' + error.message);
        } else {
            fetchAliases();
        }
    };

    return (
        <div className="p-8 h-full flex flex-col pt-24 md:pt-8 bg-[#0a0a0a]">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-8 shrink-0">
                <div>
                    <h1 className="text-4xl font-light tracking-[0.2em] text-white flex items-center gap-4">
                        <span className="material-icons-round text-brand-gold text-4xl">spellcheck</span>
                        DICIONARIO DE ALIAS
                    </h1>
                    <p className="text-brand-platinum/50 uppercase tracking-[0.3em] text-xs font-bold mt-2">
                        Corrección de Nombres para Cuadre de Efectivo
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 flex-1 min-h-0">
                {/* Form */}
                <div className="lg:col-span-1 bg-brand-charcoal rounded-xl border border-white/5 p-6 h-fit shrink-0">
                    <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-6">Añadir Nuevo Alias</h3>
                    <form onSubmit={handleAddAlias} className="space-y-4">
                        <div>
                            <label className="block text-xs text-brand-platinum/50 uppercase tracking-widest font-bold mb-2">
                                Nombre Mal Escrito
                            </label>
                            <input
                                type="text"
                                required
                                value={badName}
                                onChange={(e) => setBadName(e.target.value)}
                                placeholder="Ej: JUAN PERE"
                                className="w-full bg-[#0a0a0a] border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-brand-gold transition-colors text-sm uppercase"
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-brand-platinum/50 uppercase tracking-widest font-bold mb-2">
                                Nombre Correcto / Oficial
                            </label>
                            <input
                                type="text"
                                required
                                value={goodName}
                                onChange={(e) => setGoodName(e.target.value)}
                                placeholder="Ej: JUAN PEREZ"
                                className="w-full bg-[#0a0a0a] border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-brand-gold transition-colors text-sm uppercase"
                            />
                        </div>
                        <button
                            type="submit"
                            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-4 rounded-lg uppercase tracking-widest text-xs transition-colors flex items-center justify-center gap-2 mt-4"
                        >
                            <span className="material-icons-round text-sm">add</span> + Añadir Alias
                        </button>
                    </form>
                </div>

                {/* Table */}
                <div className="lg:col-span-2 bg-brand-charcoal rounded-xl border border-white/5 flex flex-col min-h-0 overflow-hidden">
                    <div className="overflow-x-auto flex-1 custom-scrollbar">
                        <table className="w-full text-left border-collapse min-w-[500px]">
                            <thead className="sticky top-0 bg-brand-charcoal z-10 before:content-[''] before:absolute before:inset-0 before:border-b before:border-white/5">
                                <tr>
                                    <th className="p-4 text-[10px] font-black tracking-[0.2em] text-brand-platinum/50 uppercase border-b border-white/5 whitespace-nowrap">Mal Escrito</th>
                                    <th className="p-4 text-[10px] font-black tracking-[0.2em] text-brand-platinum/50 uppercase border-b border-white/5 whitespace-nowrap">Nombre Oficial</th>
                                    <th className="p-4 text-[10px] font-black tracking-[0.2em] text-brand-platinum/50 uppercase border-b border-white/5 whitespace-nowrap text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {loading ? (
                                    <tr>
                                        <td colSpan={3} className="p-8 text-center text-brand-platinum/50 text-xs tracking-widest font-bold uppercase">
                                            Cargando alias...
                                        </td>
                                    </tr>
                                ) : aliases.length === 0 ? (
                                    <tr>
                                        <td colSpan={3} className="p-8 text-center text-brand-platinum/50 text-xs tracking-widest font-bold uppercase">
                                            No hay alias registrados.
                                        </td>
                                    </tr>
                                ) : (
                                    aliases.map((a) => (
                                        <tr key={a.id} className="hover:bg-white/[0.02] transition-colors group">
                                            <td className="p-4 text-sm font-mono text-red-400">{a.bad_name}</td>
                                            <td className="p-4 text-sm font-mono text-emerald-400">{a.good_name}</td>
                                            <td className="p-4 text-right">
                                                <button
                                                    onClick={() => handleDeleteAlias(a.id)}
                                                    className="text-slate-500 hover:text-red-500 transition-colors p-2 rounded-lg hover:bg-white/5"
                                                    title="Eliminar Alias"
                                                >
                                                    <span className="material-icons-round text-sm">delete</span>
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};
