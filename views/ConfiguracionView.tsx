import React, { useState } from 'react';
import { useSupabaseData } from '../hooks/useSupabaseData';

export const ConfiguracionView = () => {
    const { data: settings, loading, updateItem } = useSupabaseData('system_settings');
    const [localSettings, setLocalSettings] = useState<any>({});
    const [saving, setSaving] = useState(false);

    React.useEffect(() => {
        if (settings) {
            const settingsMap: any = {};
            settings.forEach((s: any) => {
                settingsMap[s.key] = s.value;
            });
            setLocalSettings(settingsMap);
        }
    }, [settings]);

    const handleSave = async (key: string, value: string) => {
        setSaving(true);
        const setting = settings?.find((s: any) => s.key === key);
        if (setting) {
            await updateItem(setting.id, { value, updated_at: new Date().toISOString() });
        }
        setSaving(false);
    };

    const handleChange = (key: string, value: string) => {
        setLocalSettings({ ...localSettings, [key]: value });
    };

    return (
        <div className="flex-1 flex flex-col h-full bg-brand-black overflow-hidden relative">
            <header className="h-20 border-b border-white/5 bg-brand-charcoal px-8 flex items-center justify-between shrink-0">
                <div>
                    <h1 className="text-xl font-bold text-white tracking-tight">Ajustes Generales</h1>
                    <p className="text-[10px] text-brand-platinum/50 uppercase font-bold tracking-widest">General Settings & Preferences</p>
                </div>
            </header>
            <div className="p-8 overflow-y-auto custom-scrollbar">
                {loading ? (
                    <div className="p-20 text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-gold mx-auto mb-4"></div>
                        <p className="text-brand-platinum/50 uppercase tracking-widest text-[10px] font-bold">Cargando configuración...</p>
                    </div>
                ) : (
                    <div className="max-w-2xl space-y-6">
                        {/* Email Settings */}
                        <div className="bg-brand-charcoal border border-white/5 rounded-2xl p-6 shadow-xl relative overflow-hidden group">
                            <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                                <span className="material-icons-round text-brand-gold">email</span>
                                Configuración de Email
                            </h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-[10px] font-bold text-brand-platinum/50 uppercase mb-2 tracking-widest">Email del Remitente</label>
                                    <input
                                        type="email"
                                        value={localSettings.email_sender || ''}
                                        onChange={(e) => handleChange('email_sender', e.target.value)}
                                        onBlur={(e) => handleSave('email_sender', e.target.value)}
                                        className="w-full bg-brand-black border border-white/5 rounded-xl px-4 py-3 text-sm text-brand-platinum/70 focus:outline-none focus:border-brand-gold transition-colors"
                                        placeholder="noreply@palladiumtransfers.com"
                                    />
                                    <p className="text-[10px] text-brand-platinum/30 mt-2 italic">Dirección de correo para notificaciones automáticas</p>
                                </div>
                            </div>
                        </div>

                        {/* Branding Settings */}
                        <div className="bg-brand-charcoal border border-white/5 rounded-2xl p-6 shadow-xl relative overflow-hidden group">
                            <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                                <span className="material-icons-round text-brand-gold">palette</span>
                                Imagen Corporativa
                            </h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-[10px] font-bold text-brand-platinum/50 uppercase mb-2 tracking-widest">Logo Icono (Metallic P)</label>
                                    <input
                                        type="text"
                                        value={localSettings.logo_icon || ''}
                                        onChange={(e) => handleChange('logo_icon', e.target.value)}
                                        onBlur={(e) => handleSave('logo_icon', e.target.value)}
                                        className="w-full bg-brand-black border border-white/5 rounded-xl px-4 py-3 text-sm text-brand-platinum/70 focus:outline-none focus:border-brand-gold transition-colors"
                                        placeholder="URL de la imagen del icono"
                                    />
                                    {localSettings.logo_icon && (
                                        <div className="mt-2 p-2 bg-slate-900/50 rounded-lg border border-white/5 inline-block">
                                            <img src={localSettings.logo_icon} alt="Preview Icon" className="h-10 w-auto" />
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-brand-platinum/50 uppercase mb-2 tracking-widest">Logo Completo (Wordmark)</label>
                                    <input
                                        type="text"
                                        value={localSettings.logo_full || ''}
                                        onChange={(e) => handleChange('logo_full', e.target.value)}
                                        onBlur={(e) => handleSave('logo_full', e.target.value)}
                                        className="w-full bg-brand-black border border-white/5 rounded-xl px-4 py-3 text-sm text-brand-platinum/70 focus:outline-none focus:border-brand-gold transition-colors"
                                        placeholder="URL de la imagen del logo completo"
                                    />
                                    {localSettings.logo_full && (
                                        <div className="mt-2 p-2 bg-slate-900/50 rounded-lg border border-white/5 inline-block">
                                            <img src={localSettings.logo_full} alt="Preview Full" className="h-10 w-auto" />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* General Settings */}
                        <div className="bg-brand-charcoal border border-white/5 rounded-2xl p-6 shadow-xl relative overflow-hidden group">
                            <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                                <span className="material-icons-round text-brand-gold">business</span>
                                Información General
                            </h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-[10px] font-bold text-brand-platinum/50 uppercase mb-2 tracking-widest">Nombre de la Empresa</label>
                                    <input
                                        type="text"
                                        value={localSettings.company_name || ''}
                                        onChange={(e) => handleChange('company_name', e.target.value)}
                                        onBlur={(e) => handleSave('company_name', e.target.value)}
                                        className="w-full bg-brand-black border border-white/5 rounded-xl px-4 py-3 text-sm text-brand-platinum/70 focus:outline-none focus:border-brand-gold transition-colors"
                                        placeholder="Palladium Transfers S.L."
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-brand-platinum/50 uppercase mb-2 tracking-widest">Teléfono de Soporte</label>
                                    <input
                                        type="tel"
                                        value={localSettings.support_phone || ''}
                                        onChange={(e) => handleChange('support_phone', e.target.value)}
                                        onBlur={(e) => handleSave('support_phone', e.target.value)}
                                        className="w-full bg-brand-black border border-white/5 rounded-xl px-4 py-3 text-sm text-brand-platinum/70 focus:outline-none focus:border-brand-gold transition-colors"
                                        placeholder="+34 600 000 000"
                                    />
                                </div>
                            </div>
                        </div>

                        {saving && (
                            <div className="text-[10px] font-bold uppercase tracking-widest text-brand-gold flex items-center gap-2">
                                <span className="material-icons-round animate-spin text-sm">sync</span>
                                Guardando cambios...
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
