import React, { useState, useEffect, useRef, Suspense } from 'react';
import { Sidebar } from './components/Sidebar';
import { Auth } from './components/Auth';
import { LandingPage } from './components/LandingPage';

const AiAssistant = React.lazy(() => import('./components/AiAssistant').then(module => ({ default: module.AiAssistant })));

// Lazy loaded views
const OperationsHub = React.lazy(() => import('./views/OperationsHub').then(module => ({ default: module.OperationsHub })));
const DispatchConsole = React.lazy(() => import('./views/DispatchConsole').then(module => ({ default: module.DispatchConsole })));
const ExperienceConfig = React.lazy(() => import('./views/ExperienceConfig').then(module => ({ default: module.ExperienceConfig })));
const ReservasView = React.lazy(() => import('./views/ReservasView').then(module => ({ default: module.ReservasView })));
const TurnosView = React.lazy(() => import('./views/TurnosView').then(module => ({ default: module.TurnosView })));
const ApiConfigView = React.lazy(() => import('./views/ApiConfigView').then(module => ({ default: module.ApiConfigView })));
const ConfiguracionView = React.lazy(() => import('./views/ConfiguracionView').then(module => ({ default: module.ConfiguracionView })));
const MunicipalitiesView = React.lazy(() => import('./views/MunicipalitiesView').then(module => ({ default: module.MunicipalitiesView })));
const FichajesView = React.lazy(() => import('./views/FichajesView').then(module => ({ default: module.FichajesView })));
const DriverAppView = React.lazy(() => import('./views/DriverAppView').then(module => ({ default: module.DriverAppView })));
const ReportesView = React.lazy(() => import('./views/ReportesView').then(module => ({ default: module.ReportesView })));
const ClientPortalView = React.lazy(() => import('./views/ClientPortalView').then(module => ({ default: module.ClientPortalView })));
const CalculadoraNominasView = React.lazy(() => import('./views/CalculadoraNominasView').then(module => ({ default: module.CalculadoraNominasView })));

// Management Modules
const ConductoresView = React.lazy(() => import('./views/ManagementModules').then(module => ({ default: module.ConductoresView })));
const VehiculosView = React.lazy(() => import('./views/ManagementModules').then(module => ({ default: module.VehiculosView })));
const ClientesView = React.lazy(() => import('./views/ManagementModules').then(module => ({ default: module.ClientesView })));
const TarifasView = React.lazy(() => import('./views/ManagementModules').then(module => ({ default: module.TarifasView })));
const UsuariosView = React.lazy(() => import('./views/ManagementModules').then(module => ({ default: module.UsuariosView })));
const FacturasView = React.lazy(() => import('./views/ManagementModules').then(module => ({ default: module.FacturasView })));
const ExtrasView = React.lazy(() => import('./views/ManagementModules').then(module => ({ default: module.ExtrasView })));
const TallerView = React.lazy(() => import('./views/ManagementModules').then(module => ({ default: module.TallerView })));
const CashReconciliationView = React.lazy(() => import('./views/CashReconciliationView').then(module => ({ default: module.CashReconciliationView })));
const AliasDictionaryView = React.lazy(() => import('./views/AliasDictionaryView').then(module => ({ default: module.AliasDictionaryView })));
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

  // Inactivity and Auto-Refresh Timer
  useEffect(() => {
    if (!session) return;

    let inactivityTimer = 0;
    const ACTIVITY_LIMIT = 60 * 60; // 1 hour in seconds
    const REFRESH_INTERVAL = 5 * 60; // 5 minutes in seconds

    const resetInactivity = () => {
      inactivityTimer = 0;
    };

    const interval = setInterval(() => {
      inactivityTimer += 1;

      // Auto refresh data every 5 minutes
      if (inactivityTimer > 0 && inactivityTimer % REFRESH_INTERVAL === 0) {
        window.dispatchEvent(new CustomEvent('app:refresh'));
      }

      // Logout after 1 hour of inactivity
      if (inactivityTimer >= ACTIVITY_LIMIT) {
        supabase.auth.signOut().then(() => {
          window.location.reload();
        });
      }
    }, 1000);

    window.addEventListener('mousemove', resetInactivity);
    window.addEventListener('keydown', resetInactivity);
    window.addEventListener('touchstart', resetInactivity);
    window.addEventListener('click', resetInactivity);

    return () => {
      clearInterval(interval);
      window.removeEventListener('mousemove', resetInactivity);
      window.removeEventListener('keydown', resetInactivity);
      window.removeEventListener('touchstart', resetInactivity);
      window.removeEventListener('click', resetInactivity);
    };
  }, [session]);

  const activeFetchRef = useRef<string | null>(null);
  const lastFetchedUserId = useRef<string | null>(null);

  const fetchUserRole = async (userId: string) => {
    // Prevent duplicate concurrent role fetches for the same user
    if (activeFetchRef.current === userId) {
      console.log(`App: fetchUserRole already active for ID: ${userId}, skipping duplicate.`);
      return;
    }
    if (lastFetchedUserId.current === userId) {
      console.log(`App: fetchUserRole already completed for ID: ${userId}, skipping duplicate.`);
      return;
    }
    activeFetchRef.current = userId;

    try {
      // Add a 15 second timeout to prevent the query from hanging indefinitely
      const timeoutPromise = new Promise<{ data: any, error: any }>((_, reject) => {
        setTimeout(() => reject(new Error('Supabase query timeout')), 15000);
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
      localStorage.setItem('palladium_user_role', role); // Cache to avoid slow reloads
      lastFetchedUserId.current = userId;

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

    // Optimistic UI load: Restore cached role to bypass loading screen
    const cachedRole = localStorage.getItem('palladium_user_role');
    if (cachedRole) {
      setUserRole(cachedRole);
      setRoleReady(true);
      if (cachedRole !== 'client') {
        setShowLanding(false);
        if (cachedRole === 'driver') setCurrentView(ViewState.DRIVER_APP);
        else if (cachedRole === 'accountant') setCurrentView(ViewState.FACTURAS);
        else setCurrentView(ViewState.OPERATIONS);
      }
    }

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
          localStorage.removeItem('palladium_user_role'); // Clear cache
          setShowLanding(!window.location.hash.includes('type=recovery') && !window.location.href.includes('error=access_denied'));
          setUserRole('client');
          setRoleReady(true);
          setCurrentView(ViewState.CLIENT_PORTAL);
          lastFetchedUserId.current = null;
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
      ViewState.REPORTES, ViewState.CONFIGURACION, ViewState.MUNICIPALITIES,
      ViewState.CALCULADORA_NOMINAS, ViewState.ALIAS_DICTIONARY
    ];

    if (session && userRole === 'client' && adminViews.includes(currentView)) {
      console.log("App: Safety Gate triggered - Redirecting client to portal");
      setCurrentView(ViewState.CLIENT_PORTAL);
    }
  }, [userRole, currentView]);

  if (loading || (session && !roleReady)) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-[#0a0a0a] text-white">
        <div className="relative flex flex-col items-center justify-center gap-8 animate-pulse-slow">
          <img src="/favicon.svg" alt="Palladium Logo" className="h-20 w-20 opacity-90 drop-shadow-lg" />
          <div className="flex flex-col items-center gap-2">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-gold"></div>
            <p className="text-brand-gold/70 text-xs uppercase tracking-widest font-bold mt-4">
              {session ? 'Cargando perfil...' : 'Iniciando sistema...'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Authenticated staff: skip landing page entirely (handles F5 refresh case)
  const isStaffRole = session && roleReady && userRole !== 'client' && userRole !== '';
  if (showLanding && !isStaffRole) {
    return (
      <>
        <LandingPage
          onEnterApp={() => setShowLanding(false)}
          session={session}
          language={language}
          setLanguage={setLanguage}
        />
        <Suspense fallback={null}>
          <div className="print:hidden">
            <AiAssistant role="client" userName={session?.user?.email} />
          </div>
        </Suspense>
      </>
    );
  }

  if (!session) {
    return <Auth language={language} />;
  }

  return (
    <div className="flex h-screen bg-slate-900 text-white font-sans overflow-hidden print:h-auto print:overflow-visible print:block">
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
      <main className="flex-1 relative flex flex-col overflow-hidden bg-brand-black print:overflow-visible print:h-auto print:block print:static">
        {/* Mobile Header */}
        <div className="md:hidden h-16 border-b border-white/5 bg-brand-charcoal px-4 flex items-center justify-between shrink-0 z-30 shadow-md print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full border border-brand-gold/50 flex items-center justify-center">
              <span className="text-brand-gold font-bold text-xs">P T</span>
            </div>
            <span className="font-light text-sm tracking-[0.2em] text-white">PALLADIUM</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => {
                window.dispatchEvent(new CustomEvent('app:refresh'));
                const icon = e.currentTarget.querySelector('.material-icons-round');
                if (icon) {
                  icon.classList.add('animate-spin');
                  setTimeout(() => icon.classList.remove('animate-spin'), 1000);
                }
              }}
              className="p-2 text-brand-platinum hover:text-white hover:bg-white/5 rounded-lg transition-colors border border-white/10"
              title="Actualizar Datos"
            >
              <span className="material-icons-round">refresh</span>
            </button>
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 text-white hover:bg-white/5 rounded-lg transition-colors border border-white/10"
            >
              <span className="material-icons-round">menu</span>
            </button>
          </div>
        </div>

        <Suspense fallback={
          <div className="flex flex-col h-full items-center justify-center bg-[#0a0a0a]">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-gold"></div>
            <p className="mt-4 text-brand-platinum/50 text-xs uppercase tracking-widest font-bold">Cargando módulo...</p>
          </div>
        }>
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
                    {currentView === ViewState.CALCULADORA_NOMINAS && <CalculadoraNominasView />}
                  </>
                )}

                {(isAdmin || userRole === 'accountant') && (
                  <>
                    {currentView === ViewState.REPORTES && <ReportesView />}
                    {currentView === ViewState.CLIENTES && <ClientesView />}
                    {currentView === ViewState.FACTURAS && <FacturasView />}
                    {currentView === ViewState.CASH_RECONCILIATION && <CashReconciliationView />}
                    {currentView === ViewState.ALIAS_DICTIONARY && <AliasDictionaryView />}
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
        </Suspense>
      </main>

      {/* Gemini AI Assistant Widget */}
      <Suspense fallback={null}>
        <div className="print:hidden">
          <AiAssistant role={userRole} userName={session?.user?.email} />
        </div>
      </Suspense>
    </div>
  );
}
