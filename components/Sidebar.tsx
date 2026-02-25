import React from 'react';
import { ViewState, Language } from '../types';
import { supabase } from '../services/supabase';
import { Logo } from './ui/Logo';

interface SidebarProps {
  currentView: ViewState;
  onChangeView: (view: ViewState) => void;
  language: Language;
  setLanguage: (lang: Language) => void;
  userRole?: string;
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, onChangeView, language, setLanguage, userRole = 'client', isOpen, onClose }) => {

  // Simple translation dictionary for the sidebar
  const t = (key: string) => {
    const dict: Record<string, { es: string; en: string }> = {
      controlTower: { es: 'Torre de Control', en: 'Control Tower' },
      dispatch: { es: 'Consola Despacho', en: 'Dispatch Console' },
      bookings: { es: 'Reservas', en: 'Bookings' },
      shifts: { es: 'Turnos y Horarios', en: 'Shifts & Schedules' },
      drivers: { es: 'Conductores', en: 'Drivers' },
      vehicles: { es: 'Vehículos', en: 'Vehicles' },
      workshop: { es: 'Taller / Mantenimiento', en: 'Workshop / Maintenance' },
      clients: { es: 'Clientes', en: 'Clients' },
      invoices: { es: 'Facturas', en: 'Invoices' },
      rates: { es: 'Tarifas', en: 'Rates' },
      users: { es: 'Usuarios', en: 'Users' },
      api: { es: 'Integraciones API', en: 'API Integrations' },
      config: { es: 'Config. Operativa', en: 'Ops Configuration' },
      ops: { es: 'Operaciones', en: 'Operations' },
      fleet: { es: 'Flota y Personal', en: 'Fleet & Staff' },
      business: { es: 'Negocio', en: 'Business' },
      system: { es: 'Sistema', en: 'System' },
      driverApp: { es: 'App Conductor', en: 'Driver App' },
      reports: { es: 'Reportes y Gastos', en: 'Reports & Expenses' },
      settings: { es: 'Ajustes Generales', en: 'General Settings' },
      extras: { es: 'Extras de Servicio', en: 'Service Extras' },
      municipalities: { es: 'Municipios', en: 'Municipalities' },
      clientPortal: { es: 'Mi Portal', en: 'My Portal' },
      timeTracking: { es: 'Registro Horario', en: 'Time Tracking' }
    };
    return dict[key]?.[language] || key;
  };

  const NavItem = ({ view, icon, labelKey }: { view: ViewState; icon: string; labelKey: string }) => {
    const isActive = currentView === view;
    return (
      <button
        onClick={() => { onChangeView(view); onClose(); }}
        className={`w-full flex items-center gap-4 px-6 py-4 border-l-2 transition-all duration-300 group ${isActive
          ? 'bg-white/5 text-white border-white gold-glow'
          : 'border-transparent text-slate-500 hover:text-slate-200 hover:bg-white/[0.03]'
          }`}
      >
        <span className={`material-icons-round text-xl transition-all ${isActive ? 'scale-110 text-brand-gold' : 'group-hover:scale-110'}`}>{icon}</span>
        <span className={`block font-bold text-[10px] uppercase tracking-[0.2em] transition-all ${isActive ? 'text-white' : ''}`}>{t(labelKey)}</span>
      </button>
    );
  };

  const SectionLabel = ({ labelKey }: { labelKey: string }) => (
    <div className="px-8 py-4 mt-6 mb-2 block">
      <div className="flex items-center gap-3">
        <div className="w-4 h-px bg-brand-platinum opacity-20"></div>
        <p className="text-[9px] uppercase tracking-[0.4em] font-black text-slate-700">{t(labelKey)}</p>
      </div>
    </div>
  );

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      window.location.href = '/'; // Force redirect to root
    } catch (error) {
      console.error('Error signing out:', error);
      // Fallback: if server signout fails, clear local storage and force redirect
      localStorage.clear();
      window.location.href = '/';
    }
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[90] md:hidden"
          onClick={onClose}
        />
      )}

      <aside className={`fixed inset-y-0 left-0 z-[100] w-72 h-full bg-brand-black/95 backdrop-blur-xl border-r border-white/5 flex flex-col shrink-0 selection:bg-brand-platinum/30 transform transition-transform duration-300 md:relative md:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        {/* Brand */}
        <div className="h-32 flex items-center justify-center border-b border-white/5 shrink-0 px-6 bg-brand-black/20">
          <div className="flex items-center gap-4 group cursor-pointer transition-all duration-700">
            <Logo variant="icon" className="w-12 h-12 brightness-200 group-hover:scale-105 transition-all duration-500" color="white" />
            <div className="flex flex-col items-start min-w-[180px]">
              <span className="font-light text-xl tracking-[0.3em] block leading-none text-white whitespace-nowrap">PALLADIUM</span>
              <span className="font-light text-xl tracking-[0.3em] block leading-none text-white whitespace-nowrap">TRANSFERS</span>
              <span className="text-[7px] text-brand-platinum font-bold uppercase tracking-[0.5em] mt-1.5 italic opacity-40">Excellence in Motion</span>
            </div>
          </div>
        </div>

        {/* Navigation (Scrollable) */}
        <nav className="flex-1 overflow-y-auto py-4 space-y-1 custom-scrollbar">
          {userRole === 'client' && (
            <>
              <SectionLabel labelKey="clientPortal" />
              <NavItem view={ViewState.CLIENT_PORTAL} icon="person" labelKey="clientPortal" />
            </>
          )}

          {userRole === 'driver' && (
            <>
              <SectionLabel labelKey="driverApp" />
              <NavItem view={ViewState.DRIVER_APP} icon="airport_shuttle" labelKey="driverApp" />
            </>
          )}

          {(userRole === 'admin' || userRole === 'operator') && (
            <>
              <SectionLabel labelKey="ops" />
              <NavItem view={ViewState.OPERATIONS} icon="dashboard" labelKey="controlTower" />
              <NavItem view={ViewState.DISPATCH} icon="schedule" labelKey="dispatch" />
              <NavItem view={ViewState.RESERVAS} icon="confirmation_number" labelKey="bookings" />
              <NavItem view={ViewState.TURNOS} icon="timer" labelKey="shifts" />

              <SectionLabel labelKey="fleet" />
              <NavItem view={ViewState.FICHAJES} icon="history_edu" labelKey="timeTracking" />
              <NavItem view={ViewState.CONDUCTORES} icon="badge" labelKey="drivers" />
              <NavItem view={ViewState.VEHICULOS} icon="directions_car" labelKey="vehicles" />
              <NavItem view={ViewState.TALLER} icon="build" labelKey="workshop" />
            </>
          )}

          {(userRole === 'admin' || userRole === 'accountant') && (
            <>
              <SectionLabel labelKey="business" />
              <NavItem view={ViewState.REPORTES} icon="bar_chart" labelKey="reports" />
              <NavItem view={ViewState.CLIENTES} icon="business" labelKey="clients" />
              <NavItem view={ViewState.FACTURAS} icon="receipt_long" labelKey="invoices" />
              <NavItem view={ViewState.EXTRAS} icon="add_reaction" labelKey="extras" />
              <NavItem view={ViewState.TARIFAS} icon="price_change" labelKey="rates" />
            </>
          )}

          {userRole === 'admin' && (
            <>
              <SectionLabel labelKey="system" />
              <NavItem view={ViewState.USUARIOS} icon="manage_accounts" labelKey="users" />
              <NavItem view={ViewState.API} icon="hub" labelKey="api" />
              <NavItem view={ViewState.CONFIG} icon="tune" labelKey="config" />
              <NavItem view={ViewState.CONFIGURACION} icon="settings" labelKey="settings" />
              <NavItem view={ViewState.MUNICIPALITIES} icon="location_city" labelKey="municipalities" />
            </>
          )}
        </nav>

        {/* Language & User Profile */}
        <div className="shrink-0 bg-brand-black border-t border-white/5">
          {/* Language Toggle */}
          <div className="flex justify-center md:justify-between items-center px-6 py-4 border-b border-white/5">
            <div className="flex bg-white/5 rounded-full p-1 border border-white/5 shadow-inner">
              <button
                onClick={() => { setLanguage('es'); }}
                className={`px-3 py-1 rounded-full text-[9px] font-bold transition-all ${language === 'es' ? 'bg-white text-black shadow-lg' : 'text-slate-500 hover:text-white'}`}
              >
                ES
              </button>
              <button
                onClick={() => { setLanguage('en'); }}
                className={`px-3 py-1 rounded-full text-[9px] font-bold transition-all ${language === 'en' ? 'bg-white text-black shadow-lg' : 'text-slate-500 hover:text-white'}`}
              >
                EN
              </button>
            </div>
          </div>

          <div className="p-4 flex items-center gap-3 px-2 justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand-charcoal border border-white/5 flex items-center justify-center font-bold text-brand-platinum">
                {(userRole?.[0] || '?').toUpperCase()}
              </div>
              <div className="hidden md:block">
                <p className="text-xs font-bold text-white uppercase tracking-widest">{userRole}</p>
                <p className="text-[9px] text-brand-platinum/50 uppercase font-bold tracking-tighter">Active Session</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="text-slate-400 hover:text-red-400 transition-colors p-2 rounded-full hover:bg-white/5"
              title="Cerrar Sesión"
            >
              <span className="material-icons-round">logout</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
