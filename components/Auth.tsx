import React, { useState } from 'react';
import { supabase } from '../services/supabase';
import { Logo } from './ui/Logo';
import { Language } from '../types';

export const Auth: React.FC<{ language?: Language }> = ({ language = 'es' }) => {
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [phone, setPhone] = useState('');
    const [isLogin, setIsLogin] = useState(true);
    const [isResetting, setIsResetting] = useState(false);
    const [recoveryMode, setRecoveryMode] = useState(false);
    const [message, setMessage] = useState<{ type: 'error' | 'success', text: string } | null>(null);

    const t = (key: string) => {
        const dict: Record<string, { es: string; en: string }> = {
            title: { es: 'PALLADIUM TRANSFERS', en: 'PALLADIUM TRANSFERS' },
            hub: { es: 'Operations Hub', en: 'Operations Hub' },
            login_title: { es: 'Acceder al Panel', en: 'Log in to Portal' },
            register_title: { es: 'Crear mi Cuenta', en: 'Create my Account' },
            reset_title: { es: 'Recuperar Contraseña', en: 'Reset Password' },
            update_title: { es: 'Actualizar Contraseña', en: 'Update Password' },
            full_name: { es: 'Nombre Completo', en: 'Full Name' },
            phone_label: { es: 'Teléfono', en: 'Phone' },
            email_label: { es: 'Email', en: 'Email' },
            password_label: { es: 'Contraseña', en: 'Password' },
            new_password_label: { es: 'Nueva Contraseña', en: 'New Password' },
            forgot_password: { es: '¿Olvidaste tu contraseña?', en: 'Forgot your password?' },
            login_btn: { es: 'Acceder al Panel', en: 'Log in to Portal' },
            register_btn: { es: 'Crear mi Cuenta', en: 'Create Account' },
            reset_btn: { es: 'Enviar enlace de recuperación', en: 'Send recovery link' },
            update_btn: { es: 'Actualizar Contraseña', en: 'Update Password' },
            or_continue: { es: 'o continuar con', en: 'or continue with' },
            google_acc: { es: 'Cuenta de Google', en: 'Google Account' },
            back_to_login: { es: 'Volver al inicio de sesión', en: 'Back to login' },
            new_to_palladium: { es: '¿Nuevo en Palladium? Regístrate', en: 'New to Palladium? Register' },
            already_member: { es: '¿Ya eres miembro? Inicia sesión', en: 'Already a member? Log in' },
            recovery_msg: { es: 'Por favor ingresa tu nueva contraseña.', en: 'Please enter your new password.' },
            reset_success: { es: 'Se ha enviado un enlace para restablecer tu contraseña a tu email.', en: 'A password reset link has been sent to your email.' },
            update_success: { es: 'Tu contraseña ha sido actualizada. Ingresando...', en: 'Your password has been updated. Logging in...' },
            register_success: { es: '¡Registro exitoso! Por favor verifica tu bandeja de entrada para confirmar tu email.', en: 'Registration successful! Please check your inbox to confirm your email.' },
        };
        return dict[key]?.[language] || key;
    };

    React.useEffect(() => {
        // Parse Hash for errors (e.g. from expired links)
        const hashParams = new URLSearchParams(window.location.hash.replace('#', '?'));
        const errorDesc = hashParams.get('error_description');
        if (errorDesc) {
            setMessage({ type: 'error', text: decodeURIComponent(errorDesc).replace(/\+/g, ' ') });
            window.history.replaceState(null, '', window.location.pathname);
        }

        const { data: authListener } = supabase.auth.onAuthStateChange(async (event) => {
            if (event === 'PASSWORD_RECOVERY') {
                setRecoveryMode(true);
                setIsResetting(false);
                setIsLogin(false);
                setMessage({ type: 'success', text: t('recovery_msg') });
            }
        });
        return () => {
            authListener.subscription.unsubscribe();
        };
    }, []);

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);

        try {
            if (recoveryMode) {
                const { error } = await supabase.auth.updateUser({ password });
                if (error) throw error;
                setMessage({ type: 'success', text: t('update_success') });
                setRecoveryMode(false);
                setIsLogin(true);
            } else if (isResetting) {
                const { error } = await supabase.auth.resetPasswordForEmail(email, {
                    redirectTo: `${window.location.origin}`,
                });
                if (error) throw error;
                setMessage({ type: 'success', text: t('reset_success') });
            } else if (isLogin) {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (error) throw error;
            } else {
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        emailRedirectTo: `${window.location.origin}`,
                        data: {
                            full_name: fullName,
                            phone: phone,
                        }
                    }
                });
                if (error) throw error;
                setMessage({ type: 'success', text: t('register_success') });
            }
        } catch (error: any) {
            setMessage({ type: 'error', text: error.message });
        } finally {
            setLoading(false);
        }
    };


    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-brand-black text-white p-6 relative overflow-hidden">
            {/* Ambient Background */}
            <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-brand-gold/5 rounded-full blur-[120px] pointer-events-none"></div>
            <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-brand-platinum/5 rounded-full blur-[120px] pointer-events-none"></div>

            <div className={`w-full max-w-md transition-all duration-700 ${loading ? 'opacity-50 scale-95' : 'opacity-100 scale-100'}`}>
                <div className="bg-brand-charcoal/80 backdrop-blur-2xl rounded-[2.5rem] shadow-2xl p-10 border border-white/10 relative z-10">
                    <div className="text-center mb-10">
                        <div className="mx-auto mb-6 flex justify-center">
                            <Logo variant="icon" className="w-16 h-16" color="#D4AF37" />
                        </div>
                        <h1 className="text-3xl font-black tracking-tight text-white uppercase tracking-[0.2em] mb-1">
                            {t('title')}
                        </h1>
                        <p className="text-brand-gold text-[10px] font-bold uppercase tracking-[0.4em]">{t('hub')}</p>
                    </div>

                    {message && (
                        <div className={`p-4 rounded-2xl mb-6 text-xs font-bold flex items-center gap-3 animate-in fade-in zoom-in duration-300 ${message.type === 'error'
                            ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                            : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            }`}>
                            <span className="material-icons-round text-sm">{message.type === 'error' ? 'report' : 'check_circle'}</span>
                            {message.text}
                        </div>
                    )}

                    <form onSubmit={handleAuth} className="space-y-4">
                        {!isLogin && !isResetting && !recoveryMode && (
                            <>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">{t('full_name')}</label>
                                    <div className="relative">
                                        <span className="material-icons-round absolute left-4 top-3.5 text-slate-500 text-lg">person</span>
                                        <input
                                            type="text"
                                            required
                                            value={fullName}
                                            onChange={(e) => setFullName(e.target.value)}
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-3.5 text-white placeholder-brand-platinum/50 focus:outline-none focus:ring-2 focus:ring-brand-gold/50 focus:bg-white/10 transition-all font-medium"
                                            placeholder="Juan Pérez"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">{t('phone_label')}</label>
                                    <div className="relative">
                                        <span className="material-icons-round absolute left-4 top-3.5 text-slate-500 text-lg">phone</span>
                                        <input
                                            type="tel"
                                            required
                                            value={phone}
                                            onChange={(e) => setPhone(e.target.value)}
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-3.5 text-white placeholder-brand-platinum/50 focus:outline-none focus:ring-2 focus:ring-brand-gold/50 focus:bg-white/10 transition-all font-medium"
                                            placeholder="+34 600 000 000"
                                        />
                                    </div>
                                </div>
                            </>
                        )}

                        {!recoveryMode && (
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">{t('email_label')}</label>
                                <div className="relative">
                                    <span className="material-icons-round absolute left-4 top-3.5 text-slate-500 text-lg">alternate_email</span>
                                    <input
                                        type="email"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-3.5 text-white placeholder-brand-platinum/50 focus:outline-none focus:ring-2 focus:ring-brand-gold/50 focus:bg-white/10 transition-all font-medium"
                                        placeholder="nombre@ejemplo.com"
                                    />
                                </div>
                            </div>
                        )}

                        {(!isResetting || recoveryMode) && (
                            <div className="space-y-1">
                                <div className="flex justify-between items-center">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">{recoveryMode ? t('new_password_label') : t('password_label')}</label>
                                    {isLogin && !recoveryMode && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setIsResetting(true);
                                                setMessage(null);
                                            }}
                                            className="text-[10px] font-bold text-brand-gold hover:text-[#B3932F] transition-colors uppercase tracking-wider"
                                        >
                                            {t('forgot_password')}
                                        </button>
                                    )}
                                </div>
                                <div className="relative">
                                    <span className="material-icons-round absolute left-4 top-3.5 text-slate-500 text-lg">lock</span>
                                    <input
                                        type="password"
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-3.5 text-white placeholder-brand-platinum/50 focus:outline-none focus:ring-2 focus:ring-brand-gold/50 focus:bg-white/10 transition-all font-medium"
                                        placeholder="••••••••"
                                    />
                                </div>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-brand-gold hover:bg-[#B3932F] text-brand-black font-bold py-4 rounded-2xl shadow-xl shadow-brand-gold/10 mt-4 transition-all transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                            ) : (
                                <>
                                    <span>{recoveryMode ? t('update_btn') : isResetting ? t('reset_btn') : isLogin ? t('login_btn') : t('register_btn')}</span>
                                    <span className="material-icons-round">{recoveryMode ? 'save' : isResetting ? 'send' : isLogin ? 'login' : 'person_add'}</span>
                                </>
                            )}
                        </button>
                    </form>


                    <div className="mt-8 text-center flex flex-col gap-3">
                        {isResetting && (
                            <button
                                onClick={() => {
                                    setIsResetting(false);
                                    setMessage(null);
                                }}
                                className="text-xs font-bold text-slate-500 hover:text-white underline-offset-4 hover:underline transition-all uppercase tracking-widest"
                            >
                                {t('back_to_login')}
                            </button>
                        )}
                        {!isResetting && !recoveryMode && (
                            <button
                                onClick={() => {
                                    setIsLogin(!isLogin);
                                    setMessage(null);
                                }}
                                className="text-xs font-bold text-slate-500 hover:text-white underline-offset-4 hover:underline transition-all uppercase tracking-widest"
                            >
                                {isLogin ? t('new_to_palladium') : t('already_member')}
                            </button>
                        )}
                    </div>
                </div>

                <div className="mt-12 text-center text-[10px] text-brand-platinum/50 font-bold uppercase tracking-[0.2em]">
                    Premium Fleet Management System &copy; 2024
                </div>
            </div>
        </div>
    );
};
