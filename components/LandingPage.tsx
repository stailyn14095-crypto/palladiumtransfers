import React, { useState, useEffect } from 'react';
import { BookingForm } from './BookingForm';
import { Language } from '../types';
import { supabase } from '../services/supabase';
import { Session } from '@supabase/supabase-js';
import { Logo } from './ui/Logo';
import { LegalModals } from './LegalModals';

interface LandingPageProps {
    onEnterApp: () => void;
    session?: Session | null;
    language: Language;
    setLanguage: (lang: Language) => void;
}

const translations = {
    es: {
        excellence: 'Excelencia',
        fleet: 'Flota VIP',
        book: 'Reservar',
        login: 'Registrarse / Login',
        portal: 'Mi Portal',
        premium_service: 'Servicio Premium de Traslados',
        hero_title: 'Viaje con ',
        hero_distinction: 'Distinción.',
        hero_desc: 'Elevamos los estándares de transporte privado. Reservas inmediatas con tarifas fijas y conductores profesionales.',
        google_rating: 'Google Rating',
        availability: 'Disponibilidad',
        vip_guarantee: 'Garantía VIP',
        why_palladium: 'Por qué elegir Palladium',
        commitment_excellence: 'Compromiso con la Excelencia.',
        fleet_title: 'Nuestra Flota Profesional.',
        fleet_desc: 'Vehículos modernos, limpios y confortables para asegurar un viaje seguro y puntual.',
        testimonials_title: 'La Voz de Nuestros Clientes.',
        trust: 'Confianza',
        legal: 'Aviso Legal',
        privacy: 'Privacidad',
        cookies: 'Cookies',
        footer_text: 'Excellence in Motion',
        sector_aspects: [
            {
                icon: 'verified_user',
                title: 'Seguridad Certificada',
                desc: 'Conductores con licencias VTC profesionales y formación continua en seguridad vial.'
            },
            {
                icon: 'schedule',
                title: 'Puntualidad Absoluta',
                desc: 'Monitorización de vuelos en tiempo real para esperas sin costes adicionales.'
            },
            {
                icon: 'auto_awesome',
                title: 'Flota de Lujo',
                desc: 'Vehículos Mercedes-Benz Clase S y Clase V mantenidos bajo estándares VIP.'
            },
            {
                icon: 'payments',
                title: 'Precios Cerrados',
                desc: 'Tarifas transparentes sin sorpresas. Sabrá el coste antes de realizar su reserva.'
            }
        ]
    },
    en: {
        excellence: 'Excellence',
        fleet: 'VIP Fleet',
        book: 'Book Now',
        login: 'Register / Login',
        portal: 'My Portal',
        premium_service: 'Premium Transfer Service',
        hero_title: 'Travel with ',
        hero_distinction: 'Distinction.',
        hero_desc: 'We elevate the standards of private transport. Immediate bookings with fixed rates and professional drivers.',
        google_rating: 'Google Rating',
        availability: 'Availability',
        vip_guarantee: 'VIP Guarantee',
        why_palladium: 'Why Choose Palladium',
        commitment_excellence: 'Commitment to Excellence.',
        fleet_title: 'Our Professional Fleet.',
        fleet_desc: 'Modern, clean, and comfortable vehicles to ensure a safe and timely journey.',
        testimonials_title: 'Our Clients Voice.',
        trust: 'Trust',
        legal: 'Legal Notice',
        privacy: 'Privacy',
        cookies: 'Cookies',
        footer_text: 'Excellence in Motion',
        sector_aspects: [
            {
                icon: 'verified_user',
                title: 'Certified Safety',
                desc: 'Drivers with professional VTC licenses and continuous safety training.'
            },
            {
                icon: 'schedule',
                title: 'Absolute Punctuality',
                desc: 'Real-time flight monitoring for waits without additional costs.'
            },
            {
                icon: 'auto_awesome',
                title: 'Luxury Fleet',
                desc: 'Mercedes-Benz S-Class and V-Class vehicles maintained under VIP standards.'
            },
            {
                icon: 'payments',
                title: 'Fixed Prices',
                desc: 'Transparent rates without surprises. You will know the cost before booking.'
            }
        ]
    }
};

export const LandingPage: React.FC<LandingPageProps> = ({ onEnterApp, session, language, setLanguage }) => {
    const [isVisible, setIsVisible] = useState(false);
    const [vehicles, setVehicles] = useState<any[]>([]);
    const [bookingStep, setBookingStep] = useState(1);
    const [activeModal, setActiveModal] = useState<'legal' | 'privacy' | 'cookies' | 'terms' | null>(null);

    const [loading, setLoading] = useState(true);
    const [branding, setBranding] = useState<{ logo_icon?: string; logo_full?: string }>({});

    useEffect(() => {
        setIsVisible(true);
        fetchVehicles();
        fetchBranding();
    }, []);

    async function fetchBranding() {
        const { data } = await supabase.from('system_settings').select('key, value').in('key', ['logo_icon', 'logo_full']);
        if (data) {
            const b: any = {};
            data.forEach(s => b[s.key] = s.value);
            setBranding(b);
        }
    }

    async function fetchVehicles() {
        const { data } = await supabase.from('vehicles').select('*').order('created_at', { ascending: true });
        if (data) setVehicles(data);
        setLoading(false);
    }

    const scrollToSection = (e: React.MouseEvent, targetId: string) => {
        e.preventDefault();
        setBookingStep(1); // Set step back to 1 to show the home sections
        setTimeout(() => {
            const el = document.getElementById(targetId);
            if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }, 100); // Give React time to render the hidden elements
    };

    const t = translations[language];

    return (
        <div className="min-h-screen bg-brand-black text-brand-white overflow-x-hidden selection:bg-brand-platinum/30 font-sans">
            {/* Background Effects */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-5%] w-[50%] h-[50%] bg-brand-platinum/5 rounded-full blur-[120px] animate-pulse"></div>
                <div className="absolute bottom-[-10%] right-[-5%] w-[50%] h-[50%] bg-brand-gold/5 rounded-full blur-[120px] animate-pulse delay-1000"></div>
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.02]"></div>
            </div>

            {/* Navbar */}
            <nav className={`fixed top-0 left-0 right-0 z-[100] bg-brand-black/80 backdrop-blur-xl border-b border-white/5 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-10'}`}>
                <div className="container mx-auto px-8 py-5 flex justify-between items-center">
                    <div className="flex items-center gap-4 group cursor-pointer" onClick={(e) => scrollToSection(e, 'reservar')}>
                        <Logo variant="icon" className="w-12 h-12 brightness-200 group-hover:scale-105 transition-all duration-500" color="white" />
                        <div className="hidden sm:block">
                            <div className="flex flex-col items-start">
                                <span className="font-light text-xl tracking-[0.3em] block leading-none text-white">PALLADIUM TRANSFERS</span>
                                <span className="text-[8px] text-brand-platinum font-bold uppercase tracking-[0.5em] mt-1 italic">Excellence in Motion</span>
                            </div>
                        </div>
                    </div>

                    <div className="hidden lg:flex gap-10 items-center text-[10px] font-bold uppercase tracking-[0.3em] text-slate-500">
                        <a href="#sector" onClick={(e) => scrollToSection(e, 'sector')} className="hover:text-white transition-colors uppercase cursor-pointer">{t.excellence}</a>
                        <a href="#flota" onClick={(e) => scrollToSection(e, 'flota')} className="hover:text-white transition-colors uppercase cursor-pointer">{t.fleet}</a>
                        <a href="#reservar" onClick={(e) => scrollToSection(e, 'reservar')} className="text-white border border-white/10 px-6 py-2 rounded-full hover:bg-white hover:text-black transition-all uppercase cursor-pointer">{t.book}</a>
                    </div>

                    <div className="flex gap-4 items-center">
                        <div className="flex bg-white/5 p-1 rounded-full border border-white/10 shadow-inner">
                            <button onClick={() => setLanguage('es')} className={`px-3 py-1 text-[9px] font-bold rounded-full transition-all ${language === 'es' ? 'bg-white text-black shadow-lg' : 'text-slate-500 hover:text-white'}`}>ES</button>
                            <button onClick={() => setLanguage('en')} className={`px-3 py-1 text-[9px] font-bold rounded-full transition-all ${language === 'en' ? 'bg-white text-black shadow-lg' : 'text-slate-500 hover:text-white'}`}>EN</button>
                        </div>
                        <button
                            onClick={onEnterApp}
                            className={`px-6 py-2.5 text-[10px] font-bold uppercase tracking-widest ${session ? 'bg-brand-charcoal border border-white/10 hover:bg-brand-platinum hover:text-black' : 'bg-white text-black hover:bg-slate-200'} rounded-full transition-all shadow-xl`}
                        >
                            {session ? t.portal : t.login}
                        </button>
                    </div>
                </div>
            </nav>

            {/* Hero & Booking Form */}
            <main id="reservar" className={`relative z-10 container mx-auto px-6 pt-40 pb-32 flex flex-col xl:flex-row items-center gap-20 min-h-screen ${bookingStep > 1 ? 'justify-center' : 'justify-between'}`}>
                {bookingStep === 1 && (
                    <div className={`flex-1 space-y-12 transition-all duration-1000 delay-300 ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-10'}`}>
                        <div className="inline-flex items-center gap-3 px-5 py-2 rounded-full bg-white/5 border border-white/10 text-brand-platinum text-[9px] font-bold uppercase tracking-[0.4em]">
                            <div className="w-1.5 h-1.5 rounded-full bg-brand-platinum animate-pulse"></div>
                            {t.premium_service}
                        </div>
                        <h1 className="text-7xl lg:text-9xl font-light leading-[0.85] tracking-tighter text-white">
                            {t.hero_title} <br />
                            <span className="platinum-text font-black">
                                {t.hero_distinction}
                            </span>
                        </h1>
                        <p className="text-lg text-slate-400 max-w-lg leading-relaxed font-light">
                            {t.hero_desc}
                        </p>

                        <div className="flex flex-wrap gap-12 pt-6">
                            <div className="flex flex-col">
                                <span className="text-5xl font-light text-white leading-none">5.0</span>
                                <span className="text-[9px] font-bold text-brand-platinum uppercase tracking-[0.4em] mt-3">{t.google_rating}</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-5xl font-light text-white leading-none">24h</span>
                                <span className="text-[9px] font-bold text-brand-platinum uppercase tracking-[0.4em] mt-3">{t.availability}</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-5xl font-light text-white leading-none">VIP</span>
                                <span className="text-[9px] font-bold text-brand-platinum uppercase tracking-[0.4em] mt-3">{t.vip_guarantee}</span>
                            </div>
                        </div>
                    </div>
                )}

                <div className={`w-full flex justify-center ${bookingStep === 1 ? 'flex-1 xl:justify-end' : 'max-w-xl'} transition-all duration-1000 delay-500 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-20'}`}>
                    <div className="relative group p-1 bg-brand-charcoal/50 rounded-[3rem] border border-white/5 gold-glow">
                        <BookingForm language={language} onStepChange={setBookingStep} />
                    </div>
                </div>
            </main >

            {/* SECTOR ASPECTS */}
            {
                bookingStep === 1 && (
                    <>
                        <section id="sector" className="relative z-10 py-40 border-y border-white/5">
                            <div className="container mx-auto px-6">
                                <div className="text-center mb-32">
                                    <span className="text-brand-platinum font-bold tracking-[0.5em] uppercase text-[9px] mb-6 block">{t.why_palladium}</span>
                                    <h2 className="text-5xl lg:text-6xl font-light text-white tracking-tighter uppercase">{t.commitment_excellence}</h2>
                                    <div className="w-16 h-px bg-brand-platinum mx-auto mt-12 opacity-30"></div>
                                </div>

                                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-12">
                                    {t.sector_aspects.map((aspect, idx) => (
                                        <div key={idx} className="group p-12 rounded-[2rem] bg-brand-charcoal/30 border border-white/5 hover:border-brand-platinum/20 transition-all duration-500">
                                            <div className="w-12 h-12 rounded-full border border-brand-platinum/20 flex items-center justify-center text-brand-platinum mb-10 group-hover:bg-brand-platinum group-hover:text-black transition-all">
                                                <span className="material-icons-round text-xl">{aspect.icon}</span>
                                            </div>
                                            <h3 className="text-sm font-bold text-white mb-6 uppercase tracking-widest">{aspect.title}</h3>
                                            <p className="text-slate-500 text-[11px] font-medium leading-relaxed group-hover:text-slate-300 transition-colors uppercase tracking-widest">{aspect.desc}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </section>

                        {/* Fleet Showcase */}
                        <section id="flota" className="relative z-10 py-40 bg-brand-black">
                            <div className="container mx-auto px-6 text-center mb-32">
                                <span className="text-brand-platinum font-bold tracking-[0.5em] uppercase text-[9px] mb-6 block">{t.fleet}</span>
                                <h2 className="text-6xl lg:text-7xl font-light text-white tracking-tighter uppercase">{t.fleet_title}</h2>
                                <p className="text-slate-500 mt-8 max-w-xl mx-auto font-light text-lg italic">{t.fleet_desc}</p>
                            </div>

                            <div className="container mx-auto px-6 grid lg:grid-cols-3 gap-12">
                                {loading ? (
                                    [1, 2, 3].map((item) => (
                                        <div key={item} className="rounded-[2.5rem] overflow-hidden bg-brand-charcoal/50 border border-white/5 p-6 animate-pulse">
                                            <div className="rounded-[2rem] bg-brand-black aspect-[4/3] mb-8"></div>
                                            <div className="space-y-4 px-2">
                                                <div className="h-6 bg-brand-black rounded-full w-3/4"></div>
                                                <div className="flex gap-2">
                                                    <div className="h-4 bg-brand-black rounded-full w-12"></div>
                                                    <div className="h-4 bg-brand-black rounded-full w-12"></div>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                ) : vehicles.length > 0 ? (
                                    vehicles.filter((v, i, a) => a.findIndex(t => (t.model === v.model)) === i).map((car, idx) => (
                                        <div key={idx} className="group relative rounded-[2.5rem] overflow-hidden bg-brand-charcoal/20 border border-white/5 p-6 transition-all hover:bg-brand-charcoal/40 hover:border-brand-platinum/20">
                                            <div className="relative rounded-[2.5rem] overflow-hidden aspect-[4/3] mb-8 shadow-2xl bg-brand-black border border-white/5">
                                                {car.image_url ? (
                                                    <img src={car.image_url} alt={car.model} className="absolute inset-0 w-full h-full object-cover transition-all duration-1000 group-hover:scale-105" />
                                                ) : (
                                                    <div className="absolute inset-0 flex items-center justify-center text-brand-charcoal">
                                                        <span className="material-icons-round text-6xl">local_taxi</span>
                                                    </div>
                                                )}
                                                <div className="absolute top-6 left-6">
                                                    <span className="bg-brand-black/80 backdrop-blur-md text-[9px] font-bold uppercase py-2 px-5 rounded-full border border-white/10 tracking-[0.3em]">
                                                        {car.model.toLowerCase().includes('class s') || car.model.toLowerCase().includes('luxury') ? 'Luxury' : 'Premium'}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="px-4">
                                                <h3 className="text-2xl font-light text-white mb-6 uppercase tracking-tighter group-hover:platinum-text transition-all">
                                                    {car.model}
                                                </h3>
                                                <div className="flex flex-wrap gap-3">
                                                    <span className="text-[8px] font-bold text-brand-platinum border border-brand-platinum/20 py-1.5 px-4 rounded-full uppercase tracking-widest">Model {car.year}</span>
                                                    <span className="text-[8px] font-bold text-brand-platinum border border-brand-platinum/20 py-1.5 px-4 rounded-full uppercase tracking-widest italic">ECO Certified</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-center text-slate-500 col-span-3 py-20 italic">No professional vehicles available.</p>
                                )}
                            </div>
                        </section>

                        {/* Testimonials */}
                        <section className="relative z-10 py-40 border-t border-white/5 bg-brand-black">
                            <div className="container mx-auto px-6">
                                <div className="text-center mb-32">
                                    <span className="text-brand-platinum font-bold tracking-[0.5em] uppercase text-[9px] mb-6 block">{t.trust}</span>
                                    <h2 className="text-5xl lg:text-6xl font-light text-white tracking-tighter uppercase">{t.testimonials_title}</h2>
                                </div>

                                <div className="grid lg:grid-cols-3 gap-12">
                                    {[
                                        { name: 'Ricardo S.', role: 'Director Comercial', text: language === 'es' ? 'Puntualidad británica y un trato exquisito. El vehículo estaba en condiciones inmejorables.' : 'British punctuality and exquisite treatment. The vehicle was in unbeatable condition.' },
                                        { name: 'Elena M.', role: 'Event Planner', text: language === 'es' ? 'Coordinar traslados con Palladium es sinónimo de tranquilidad. Profesionalidad en cada detalle.' : 'Coordinating transfers with Palladium is synonymous with peace of mind. Professionalism in every detail.' },
                                        { name: 'Thomas K.', role: 'VIP Traveler', text: 'The best transfer service in Mallorca. Professional drivers and premium cars. 100% recommended.' }
                                    ].map((testi, idx) => (
                                        <div key={idx} className="bg-brand-charcoal/10 p-14 rounded-[3rem] border border-white/5 transition-all group hover:bg-brand-charcoal/30">
                                            <div className="flex gap-1.5 text-brand-platinum/40 mb-12">
                                                {[1, 2, 3, 4, 5].map(s => <span key={s} className="material-icons-round text-xs">star</span>)}
                                            </div>
                                            <p className="text-xl text-slate-400 font-light italic mb-16 leading-relaxed group-hover:text-white transition-colors">"{testi.text}"</p>
                                            <div className="flex items-center gap-6">
                                                <div className="w-14 h-14 rounded-2xl bg-brand-charcoal border border-white/5 flex items-center justify-center font-bold text-brand-platinum text-lg">
                                                    {testi.name[0]}
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-white uppercase text-xs tracking-widest">{testi.name}</h4>
                                                    <p className="text-[10px] text-brand-platinum/50 font-bold uppercase tracking-[0.3em] mt-1">{testi.role}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </section>

                        {/* Footer */}
                        <footer className="relative z-10 bg-brand-black py-40 border-t border-white/5">
                            <div className="container mx-auto px-6 text-center">
                                <div className="flex flex-col items-center gap-8 mb-24">
                                    <Logo variant="icon" className="w-16 h-16 brightness-200" color="white" />
                                    <div className="flex flex-col items-center">
                                        <span className="font-light text-3xl tracking-[0.4em] block leading-none text-white">PALLADIUM TRANSFERS</span>
                                        <span className="text-[10px] text-brand-platinum font-bold uppercase tracking-[0.6em] mt-3 italic opacity-50">Excellence in Motion</span>
                                    </div>
                                </div>
                                <div className="flex flex-wrap justify-center gap-16 mb-24 text-[10px] font-bold uppercase tracking-[0.5em] text-slate-500">
                                    <button onClick={() => setActiveModal('legal')} className="hover:text-white transition-colors">{t.legal}</button>
                                    <button onClick={() => setActiveModal('terms')} className="hover:text-white transition-colors">Términos y Condiciones</button>
                                    <button onClick={() => setActiveModal('privacy')} className="hover:text-white transition-colors">{t.privacy}</button>
                                    <button onClick={() => setActiveModal('cookies')} className="hover:text-white transition-colors">{t.cookies}</button>
                                </div>
                                <p className="text-slate-800 text-[9px] font-bold uppercase tracking-[0.6em]">
                                    &copy; {new Date().getFullYear()} Palladium Transfers S.L. • Reserved to Excellence
                                </p>
                            </div>
                        </footer>
                    </>
                )
            }

            {/* Legal Modals Component */}
            <LegalModals type={activeModal} language={language} onClose={() => setActiveModal(null)} />
        </div >
    );
};
