import React, { useState } from 'react';
import { useSupabaseData } from '../hooks/useSupabaseData';
import { supabase } from '../services/supabase';

export const ConfiguracionView = () => {
    const { data: settings, loading, updateItem } = useSupabaseData('system_settings');
    const [localSettings, setLocalSettings] = useState<any>({});
    const [saving, setSaving] = useState(false);

    // Password Update State
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordLoading, setPasswordLoading] = useState(false);
    const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

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
        } else {
            // If the setting doesn't exist in the DB yet, insert it.
            await supabase.from('system_settings').insert({
                key,
                value,
                description: 'Añadido desde Configuración'
            });
            // We could refresh but useSupabaseData uses a realtime sub usually or we can just let it be
        }
        setSaving(false);
    };

    const handleChange = (key: string, value: string) => {
        setLocalSettings({ ...localSettings, [key]: value });
    };

    const handleUpdatePassword = async () => {
        setPasswordMessage(null);
        if (!newPassword || newPassword.length < 6) {
            setPasswordMessage({ type: 'error', text: 'La contraseña debe tener al menos 6 caracteres.' });
            return;
        }
        if (newPassword !== confirmPassword) {
            setPasswordMessage({ type: 'error', text: 'Las contraseñas no coinciden.' });
            return;
        }

        setPasswordLoading(true);
        try {
            const { error } = await supabase.auth.updateUser({ password: newPassword });
            if (error) throw error;
            setPasswordMessage({ type: 'success', text: 'Contraseña actualizada correctamente.' });
            setNewPassword('');
            setConfirmPassword('');
        } catch (error: any) {
            setPasswordMessage({ type: 'error', text: error.message || 'Error al actualizar la contraseña.' });
        } finally {
            setPasswordLoading(false);
        }
    };

    return (
        <div className="flex-1 flex flex-col h-full bg-brand-black overflow-hidden relative">
            <header className="min-h-[5rem] border-b border-white/5 bg-brand-charcoal px-4 md:px-8 py-4 md:py-0 flex items-center justify-between shrink-0">
                <div>
                    <h1 className="text-xl font-bold text-white tracking-tight">Ajustes Generales</h1>
                    <p className="text-[10px] text-brand-platinum/50 uppercase font-bold tracking-widest">General Settings & Preferences</p>
                </div>
            </header>
            <div className="p-4 md:p-8 overflow-y-auto custom-scrollbar">
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
                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Email del Remitente</label>
                                    <input
                                        type="email"
                                        value={localSettings.email_sender || ''}
                                        onChange={(e) => handleChange('email_sender', e.target.value)}
                                        onBlur={(e) => handleSave('email_sender', e.target.value)}
                                        className="w-full bg-black/40 border border-white/5 rounded-2xl px-5 py-4 text-white focus:ring-1 focus:ring-brand-platinum/50 outline-none transition-all"
                                        placeholder="noreply@palladiumtransfers.com"
                                    />
                                    <p className="text-[10px] text-amber-500/80 italic mt-1 ml-1 font-medium">Nota: Para asegurar la entrega, este correo DEBE ser de tu dominio verificado (ej. reservas@palladiumtransfers.com). <strong className="font-bold">NO uses @gmail.com</strong> aquí o el proveedor (Resend) bloqueará los envíos.</p>
                                    <p className="text-[10px] text-slate-600 italic mt-1 ml-1">Dirección de correo para notificaciones automáticas</p>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Email de Notificaciones Admin</label>
                                    <input
                                        type="email"
                                        value={localSettings.admin_notification_email || ''}
                                        onChange={(e) => handleChange('admin_notification_email', e.target.value)}
                                        onBlur={(e) => handleSave('admin_notification_email', e.target.value)}
                                        className="w-full bg-black/40 border border-white/5 rounded-2xl px-5 py-4 text-white focus:ring-1 focus:ring-brand-platinum/50 outline-none transition-all"
                                        placeholder="admin@palladiumtransfers.com"
                                    />
                                    <p className="text-[10px] text-slate-600 italic mt-1 ml-1">A este correo se enviará una copia oculta (BCC) de todas las confirmaciones de reserva. (Sí puede ser @gmail.com)</p>
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
                                <div>
                                    <label className="block text-[10px] font-bold text-brand-platinum/50 uppercase mb-2 tracking-widest">NIF / CIF</label>
                                    <input
                                        type="text"
                                        value={localSettings.company_nif || ''}
                                        onChange={(e) => handleChange('company_nif', e.target.value)}
                                        onBlur={(e) => handleSave('company_nif', e.target.value)}
                                        className="w-full bg-brand-black border border-white/5 rounded-xl px-4 py-3 text-sm text-brand-platinum/70 focus:outline-none focus:border-brand-gold transition-colors"
                                        placeholder="B12345678"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-brand-platinum/50 uppercase mb-2 tracking-widest">Domicilio Social</label>
                                    <input
                                        type="text"
                                        value={localSettings.company_address || ''}
                                        onChange={(e) => handleChange('company_address', e.target.value)}
                                        onBlur={(e) => handleSave('company_address', e.target.value)}
                                        className="w-full bg-brand-black border border-white/5 rounded-xl px-4 py-3 text-sm text-brand-platinum/70 focus:outline-none focus:border-brand-gold transition-colors"
                                        placeholder="Calle Ejemplo 1, 28000 Madrid"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-brand-platinum/50 uppercase mb-2 tracking-widest">Multiplicador Reserva Ida y Vuelta</label>
                                <input
                                    type="number"
                                    step="0.1"
                                    value={localSettings.round_trip_multiplier || '1.8'}
                                    onChange={(e) => handleChange('round_trip_multiplier', e.target.value)}
                                    onBlur={(e) => handleSave('round_trip_multiplier', e.target.value)}
                                    className="w-full bg-brand-black border border-white/5 rounded-xl px-4 py-3 text-sm text-brand-platinum/70 focus:outline-none focus:border-brand-gold transition-colors"
                                    placeholder="Ej: 1.8 (10% Dto), 2.0 (Sin Dto)"
                                />
                                <p className="text-[10px] text-brand-platinum/30 mt-2 italic">Multiplicador que se aplicará al precio base de la ida para calcular el total de la reserva de ida y vuelta. Por defecto 1.8 (lo que equivale a un 10% de descuento).</p>
                            </div>
                        </div>

                        {/* Account Security Settings */}
                        <div className="bg-brand-charcoal border border-white/5 rounded-2xl p-6 shadow-xl relative overflow-hidden group">
                            <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                                <span className="material-icons-round text-brand-gold">lock</span>
                                Seguridad de la Cuenta
                            </h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-[10px] font-bold text-brand-platinum/50 uppercase mb-2 tracking-widest">Nueva Contraseña</label>
                                    <input
                                        type="password"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        className="w-full bg-brand-black border border-white/5 rounded-xl px-4 py-3 text-sm text-brand-platinum/70 focus:outline-none focus:border-brand-gold transition-colors"
                                        placeholder="••••••••"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-brand-platinum/50 uppercase mb-2 tracking-widest">Confirmar Contraseña</label>
                                    <input
                                        type="password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="w-full bg-brand-black border border-white/5 rounded-xl px-4 py-3 text-sm text-brand-platinum/70 focus:outline-none focus:border-brand-gold transition-colors"
                                        placeholder="••••••••"
                                    />
                                </div>

                                {passwordMessage && (
                                    <div className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${passwordMessage.type === 'error' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}`}>
                                        <span className="material-icons-round text-sm">{passwordMessage.type === 'error' ? 'error' : 'check_circle'}</span>
                                        {passwordMessage.text}
                                    </div>
                                )}

                                <button
                                    onClick={handleUpdatePassword}
                                    disabled={passwordLoading || !newPassword || !confirmPassword}
                                    className="bg-brand-gold hover:bg-[#B3932F] text-brand-black font-bold py-3 px-6 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 mt-2"
                                >
                                    {passwordLoading ? (
                                        <span className="w-4 h-4 border-2 border-brand-black/30 border-t-brand-black rounded-full animate-spin"></span>
                                    ) : (
                                        <span className="material-icons-round text-sm">save</span>
                                    )}
                                    Actualizar Contraseña
                                </button>
                            </div>
                        </div>

                        {saving && (
                            <div className="text-[10px] font-bold uppercase tracking-widest text-brand-gold flex items-center gap-2 mt-4">
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
