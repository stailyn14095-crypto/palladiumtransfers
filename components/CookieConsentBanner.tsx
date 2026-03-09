import React, { useState, useEffect } from 'react';
import { Language } from '../types';

interface CookieConsentBannerProps {
    language: Language;
    onReadMore: () => void;
}

export const CookieConsentBanner: React.FC<CookieConsentBannerProps> = ({ language, onReadMore }) => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const consent = localStorage.getItem('cookie_consent');
        if (!consent) {
            // Slight delay before showing so it feels more natural
            const timer = setTimeout(() => setIsVisible(true), 1500);
            return () => clearTimeout(timer);
        }
    }, []);

    const handleAccept = () => {
        localStorage.setItem('cookie_consent', 'accepted');
        setIsVisible(false);
    };

    const handleReject = () => {
        // According to our policy, we only use essential cookies, but they might still reject it.
        // If they reject, we should still let them use the site but maybe not track anything.
        localStorage.setItem('cookie_consent', 'rejected');
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
                        <p className="text-slate-400 text-xs leading-relaxed max-w-sm">
                            {language === 'es'
                                ? 'Utilizamos cookies técnicas estrictamente necesarias para el correcto funcionamiento del portal. No usamos cookies de rastreo de terceros. Puedes leer más sobre cómo protegemos tu información.'
                                : 'We use strictly necessary technical cookies for the correct operation of the portal. We do not use third-party tracking cookies. Read more about how we protect your information.'
                            }
                        </p>
                    </div>
                </div>
                <div className="flex flex-wrap gap-3 mt-2">
                    <button
                        onClick={handleAccept}
                        className="flex-1 bg-white text-black font-bold text-[10px] uppercase tracking-widest py-3 px-4 rounded-xl hover:bg-slate-200 transition-colors shadow-lg"
                    >
                        {language === 'es' ? 'Aceptar' : 'Accept'}
                    </button>
                    <button
                        onClick={handleReject}
                        className="flex-1 bg-white/5 border border-white/10 text-white font-bold text-[10px] uppercase tracking-widest py-3 px-4 rounded-xl hover:bg-white/10 transition-colors"
                    >
                        {language === 'es' ? 'Rechazar' : 'Reject'}
                    </button>
                    <button
                        onClick={() => {
                            setIsVisible(false);
                            onReadMore();
                        }}
                        className="w-full text-brand-platinum font-bold text-[10px] uppercase tracking-widest py-2 hover:underline transition-colors"
                    >
                        {language === 'es' ? 'Leer Política' : 'Read Policy'}
                    </button>
                </div>
            </div>
        </div>
    );
};
