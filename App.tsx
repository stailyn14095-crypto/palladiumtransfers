import React, { useState, useEffect, useRef } from 'react';
import { Sidebar } from './components/Sidebar';
import { OperationsHub } from './views/OperationsHub';
import { DispatchConsole } from './views/DispatchConsole';
import { ExperienceConfig } from './views/ExperienceConfig';
import { ReservasView } from './views/ReservasView';
import { TurnosView } from './views/TurnosView';
import { ApiConfigView } from './views/ApiConfigView';
import { ConductoresView, VehiculosView, ClientesView, TarifasView, UsuariosView, FacturasView, ExtrasView, TallerView } from './views/ManagementModules';
import { ConfiguracionView } from './views/ConfiguracionView';
import { MunicipalitiesView } from './views/MunicipalitiesView';
import { FichajesView } from './views/FichajesView';
import { DriverAppView } from './views/DriverAppView';
import { ReportesView } from './views/ReportesView';
import { ClientPortalView } from './views/ClientPortalView';
import { AiAssistant } from './components/AiAssistant';
import { Auth } from './components/Auth';
import { LandingPage } from './components/LandingPage';
import { supabase } from './services/supabase';
import { ViewState, Language } from './types';
import { Session } from '@supabase/supabase-js';

export default function App() {
  const [currentView, setCurrentView] = useState<ViewState>(ViewState.OPERATIONS);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [language, setLanguage] = useState<Language>('es');
  const [session, setSession] = useState<Session | null>(null);
  const [userRole, setUserRole] = useState<string>('');
  const [roleReady, setRoleReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showLanding, setShowLanding] = useState(!window.location.hash.includes('type=recovery') && !window.location.href.includes('error=access_denied'));

  const activeFetchRef = useRef<string | null>(null);

  const fetchUserRole = async (userId: string) => {
    // Prevent duplicate concurrent role fetches for the same user
    if (activeFetchRef.current === userId) {
      console.log(`App: fetchUserRole already active for ID: ${userId}, skipping duplicate.`);
      return;
    }
    activeFetchRef.current = userId;

    try {
      // Add a 5 second timeout to prevent the query from hanging indefinitely
      const timeoutPromise = new Promise<{ data: any, error: any }>((_, reject) => {
        setTimeout(() => reject(new Error('Supabase query timeout')), 5000);
      });

      const queryPromise = supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();

      const { data, error } = await Promise.race([queryPromise, timeoutPromise]);

      let role = 'client';
      if (!error && data?.role) {
        role = data.role.toLowerCase();
      }

      console.log(`App: User role fetched: "${role}" for ID: ${userId}`);
      setUserRole(role);
      setRoleReady(true);

      // Set default view based on role
      if (role === 'client') {
        setCurrentView(ViewState.CLIENT_PORTAL);
        // Clients should see the landing page by default to be able to make bookings.
      } else {
        if (role === 'driver') setCurrentView(ViewState.DRIVER_APP);
        else if (role === 'accountant') setCurrentView(ViewState.FACTURAS);
        else setCurrentView(ViewState.OPERATIONS);
        setShowLanding(false); // Auto-hide landing only for staff
      }
    } catch (err: any) {
      console.error('Error fetching role:', err.message || err);
      // Fallback
      setUserRole('client');
      setCurrentView(ViewState.CLIENT_PORTAL);
      setRoleReady(true);
    } finally {
      activeFetchRef.current = null;
    }
  };

  useEffect(() => {
    console.log("App: useEffect start");
    let isMounted = true;

    // Failsafe timeout in case Supabase hangs
    const failsafe = setTimeout(() => {
      console.log("App: failsafe triggered");
      if (isMounted) {
        setUserRole(prev => {
          if (!prev) {
            setCurrentView(ViewState.CLIENT_PORTAL);
            return 'client';
          }
          return prev;
        });
        setLoading(false);
        setRoleReady(true);
      }
    }, 15000); // 15 seconds

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log(`App: onAuthStateChange fired, event: ${event}, session attached:`, !!session);

      if (!isMounted) return;

      setSession(session);

      try {
        if (session) {
          console.log("App: valid session found via event, fetching role...");
          await fetchUserRole(session.user.id);
        } else {
          // No session found on init, or user just signed out
          console.log(`App: no session (${event}), using default client role.`);
          setShowLanding(!window.location.hash.includes('type=recovery') && !window.location.href.includes('error=access_denied'));
          setUserRole('client');
          setRoleReady(true);
          setCurrentView(ViewState.CLIENT_PORTAL);
        }
      } catch (err: any) {
        console.error('Error handling auth state change:', err);
        if (isMounted) {
          setUserRole('client');
          setRoleReady(true);
          setCurrentView(ViewState.CLIENT_PORTAL);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
          clearTimeout(failsafe);
        }
      }
    });

    return () => {
      isMounted = false;
      clearTimeout(failsafe);
      subscription.unsubscribe();
    };
  }, []);

  // Safety Gate: Ensure clients don't see admin views
  useEffect(() => {
    const adminViews = [
      ViewState.OPERATIONS, ViewState.DISPATCH, ViewState.CONFIG,
      ViewState.RESERVAS, ViewState.TURNOS, ViewState.API,
      ViewState.CONDUCTORES, ViewState.VEHICULOS, ViewState.TALLER,
      ViewState.CLIENTES, ViewState.TARIFAS, ViewState.EXTRAS,
      ViewState.USUARIOS, ViewState.FACTURAS, ViewState.FICHAJES,
      ViewState.REPORTES, ViewState.CONFIGURACION, ViewState.MUNICIPALITIES
    ];

    if (session && userRole === 'client' && adminViews.includes(currentView)) {
      console.log("App: Safety Gate triggered - Redirecting client to portal");
      setCurrentView(ViewState.CLIENT_PORTAL);
    }
  }, [userRole, currentView]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-900 text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
  }

  // If session exists but role is still loading, wait before rendering anything
  if (session && !roleReady) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#0a0a0a] text-white flex-col gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-gold"></div>
        <p className="text-brand-platinum/50 text-xs uppercase tracking-widest font-bold">Cargando perfil...</p>
      </div>
    );
  }

  // Authenticated staff: skip landing page entirely (handles F5 refresh case)
  const isStaffRole = session && roleReady && userRole !== 'client' && userRole !== '';
  if (showLanding && !isStaffRole) {
    return (
      <LandingPage
        onEnterApp={() => setShowLanding(false)}
        session={session}
        language={language}
        setLanguage={setLanguage}
      />
    );
  }

  if (!session) {
    return <Auth language={language} />;
  }

  return (
    <div className="flex h-screen bg-slate-900 text-white font-sans overflow-hidden">
      {/* Navigation */}
      <Sidebar
        currentView={currentView}
        onChangeView={setCurrentView}
        language={language}
        setLanguage={setLanguage}
        userRole={userRole}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <main className="flex-1 relative flex flex-col overflow-hidden bg-brand-black">
        {/* Mobile Header */}
        <div className="md:hidden h-16 border-b border-white/5 bg-brand-charcoal px-4 flex items-center justify-between shrink-0 z-30 shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full border border-brand-gold/50 flex items-center justify-center">
              <span className="text-brand-gold font-bold text-xs">P T</span>
            </div>
            <span className="font-light text-sm tracking-[0.2em] text-white">PALLADIUM</span>
          </div>
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 text-white hover:bg-white/5 rounded-lg transition-colors border border-white/10"
          >
            <span className="material-icons-round">menu</span>
          </button>
        </div>

        {(() => {
          const isStaff = ['admin', 'operator', 'accountant'].includes(userRole);
          const isAdmin = userRole === 'admin';

          return (
            <>
              {(isAdmin || userRole === 'operator') && (
                <>
                  {currentView === ViewState.OPERATIONS && <OperationsHub />}
                  {currentView === ViewState.DISPATCH && <DispatchConsole />}
                  {currentView === ViewState.RESERVAS && <ReservasView />}
                  {currentView === ViewState.TURNOS && <TurnosView />}
                  {currentView === ViewState.FICHAJES && <FichajesView />}
                  {currentView === ViewState.CONDUCTORES && <ConductoresView />}
                  {currentView === ViewState.VEHICULOS && <VehiculosView />}
                  {currentView === ViewState.TALLER && <TallerView />}
                </>
              )}

              {(isAdmin || userRole === 'accountant') && (
                <>
                  {currentView === ViewState.REPORTES && <ReportesView />}
                  {currentView === ViewState.CLIENTES && <ClientesView />}
                  {currentView === ViewState.FACTURAS && <FacturasView />}
                  {currentView === ViewState.EXTRAS && <ExtrasView />}
                  {currentView === ViewState.TARIFAS && <TarifasView />}
                </>
              )}

              {isAdmin && (
                <>
                  {currentView === ViewState.CONFIG && <ExperienceConfig />}
                  {currentView === ViewState.USUARIOS && <UsuariosView />}
                  {currentView === ViewState.API && <ApiConfigView />}
                  {currentView === ViewState.CONFIGURACION && <ConfiguracionView />}
                  {currentView === ViewState.MUNICIPALITIES && <MunicipalitiesView />}
                </>
              )}
            </>
          );
        })()}

        {/* New Views */}
        {(userRole === 'admin' || userRole === 'driver') && (
          <>
            {currentView === ViewState.DRIVER_APP && <DriverAppView />}
            {currentView === ViewState.DRIVER_ACCESS && <DriverAppView />}
          </>
        )}

        {currentView === ViewState.CLIENT_PORTAL && (
          <ClientPortalView
            session={session}
            onNewBooking={() => setShowLanding(true)}
            language={language}
          />
        )}
      </main>

      {/* Gemini AI Assistant Widget */}
      <AiAssistant />
    </div>
  );
}
