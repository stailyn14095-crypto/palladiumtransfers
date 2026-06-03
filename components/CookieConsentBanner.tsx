import React, { useState, useEffect } from 'react';
import { Language } from '../types';

interface CookieConsentBannerProps {
    language: Language;
    onReadMore: () => void;
}

export const CookieConsentBanner: React.FC<CookieConsentBannerProps> = ({ language, onReadMore }) => {
    const [isVisible, setIsVisible] = useState(false);
    const [showConfig, setShowConfig] = useState(false);
    const [preferences, setPreferences] = useState({
        necessary: true,
        analytics: false,
        marketing: false
    });

    useEffect(() => {
        const consent = localStorage.getItem('cookie_consent');
        const savedPrefs = localStorage.getItem('cookie_consent_settings');
        if (!consent) {
            const timer = setTimeout(() => setIsVisible(true), 1500);
            return () => clearTimeout(timer);
        } else if (savedPrefs) {
            try {
                setPreferences(JSON.parse(savedPrefs));
            } catch (e) {
                console.error("Error parsing cookie settings:", e);
            }
        }
    }, []);

    const handleAcceptAll = () => {
        const allPrefs = { necessary: true, analytics: true, marketing: true };
        localStorage.setItem('cookie_consent', 'accepted');
        localStorage.setItem('cookie_consent_settings', JSON.stringify(allPrefs));
        setPreferences(allPrefs);
        setIsVisible(false);
    };

    const handleRejectAll = () => {
        const minPrefs = { necessary: true, analytics: false, marketing: false };
        localStorage.setItem('cookie_consent', 'rejected');
        localStorage.setItem('cookie_consent_settings', JSON.stringify(minPrefs));
        setPreferences(minPrefs);
        setIsVisible(false);
    };

    const handleSaveConfig = () => {
        localStorage.setItem('cookie_consent', 'configured');
        localStorage.setItem('cookie_consent_settings', JSON.stringify(preferences));
        setIsVisible(false);
    };

    if (!isVisible) return null;

    return (
        <div className="fixed bottom-0 left-0 right-0 z-[9999] p-4 md:p-6 sm:max-w-xl sm:left-1/2 sm:-translate-x-1/2 animate-in slide-in-from-bottom duration-500">
            <div className="bg-brand-charcoal/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-5 md:p-6 flex flex-col gap-4">
                <div className="flex items-start gap-4">
                    <span className="material-icons-round text-brand-gold text-2xl mt-1">cookie</span>
                    <div className="flex-1">
                        <h3 className="text-white font-bold mb-1 uppercase tracking-widest text-sm">
                            {language === 'es' ? 'Uso de Cookies' : 'Cookie Policy'}
                        </h3>
                        <p className="text-slate-400 text-xs leading-relaxed">
                            {language === 'es'
                                ? 'Utilizamos cookies propias y de terceros para el funcionamiento técnico de la plataforma y la gestión de sesiones. Puede aceptar su uso, rechazarlo o configurar sus preferencias. Las cookies necesarias están siempre activas. Más información en nuestra Política de Cookies.'
                                : 'We use our own and third-party cookies for the technical operation of the platform and session management. You can accept their use, reject it, or configure your preferences. Necessary cookies are always active. More info in our Cookie Policy.'
                            }
                        </p>
                    </div>
                </div>

                {showConfig && (
                    <div className="bg-black/30 rounded-xl p-4 space-y-3 border border-white/5 text-xs text-slate-300">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-bold text-white uppercase tracking-wider text-[10px]">
                                    {language === 'es' ? 'Necesarias / Técnicas' : 'Necessary / Technical'}
                                </p>
                                <p className="text-[10px] text-slate-500">
                                    {language === 'es' ? 'Imprescindibles para el funcionamiento.' : 'Essential for system operations.'}
                                </p>
                            </div>
                            <span className="text-[9px] font-bold uppercase tracking-wider text-brand-gold px-2.5 py-1 bg-brand-gold/10 rounded-full border border-brand-gold/20">
                                {language === 'es' ? 'Siempre activas' : 'Always active'}
                            </span>
                        </div>

                        <div className="flex items-center justify-between border-t border-white/5 pt-3">
                            <div>
                                <p className="font-bold text-white uppercase tracking-wider text-[10px]">
                                    {language === 'es' ? 'Analíticas' : 'Analytics'}
                                </p>
                                <p className="text-[10px] text-slate-500">
                                    {language === 'es' ? 'Miden el tráfico y comportamiento.' : 'Measure traffic and usage patterns.'}
                                </p>
                            </div>
                            <input
                                type="checkbox"
                                checked={preferences.analytics}
                                onChange={(e) => setPreferences(p => ({ ...p, analytics: e.target.checked }))}
                                className="w-4 h-4 rounded border-white/10 bg-white/5 text-brand-gold focus:ring-brand-gold/50 cursor-pointer"
                            />
                        </div>

                        <div className="flex items-center justify-between border-t border-white/5 pt-3">
                            <div>
                                <p className="font-bold text-white uppercase tracking-wider text-[10px]">
                                    {language === 'es' ? 'Publicitarias' : 'Marketing'}
                                </p>
                                <p className="text-[10px] text-slate-500">
                                    {language === 'es' ? 'Publicidad personalizada.' : 'Personalized advertisements.'}
                                </p>
                            </div>
                            <input
                                type="checkbox"
                                checked={preferences.marketing}
                                onChange={(e) => setPreferences(p => ({ ...p, marketing: e.target.checked }))}
                                className="w-4 h-4 rounded border-white/10 bg-white/5 text-brand-gold focus:ring-brand-gold/50 cursor-pointer"
                            />
                        </div>

                        <button
                            onClick={handleSaveConfig}
                            className="w-full bg-brand-gold hover:bg-[#B3932F] text-brand-black font-bold text-[10px] uppercase tracking-widest py-3 rounded-xl transition-colors mt-2"
                        >
                            {language === 'es' ? 'Guardar Configuración' : 'Save Settings'}
                        </button>
                    </div>
                )}

                <div className="flex flex-col gap-2.5 mt-2">
                    <div className="flex gap-3">
                        <button
                            onClick={handleAcceptAll}
                            className="flex-1 bg-white/5 border border-white/10 text-white font-bold text-[10px] uppercase tracking-widest py-3.5 px-4 rounded-xl hover:bg-white/10 transition-colors cursor-pointer text-center"
                        >
                            {language === 'es' ? 'Aceptar Todas' : 'Accept All'}
                        </button>
                        <button
                            onClick={handleRejectAll}
                            className="flex-1 bg-white/5 border border-white/10 text-white font-bold text-[10px] uppercase tracking-widest py-3.5 px-4 rounded-xl hover:bg-white/10 transition-colors cursor-pointer text-center"
                        >
                            {language === 'es' ? 'Rechazar' : 'Reject'}
                        </button>
                        <button
                            onClick={() => setShowConfig(!showConfig)}
                            className="flex-1 bg-white/5 border border-white/10 text-white font-bold text-[10px] uppercase tracking-widest py-3.5 px-4 rounded-xl hover:bg-white/10 transition-colors cursor-pointer text-center"
                        >
                            {language === 'es' ? 'Configurar' : 'Configure'}
                        </button>
                    </div>
                    <button
                        onClick={onReadMore}
                        className="w-full text-brand-platinum font-bold text-[9px] uppercase tracking-[0.2em] py-2 hover:underline transition-colors cursor-pointer"
                    >
                        {language === 'es' ? 'Más información en nuestra Política de Cookies' : 'More info in our Cookie Policy'}
                    </button>
                </div>
            </div>
        </div>
    );
};
