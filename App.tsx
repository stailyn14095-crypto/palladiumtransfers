import React, { useState, useEffect } from 'react';
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
  const [language, setLanguage] = useState<Language>('es');
  const [session, setSession] = useState<Session | null>(null);
  const [userRole, setUserRole] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [showLanding, setShowLanding] = useState(!window.location.hash.includes('type=recovery') && !window.location.href.includes('error=access_denied'));

  const fetchUserRole = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();

      let role = 'client';
      if (!error && data?.role) {
        role = data.role.toLowerCase();
      }

      console.log(`App: User role fetched: "${role}" for ID: ${userId}`);
      setUserRole(role);

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
    } catch (err) {
      console.error('Error fetching role:', err);
      // Fallback
      setUserRole('client');
      setCurrentView(ViewState.CLIENT_PORTAL);
    }
  };

  useEffect(() => {
    console.log("App: useEffect start");

    // Failsafe timeout in case Supabase hangs
    const failsafe = setTimeout(() => {
      console.log("App: failsafe triggered");
      setLoading(false);
    }, 2500);

    const checkSession = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;

        setSession(session);
        if (session) {
          console.log("App: session found, fetching role...");
          await fetchUserRole(session.user.id);
        } else {
          console.log("App: no session, using default client role");
          setUserRole('client');
          setCurrentView(ViewState.CLIENT_PORTAL);
        }
      } catch (err: any) {
        if (err.name === 'AbortError' || err.message?.includes('aborted')) return;
        console.error('Error checking session:', err);
      } finally {
        setLoading(false);
        clearTimeout(failsafe);
      }
    };

    checkSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      console.log("App: onAuthStateChange fired, event:", _event, "session:", !!session);
      setSession(session);
      if (session) {
        await fetchUserRole(session.user.id);
      } else {
        setShowLanding(!window.location.hash.includes('type=recovery') && !window.location.href.includes('error=access_denied'));
        setUserRole('client');
        setCurrentView(ViewState.CLIENT_PORTAL);
      }
      setLoading(false);
    });

    return () => {
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

  if (showLanding) {
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
      />

      {/* Main Content Area */}
      <main className="flex-1 relative flex flex-col overflow-hidden">
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
