import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { useSupabaseData } from '../hooks/useSupabaseData';
import { GananciasDriverView } from './GananciasDriverView';
import { HistoricoDriverView } from './HistoricoDriverView';
import { buildFomentoPayload } from '../utils/fomentoHelper';
import { jsPDF } from 'jspdf';

const VAPID_PUBLIC_KEY = 'BIkf8Kxpm3nN7n1ShQhbTS6TKWLummppl6-hXos65jNkvi7BL0Rm8z2fYhKBKBvroSy9GIub9D6pDaGLcAgvi44';

function urlBase64ToUint8Array(base64String: string) {
   const padding = '='.repeat((4 - base64String.length % 4) % 4);
   const base64 = (base64String + padding)
      .replace(/\-/g, '+')
      .replace(/_/g, '/');

   const rawData = window.atob(base64);
   const outputArray = new Uint8Array(rawData.length);

   for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
   }
   return outputArray;
}

export const DriverAppView: React.FC = () => {
   const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);
   const [myUserId, setMyUserId] = useState<string | null>(null);

   const { data: drivers, updateItem: updateDriver } = useSupabaseData('drivers');
   const { data: allBookings, updateItem: updateBooking } = useSupabaseData('bookings');
   const { data: shifts } = useSupabaseData('shifts');
   const { data: vehicles, updateItem: updateVehicle } = useSupabaseData('vehicles');
   const { data: correctionRequests, refresh: refreshRequests } = useSupabaseData('time_correction_requests', { orderBy: 'created_at', ascending: false });
   const { data: myLogs, refresh: refreshLogs } = useSupabaseData('driver_logs', { orderBy: 'clock_in', ascending: false });
   const { data: municipalities } = useSupabaseData('municipalities');
   const { data: settings } = useSupabaseData('system_settings');

   useEffect(() => {
      supabase.auth.getSession().then(({ data: { session } }) => {
         if (session?.user) {
            setMyUserId(session.user.id);
         }
      });
   }, []);

   const activeDriver = drivers?.find((d: any) => d.id === selectedDriverId);

   // Shifts & Logs state
   const [currentLog, setCurrentLog] = useState<any>(null);
   const [weeklyEarnings, setWeeklyEarnings] = useState(0);
   const [alerts, setAlerts] = useState<any[]>([]);
   const [activeTab, setActiveTab] = useState<'services' | 'history' | 'earnings' | 'jornada'>('services');

   // Payment Modal State
   const [paymentModalOpen, setPaymentModalOpen] = useState(false);
   const [collectingBooking, setCollectingBooking] = useState<any>(null);
   const [cashAmount, setCashAmount] = useState('');
   const [tpvAmount, setTpvAmount] = useState('');
   const [actualPaymentMethod, setActualPaymentMethod] = useState<'Efectivo' | 'TPV' | 'Mixto'>('Efectivo');

   // KM Prompt State
   const [kmModalOpen, setKmModalOpen] = useState(false);
   const [currentKm, setCurrentKm] = useState('');
   const [vehicleCondition, setVehicleCondition] = useState('Impecable');
   const [fuelLevel, setFuelLevel] = useState('100%');
   const [incidenceNotes, setIncidenceNotes] = useState('');
   const [photoFile, setPhotoFile] = useState<File | null>(null);
   const [uploadingPhoto, setUploadingPhoto] = useState(false);
   const [pendingAction, setPendingAction] = useState<'clockIn' | 'clockOut' | null>(null);

   
   // Cartel configuration is now in ReservasView
   const [upcomingCollapsed, setUpcomingCollapsed] = useState(false);
   const [expandedBookingId, setExpandedBookingId] = useState<string | null>(null);

   const [isSubscribed, setIsSubscribed] = useState(false);
   const [subscriptionLoading, setSubscriptionLoading] = useState(false);

   useEffect(() => {
      checkSubscription();
   }, [myUserId]);

   const checkSubscription = async () => {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
      
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      setIsSubscribed(!!subscription);
   };

   const subscribeUser = async () => {
      setSubscriptionLoading(true);
      try {
         const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
         const isStandalone = (window.navigator as any).standalone || window.matchMedia('(display-mode: standalone)').matches;

         if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
            if (isIOS && !isStandalone) {
               throw new Error('En iPhone, debes "Añadir a pantalla de inicio" para activar las notificaciones.');
            }
            throw new Error('Tu navegador no soporta notificaciones push.');
         }

         const registration = await navigator.serviceWorker.register('/sw.js');
         const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
         });

         const { error } = await supabase
            .from('push_subscriptions')
            .upsert({
               user_id: myUserId,
               subscription: subscription.toJSON()
            }, { onConflict: 'user_id' });

         if (error) throw error;

         setIsSubscribed(true);
         // addToast({ title: 'Notificaciones Activas', description: 'Recibirás avisos de tus próximos servicios.', type: 'success' });
      } catch (err: any) {
         console.error('Error al suscribir:', err);
         alert(err.message || 'No se pudieron activar las notificaciones.');
      } finally {
         setSubscriptionLoading(false);
      }
   };

   const unsubscribeUser = async () => {
      setSubscriptionLoading(true);
      try {
         const registration = await navigator.serviceWorker.ready;
         const subscription = await registration.pushManager.getSubscription();
         if (subscription) {
            await subscription.unsubscribe();
            await supabase.from('push_subscriptions').delete().eq('user_id', myUserId);
         }
         setIsSubscribed(false);
         // addToast({ title: 'Notificaciones Desactivadas', description: 'Ya no recibirás avisos automáticos.', type: 'info' });
      } catch (err: any) {
         alert('No se pudieron desactivar las notificaciones.');
      } finally {
         setSubscriptionLoading(false);
      }
   };

   const [currentTime, setCurrentTime] = useState(new Date());

   useEffect(() => {
      const timer = setInterval(() => setCurrentTime(new Date()), 60000);
      return () => clearInterval(timer);
   }, []);

   const getTimeRemaining = (pickupDate: string, pickupTime: string) => {
      try {
         const [hours, minutes] = pickupTime.split(':').map(Number);
         const targetDate = new Date(pickupDate);
         targetDate.setHours(hours, minutes, 0, 0);

         const diffMs = targetDate.getTime() - currentTime.getTime();
         const diffMins = Math.round(diffMs / 60000);

         if (diffMins <= 0) return null;
         if (diffMins < 60) return `Siguiente traslado en ${diffMins} minutos`;
         
         const diffHours = Math.floor(diffMins / 60);
         const remainingMins = diffMins % 60;
         if (remainingMins === 0) return `Siguiente traslado en ${diffHours} ${diffHours === 1 ? 'hora' : 'horas'}`;
         return `Siguiente traslado en ${diffHours}h ${remainingMins}min`;
      } catch (e) {
         return null;
      }
   };

   const nowDate = new Date();
   const todayStr = nowDate.toISOString().split('T')[0];
   const yesterdayDate = new Date(nowDate); yesterdayDate.setDate(nowDate.getDate() - 1);
   const yesterdayStr = yesterdayDate.toISOString().split('T')[0];
   const tomorrowDate = new Date(nowDate); tomorrowDate.setDate(nowDate.getDate() + 1);
   const tomorrowStr = tomorrowDate.toISOString().split('T')[0];

   const driverBookings = allBookings?.filter((b: any) => {
      if (b.driver_id !== selectedDriverId) return false;
      if (b.status === 'Completed' || b.status === 'Cancelled') return false;
      const bDate = b.pickup_date.split('T')[0];
      return bDate === yesterdayStr || bDate === todayStr || bDate === tomorrowStr;
   }) || [];

   const completedThisWeek = allBookings?.filter((b: any) => {
      if (b.driver_id !== selectedDriverId || b.status !== 'Completed') return false;
      const bDate = new Date(b.pickup_date);
      const now = new Date();
      const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
      return bDate >= startOfWeek;
   }) || [];

   // Assigned vehicle for today
   const todayShift = shifts?.find((s: any) => {
      const today = new Date().toISOString().split('T')[0];
      return s.driver_id === selectedDriverId && s.date === today;
   });
   const assignedVehicle = vehicles?.find((v: any) => v.id === todayShift?.vehicle_id);

   // Compartir Coche Logic
   const sharedVehicleAlerts: string[] = [];
   if (assignedVehicle && shifts) {
      const sharedShifts = shifts.filter((s: any) => 
         s.vehicle_id === assignedVehicle.id && 
         s.driver_id !== selectedDriverId && 
         (s.date === todayStr || s.date === tomorrowStr)
      );

      if (sharedShifts.length > 0) {
         const driverNames = Array.from(new Set(sharedShifts.map((s: any) => {
             const d = drivers?.find((d: any) => d.id === s.driver_id);
             return d ? d.name.split(' ')[0] : 'Compañero';
         })));
         const daysArr = Array.from(new Set(sharedShifts.map((s: any) => s.date === todayStr ? 'hoy' : 'mañana')));
         sharedVehicleAlerts.push(`¡Atención! Compartes este vehículo ${daysArr.join(' y ')} con ${driverNames.join(', ')}.`);
      }
   }

   useEffect(() => {
      if (selectedDriverId) {
         checkActiveShift();
         calculateEarnings();

         // Real-time subscription for alerts
         const channel = supabase
            .channel('schema-db-changes')
            .on(
               'postgres_changes',
               {
                  event: '*',
                  schema: 'public',
                  table: 'bookings'
               },
               (payload) => {
                  const eventType = payload.eventType;
                  const newB = payload.new as any;
                  const oldB = payload.old as any;

                  let msg = "";
                  let type = eventType;

                  // NUEVO SERVICIO
                  if (newB?.driver_id === selectedDriverId && (!oldB || oldB.driver_id !== selectedDriverId)) {
                     msg = "¡Nuevo servicio asignado!";
                     type = 'INSERT';
                  }
                  // SERVICIO RETIRADO/CANCELADO
                  else if (oldB?.driver_id === selectedDriverId && newB?.driver_id !== selectedDriverId) {
                     msg = "Un servicio te ha sido retirado o reasignado";
                     type = 'DELETE';
                  }
                  // ACTUALIZACIÓN
                  else if (newB?.driver_id === selectedDriverId) {
                     if (newB.status === 'Cancelled') msg = "Reserva cancelada";
                     else msg = "Reserva actualizada";
                  }

                  if (msg) {
                     const newAlert = { id: Date.now(), msg, type };
                     setAlerts(prev => [newAlert, ...prev]);
                     setTimeout(() => setAlerts(prev => prev.filter(a => a.id !== newAlert.id)), 10000);
                  }
               }
            )
            .subscribe();

         return () => { channel.unsubscribe(); };
      }
   }, [selectedDriverId, allBookings]);

   // GEOLOCATION
   useEffect(() => {
      if (selectedDriverId && activeDriver?.current_status === 'Working') {
         const interval = setInterval(() => {
            navigator.geolocation.getCurrentPosition((pos) => {
               const { latitude, longitude, speed } = pos.coords;
               supabase.from('driver_locations').upsert({
                  driver_id: selectedDriverId,
                  lat: latitude,
                  lng: longitude,
                  updated_at: new Date().toISOString()
               }).then();

               // Track max speed for active bookings
               if (speed !== null && speed > 0 && allBookings) {
                  const speedKmh = Math.round(speed * 3.6);
                  const activeBookings = allBookings.filter((b: any) =>
                     b.driver_id === selectedDriverId &&
                     (b.status === 'En Route' || b.status === 'At Origin' || b.status === 'In Progress')
                  );

                  activeBookings.forEach((b: any) => {
                     const currentMax = Number(b.max_speed) || 0;
                     if (speedKmh > currentMax) {
                        updateBooking(b.id, { max_speed: speedKmh });
                     }
                  });
               }
            });
         }, 30000);
         return () => clearInterval(interval);
      }
   }, [selectedDriverId, activeDriver?.current_status, allBookings]);

   // CHECK FOR FORGOTTEN TRANSFERS
   useEffect(() => {
      if (!selectedDriverId || driverBookings.length === 0) return;

      const interval = setInterval(() => {
         const now = new Date();
         driverBookings.forEach((b: any) => {
            if (b.status === 'Pending' || b.status === 'Confirmed') {
               try {
                  const [hours, minutes] = b.pickup_time.split(':').map(Number);
                  const pickupTime = new Date(b.pickup_date);
                  pickupTime.setHours(hours, minutes, 0, 0);

                  const diffMs = pickupTime.getTime() - now.getTime();
                  const diffMins = Math.round(diffMs / 60000);

                  // Alert at exactly 30, 15, or 5 minutes before pickup if still Pending/Confirmed
                  if (diffMins === 30 || diffMins === 15 || diffMins === 5) {
                     const msg = `⚠️ ¡ATENCIÓN! Tienes un servicio en ${diffMins} minutos y aún no has iniciado el traslado. ¿Estás de camino?`;
                     const newAlert = { id: Date.now() + Math.random(), msg, type: 'URGENT' };
                     setAlerts(prev => [newAlert, ...prev]);
                     setTimeout(() => setAlerts(prev => prev.filter(a => a.id !== newAlert.id)), 30000); // 30s alert
                     
                     if (navigator.vibrate) {
                        navigator.vibrate([300, 100, 300, 100, 800]);
                     }
                  }
               } catch (e) {
                  // ignore parse errors
               }
            }
         });
      }, 60000); // Check every minute

      return () => clearInterval(interval);
   }, [selectedDriverId, driverBookings]);

   const checkActiveShift = async () => {
      const { data } = await supabase
         .from('driver_logs')
         .select('*')
         .eq('driver_id', selectedDriverId)
         .is('clock_out', null)
         .order('clock_in', { ascending: false })
         .limit(1)
         .maybeSingle();

      if (data) setCurrentLog(data);
      else setCurrentLog(null);
   };

   const calculateEarnings = () => {
      const total = completedThisWeek.reduce((acc: number, b: any) => acc + Number(b.collaborator_price || 0), 0);
      setWeeklyEarnings(total);
   };

   const handleClockIn = async () => {
      setPendingAction('clockIn');
      setCurrentKm(assignedVehicle?.km?.toString() || '');
      setKmModalOpen(true);
   };

   const handleClockOut = async () => {
      if (!currentLog) return;
      setPendingAction('clockOut');
      setCurrentKm(assignedVehicle?.km?.toString() || '');
      setKmModalOpen(true);
   };

   const confirmKmAndProceed = async () => {
      const kmValue = parseInt(currentKm);
      if (!isNaN(kmValue) && assignedVehicle) {
         await updateVehicle(assignedVehicle.id, { km: kmValue });
      }

      let uploadedPhotoUrl = null;
      if (photoFile && pendingAction === 'clockIn') {
         setUploadingPhoto(true);
         const fileExt = photoFile.name.split('.').pop();
         const fileName = `${selectedDriverId}-${Date.now()}.${fileExt}`;
         try {
            const { error: uploadError } = await supabase.storage
               .from('driver_photos')
               .upload(fileName, photoFile);
            
            if (!uploadError) {
               const { data: publicUrlData } = supabase.storage.from('driver_photos').getPublicUrl(fileName);
               uploadedPhotoUrl = publicUrlData.publicUrl;
            } else {
               console.error("Error uploading photo:", uploadError);
            }
         } catch (e) {
            console.error("Upload failed", e);
         }
         setUploadingPhoto(false);
      }

      let locationStr = null;
      try {
         const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
            if (!navigator.geolocation) return reject('No geolocation');
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 });
         });
         locationStr = `${pos.coords.latitude},${pos.coords.longitude}`;
      } catch (err) {
         console.warn("No se pudo obtener GPS para el fichaje", err);
      }

      const deviceInfo = navigator.userAgent;
      const now = new Date().toISOString();

      if (pendingAction === 'clockIn') {
         const { data } = await supabase.from('driver_logs').insert([{ 
            driver_id: selectedDriverId, 
            type: 'WORK', 
            clock_in: now,
            clock_in_location: locationStr,
            device_info: deviceInfo,
            start_km: isNaN(kmValue) ? null : kmValue,
            vehicle_condition: vehicleCondition,
            fuel_level: fuelLevel,
            incidence_notes: incidenceNotes,
            photo_url: uploadedPhotoUrl
         }]).select().single();
         await updateDriver(selectedDriverId!, { current_status: 'Working' });
         setCurrentLog(data);

         // Notify Dispatch via Realtime
         if (incidenceNotes.trim()) {
            supabase.channel('schema-db-changes').send({
               type: 'broadcast',
               event: 'incidence_alert',
               payload: { 
                  driver_name: activeDriver?.name, 
                  vehicle: assignedVehicle?.plate,
                  notes: incidenceNotes 
               }
            });
         }
      } else if (pendingAction === 'clockOut') {
         if (!currentLog) return;
         await supabase.from('driver_logs').update({ 
            clock_out: now,
            clock_out_location: locationStr
         }).eq('id', currentLog.id);
         await updateDriver(selectedDriverId!, { current_status: 'Off' });
         setCurrentLog(null);
      }

      // Reset form states
      setPhotoFile(null);
      setIncidenceNotes('');
      setVehicleCondition('Impecable');
      setFuelLevel('100%');
      setKmModalOpen(false);
      setPendingAction(null);
   };

   const handlePauseToggle = async () => {
      if (!currentLog) return;
      
      let locationStr = null;
      try {
         const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
            if (!navigator.geolocation) return reject('No geolocation');
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 });
         });
         locationStr = `${pos.coords.latitude},${pos.coords.longitude}`;
      } catch (err) {
         console.warn("No se pudo obtener GPS para la pausa", err);
      }

      const deviceInfo = navigator.userAgent;
      const now = new Date().toISOString();
      
      // Cerrar log actual
      await supabase.from('driver_logs').update({ 
         clock_out: now,
         clock_out_location: locationStr
      }).eq('id', currentLog.id);

      // Iniciar nuevo log
      if (activeDriver?.current_status === 'Working') {
         const { data } = await supabase.from('driver_logs').insert([{ 
            driver_id: selectedDriverId, 
            type: 'PAUSE', 
            clock_in: now,
            clock_in_location: locationStr,
            device_info: deviceInfo
         }]).select().single();
         await updateDriver(selectedDriverId!, { current_status: 'Paused' });
         setCurrentLog(data);
      } else {
         const { data } = await supabase.from('driver_logs').insert([{ 
            driver_id: selectedDriverId, 
            type: 'WORK', 
            clock_in: now,
            clock_in_location: locationStr,
            device_info: deviceInfo
         }]).select().single();
         await updateDriver(selectedDriverId!, { current_status: 'Working' });
         setCurrentLog(data);
      }
   };

   const updateStatus = async (bookingId: string, status: string) => {
      let currentLog = null;
      try {
         const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
            if (!navigator.geolocation) return reject('No geolocation');
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 });
         });
         currentLog = {
            status,
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            time: new Date().toISOString()
         };
      } catch (err) {
         console.warn("No se pudo obtener GPS para el log", err);
      }

      const bookingToUpdate = allBookings?.find((b: any) => b.id === bookingId);
      let newLogs = bookingToUpdate?.status_logs || [];
      if (currentLog) {
         newLogs = [...newLogs, currentLog];
      }

      await updateBooking(bookingId, { status, status_logs: newLogs });

      // COMUNICAR FOMENTO AUTOMÁTICAMENTE AL CONFIRMAR O INICIAR (Si no está ya comunicado)
      if (bookingToUpdate && (status === 'Confirmed' || status === 'En Route' || status === 'In Progress')) {
         // Respect fomento_auto_sync setting if it exists (defaults to true for safety/driver request)
         const autoSyncSetting = settings?.find((s: any) => s.key === 'fomento_auto_sync');
         const isAutoSyncEnabled = autoSyncSetting ? autoSyncSetting.value === 'true' : true;

         if (isAutoSyncEnabled && bookingToUpdate.fomento_status !== 'COMUNICADO' && bookingToUpdate.fomento_status !== 'INICIADO') {
            try {
               const payload = buildFomentoPayload(bookingToUpdate, shifts || [], vehicles || [], drivers || [], municipalities || []);
               const { data: sessionData } = await supabase.auth.getSession();
               const token = sessionData?.session?.access_token;
               
               const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || (window as any)._env_?.VITE_SUPABASE_URL;
               const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || (window as any)._env_?.VITE_SUPABASE_ANON_KEY;
               
               // Read global env from database settings (defaults to test mode unless explicitly 'production')
               const fomentoEnvSetting = settings?.find((s: any) => s.key === 'fomento_env');
               const isTestMode = fomentoEnvSetting ? fomentoEnvSetting.value === 'test' : false;
               
               fetch(`${supabaseUrl}/functions/v1/fomento-vtc`, {
                  method: 'POST',
                  headers: {
                     'Content-Type': 'application/json',
                     'Authorization': `Bearer ${token || supabaseAnonKey}`,
                     'apikey': supabaseAnonKey
                  },
                  body: JSON.stringify({
                     action: 'alta',
                     payload: { ...payload, is_test: isTestMode }
                  })
               }).then(async res => {
                  const data = await res.json();
                  if (data.success) {
                     await updateBooking(bookingId, {
                        fomento_status: 'COMUNICADO',
                        fomento_idservicio: data.idservicio,
                        fomento_error: null
                     });

                     // If the status is In Progress, also send inicio immediately after alta
                     if (status === 'In Progress') {
                        fetch(`${supabaseUrl}/functions/v1/fomento-vtc`, {
                           method: 'POST',
                           headers: {
                              'Content-Type': 'application/json',
                              'Authorization': `Bearer ${token || supabaseAnonKey}`,
                              'apikey': supabaseAnonKey
                           },
                           body: JSON.stringify({
                              action: 'inicio',
                              payload: { idservicio: data.idservicio, is_test: isTestMode }
                           })
                        }).then(async iniRes => {
                           const iniData = await iniRes.json();
                           if (iniData.success) {
                              await updateBooking(bookingId, { fomento_status: 'INICIADO' });
                           }
                        });
                     }
                  } else {
                     await updateBooking(bookingId, {
                        fomento_status: 'ERROR',
                        fomento_error: data.error || data.resultado || "Error desconocido"
                     });
                  }
               }).catch(async err => {
                  console.error("Error Fomento Background Fetch:", err);
                  try {
                     await updateBooking(bookingId, {
                        fomento_status: 'ERROR',
                        fomento_error: err.message || "Error de red/conexión en segundo plano"
                     });
                  } catch (dbErr) {
                     console.error("No se pudo registrar error de Fomento en DB:", dbErr);
                  }
               });
            } catch (err: any) {
               console.error("No se pudo construir payload Fomento:", err);
               try {
                  await updateBooking(bookingId, {
                     fomento_status: 'ERROR',
                     fomento_error: err.message || "Error al construir datos (Falta matrícula o conductor)"
                  });
               } catch (dbErr) {
                  console.error("No se pudo registrar error en DB:", dbErr);
               }
            }
         } else if (isAutoSyncEnabled && status === 'In Progress' && bookingToUpdate.fomento_status === 'COMUNICADO' && bookingToUpdate.fomento_idservicio) {
            // Already Alta, just do Inicio
            try {
               const { data: sessionData } = await supabase.auth.getSession();
               const token = sessionData?.session?.access_token;
               
               const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || (window as any)._env_?.VITE_SUPABASE_URL;
               const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || (window as any)._env_?.VITE_SUPABASE_ANON_KEY;
               
               const fomentoEnvSetting = settings?.find((s: any) => s.key === 'fomento_env');
               const isTestMode = fomentoEnvSetting ? fomentoEnvSetting.value === 'test' : false;

               fetch(`${supabaseUrl}/functions/v1/fomento-vtc`, {
                  method: 'POST',
                  headers: {
                     'Content-Type': 'application/json',
                     'Authorization': `Bearer ${token || supabaseAnonKey}`,
                     'apikey': supabaseAnonKey
                  },
                  body: JSON.stringify({
                     action: 'inicio',
                     payload: { idservicio: bookingToUpdate.fomento_idservicio, is_test: isTestMode }
                  })
               }).then(async res => {
                  const data = await res.json();
                  if (data.success) {
                     await updateBooking(bookingId, {
                        fomento_status: 'INICIADO'
                     });
                  }
               });
            } catch (e) {
               console.error("Error communicating inicio", e);
            }
         }
      }
   };

   const openGoogleMaps = (address: string) => {
      if (!address) return;
      const encodedAddress = encodeURIComponent(address);
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}&travelmode=driving`, '_blank');
   };

   const initiateCollection = (booking: any) => {
      setCollectingBooking(booking);
      const isCash = booking.payment_method === 'Efectivo';
      setActualPaymentMethod(isCash ? 'Efectivo' : 'TPV');
      if (isCash) {
         setCashAmount(booking.price?.toString() || '');
         setTpvAmount('');
      } else {
         setTpvAmount(booking.price?.toString() || '');
         setCashAmount('');
      }
      setPaymentModalOpen(true);
   };

   
   const generatePDF = (booking: any) => {
      const doc = new jsPDF({ orientation: 'landscape' });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      // Background
      doc.setFillColor(15, 15, 15); // brand-black
      doc.rect(0, 0, pageWidth, pageHeight, 'F');

      if (booking.cartel_logo) {
         try {
            // Depending on image aspect ratio, width/height could be adjusted
            doc.addImage(booking.cartel_logo, 'PNG', pageWidth / 2 - 25, 20, 50, 50);
         } catch(e) {
            console.error("Error adding image to PDF", e);
            // Fallback to text if image fails
            doc.setTextColor(197, 160, 89); // brand-gold
            doc.setFontSize(24);
            doc.text("PALLADIUM TRANSFERS", pageWidth / 2, 40, { align: 'center' });
         }
      } else {
         doc.setTextColor(197, 160, 89); // brand-gold
         doc.setFontSize(24);
         doc.text("PALLADIUM TRANSFERS", pageWidth / 2, 40, { align: 'center' });
      }

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(48);
      // Use cartel_text if present, otherwise fallback to passenger name
      const mainText = booking.cartel_text || booking.passenger;
      doc.text(mainText.toUpperCase(), pageWidth / 2, pageHeight / 2 + 10, { align: 'center' });

      // We can use the notes as subtitle or just omit it if the cartel text overrides it.
      // We will only render subtitle if they provided custom text AND a separate passenger name, but to keep it simple, we just print the main text.

      window.open(doc.output('bloburl'), '_blank');
   };

   const finalizeService = async () => {
      if (!collectingBooking) return;

      const cash = parseFloat(cashAmount) || 0;
      const tpv = parseFloat(tpvAmount) || 0;
      const total = cash + tpv;

      let currentLog = null;
      try {
         const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
            if (!navigator.geolocation) return reject('No geolocation');
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 });
         });
         currentLog = {
            status: 'Completed',
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            time: new Date().toISOString()
         };
      } catch (err) {
         console.warn("No se pudo obtener GPS para el log", err);
      }

      let newLogs = collectingBooking.status_logs || [];
      if (currentLog) {
         newLogs = [...newLogs, currentLog];
      }

      await updateBooking(collectingBooking.id, {
         status: 'Completed',
         collected_amount: total,
         cash_amount: cash,
         tpv_amount: tpv,
         actual_payment_method: actualPaymentMethod,
         status_logs: newLogs
      });
      setPaymentModalOpen(false);
      setCollectingBooking(null);
      setCashAmount('');
      setTpvAmount('');
   };

   // --- CORRECTION REQUESTS FOR DRIVER ---
   const pendingAdminRequests = correctionRequests?.filter((r: any) => r.driver_id === selectedDriverId && r.requested_by === 'ADMIN' && r.status === 'PENDING') || [];
   
   const respondToAdminRequest = async (reqId: string, resolution: 'APPROVED_BY_DRIVER' | 'REJECTED') => {
      try {
         const req = correctionRequests?.find((r: any) => r.id === reqId);
         if (!req) return;

         if (resolution === 'REJECTED') {
            await supabase.from('time_correction_requests').update({ status: 'REJECTED', resolved_at: new Date().toISOString(), resolved_by: 'DRIVER' }).eq('id', reqId);
            alert("Has rechazado la corrección propuesta.");
         } else if (resolution === 'APPROVED_BY_DRIVER') {
            await supabase.from('time_correction_requests').update({ status: 'APPLIED', resolved_at: new Date().toISOString(), resolved_by: 'DRIVER' }).eq('id', reqId);
            
            // Apply the actual change
            await supabase.from('driver_logs').update({
               clock_in: req.proposed_clock_in,
               clock_out: req.proposed_clock_out
            }).eq('id', req.log_id);
            
            alert("Has aceptado la corrección. Tu registro horario ha sido actualizado.");
         }
         refreshRequests();
         refreshLogs();
      } catch (e) {
         console.error(e);
         alert("Error al procesar tu respuesta");
      }
   };

   // Driver requesting a correction
   const [driverProposeModal, setDriverProposeModal] = useState(false);
   const [driverProposeForm, setDriverProposeForm] = useState({ inTime: '', outTime: '', reason: '' });
   const [driverSelectedLog, setDriverSelectedLog] = useState<any>(null);

   const openDriverProposeModal = (log: any) => {
      setDriverSelectedLog(log);
      setDriverProposeForm({
         inTime: new Date(log.clock_in).toISOString().slice(0, 16),
         outTime: log.clock_out ? new Date(log.clock_out).toISOString().slice(0, 16) : '',
         reason: ''
      });
      setDriverProposeModal(true);
   };

   const submitDriverProposal = async () => {
      if (!driverProposeForm.reason.trim()) return alert("El motivo justificado es obligatorio por ley.");
      try {
         await supabase.from('time_correction_requests').insert([{
            log_id: driverSelectedLog.id,
            driver_id: selectedDriverId,
            requested_by: 'DRIVER',
            proposed_clock_in: new Date(driverProposeForm.inTime).toISOString(),
            proposed_clock_out: driverProposeForm.outTime ? new Date(driverProposeForm.outTime).toISOString() : null,
            proposed_type: driverSelectedLog.type,
            reason: driverProposeForm.reason,
            status: 'PENDING'
         }]);
         alert("Tu solicitud de corrección ha sido enviada a la empresa para su validación.");
         setDriverProposeModal(false);
         refreshRequests();
      } catch (e) {
         console.error(e);
         alert("Error al enviar solicitud.");
      }
   };

   // Auto-select if there is exactly one linked driver
   useEffect(() => {
      if (myUserId && drivers && !selectedDriverId) {
         const linkedDriver = drivers.find((d: any) => d.user_id === myUserId);
         if (linkedDriver) {
            setSelectedDriverId(linkedDriver.id);
         }
      }
   }, [myUserId, drivers, selectedDriverId]);

   if (!selectedDriverId) {
      if (!myUserId || !drivers) {
         return <div className="flex-1 bg-brand-black flex items-center justify-center p-8 text-white font-bold">Cargando perfil...</div>;
      }

      return (
         <div className="flex-1 bg-brand-black flex items-center justify-center p-8">
            <div className="bg-brand-charcoal p-8 rounded-3xl border border-white/5 w-full max-w-sm text-center">
               <span className="material-icons-round text-6xl text-brand-platinum/20 mb-4 block">no_accounts</span>
               <h2 className="text-xl font-bold text-white mb-2">Cuenta no vinculada</h2>
               <p className="text-sm text-brand-platinum/50 mb-6">Pide a tu administrador que vincule tu cuenta de usuario con un perfil de conductor en la sección de Conductores.</p>
            </div>
         </div>
      );
   }

   return (
      <div className="flex-1 bg-brand-black text-brand-white overflow-y-auto custom-scrollbar pb-20 relative selection:bg-brand-platinum/30 font-sans">
         {/* Background Effects */}
         <div className="fixed inset-0 z-0 pointer-events-none">
            <div className="absolute top-[-10%] left-[-5%] w-[50%] h-[50%] bg-brand-platinum/5 rounded-full blur-[120px] animate-pulse transition-all duration-1000"></div>
            <div className="absolute bottom-[-10%] right-[-5%] w-[50%] h-[50%] bg-brand-gold/5 rounded-full blur-[120px] animate-pulse delay-1000 transition-all duration-1000"></div>
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.02]"></div>
         </div>

         {/* Alerts Portal */}
         <div className="fixed top-4 left-4 right-4 z-50 pointer-events-none flex flex-col gap-2">
            {alerts.map(a => (
               <div key={a.id} className="animate-bounce bg-red-600 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 border border-red-500">
                  <span className="material-icons-round">notifications_active</span>
                  <p className="text-sm font-black uppercase tracking-widest">{a.msg}</p>
               </div>
            ))}
         </div>

         {/* Header */}
         <div className="relative z-10 bg-brand-charcoal/50 backdrop-blur-xl p-4 md:p-8 border-b border-white/5">
            <div className="flex justify-between items-start mb-10">
               <div className="space-y-2">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-brand-platinum text-[8px] font-bold uppercase tracking-[0.3em]">
                     <div className="w-1 h-1 rounded-full bg-brand-platinum animate-pulse"></div>
                     Driver Portal
                  </div>
                  <h1 className="text-4xl font-light tracking-tighter text-white">
                     Hola, <span className="platinum-text font-black">{(activeDriver?.name || '').split(' ')[0]}</span>
                  </h1>
                  <p className={`text-[10px] font-bold uppercase tracking-[0.3em] flex items-center gap-2 ${activeDriver?.current_status === 'Working' ? 'text-emerald-400' : activeDriver?.current_status === 'Paused' ? 'text-amber-400' : 'text-slate-500'}`}>
                     <span className={`w-2 h-2 rounded-full ${activeDriver?.current_status === 'Working' ? 'bg-emerald-400 animate-pulse' : activeDriver?.current_status === 'Paused' ? 'bg-amber-400' : 'bg-slate-700'}`}></span>
                     {activeDriver?.current_status === 'Working' ? 'En servicio' : activeDriver?.current_status === 'Paused' ? 'En pausa' : 'Fuera de servicio'}
                  </p>
               </div>
               <div className="flex gap-2">
                  <button
                     onClick={isSubscribed ? unsubscribeUser : subscribeUser}
                     disabled={subscriptionLoading}
                     className={`px-4 py-2 border rounded-full text-[9px] font-bold uppercase tracking-[0.2em] transition-all flex items-center gap-2 ${
                        isSubscribed 
                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20' 
                        : 'bg-white/5 border-white/10 text-brand-platinum hover:bg-white/10'
                     }`}
                  >
                     <span className="material-icons-round text-xs">
                        {isSubscribed ? 'notifications_active' : 'notifications_none'}
                     </span>
                     {subscriptionLoading ? '...' : isSubscribed ? 'Alertas On' : 'Activar Alertas'}
                  </button>
               </div>
            </div>

            {/* Assigned Vehicle */}
            <div className="mb-8">
               <div className="p-6 bg-brand-black/40 rounded-3xl border border-white/5 flex items-center gap-5 group hover:border-brand-gold/20 transition-all duration-500">
                  <div className="w-14 h-14 bg-brand-gold/10 rounded-2xl flex items-center justify-center text-brand-gold border border-brand-gold/10 group-hover:bg-brand-gold group-hover:text-black transition-all">
                     <span className="material-icons-round text-2xl">directions_car</span>
                  </div>
                  <div>
                     <p className="text-[9px] font-bold text-brand-platinum uppercase tracking-[0.4em] mb-1.5 opacity-50">Vehículo Asignado</p>
                     <p className="text-lg font-light text-white tracking-tight">{assignedVehicle ? `${assignedVehicle.model}` : 'Sin vehículo asignado'} <span className="font-bold text-brand-gold ml-2">{assignedVehicle?.plate}</span></p>
                  </div>
               </div>
               {sharedVehicleAlerts.map((alert, idx) => (
                  <div key={idx} className="mt-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center gap-3 animate-pulse">
                     <span className="material-icons-round text-amber-500 text-sm">warning</span>
                     <p className="text-amber-500 text-[10px] font-bold uppercase tracking-widest">{alert}</p>
                  </div>
               ))}
            </div>

            <div className="bg-brand-charcoal/40 backdrop-blur-md border border-white/5 rounded-[2rem] p-6 hover:border-brand-gold/20 transition-all">
               <p className="text-[9px] font-bold text-brand-gold uppercase tracking-[0.4em] mb-3">Ganancias Semana</p>
               <p className="text-3xl font-light text-white tracking-tighter">{weeklyEarnings.toFixed(2)}€</p>
            </div>

            {activeDriver?.current_status === 'Off' ? (
               <button onClick={handleClockIn} className="w-full mt-8 py-5 bg-white text-brand-black rounded-2xl font-bold uppercase text-[10px] tracking-[0.3em] hover:bg-slate-200 shadow-xl transition-all">
                  Fichar Entrada
               </button>
            ) : (
               <div className="grid grid-cols-2 gap-4 mt-8">
                  <button
                     onClick={handlePauseToggle}
                     className={`py-5 rounded-2xl font-bold uppercase text-[10px] tracking-[0.3em] border transition-all ${activeDriver?.current_status === 'Paused'
                        ? 'bg-amber-600 text-white border-amber-500 shadow-lg shadow-amber-900/20'
                        : 'bg-white/5 text-amber-500 border-white/10 hover:bg-amber-500 hover:text-white'
                        }`}
                  >
                     {activeDriver?.current_status === 'Paused' ? 'Reanudar' : 'Pausa'}
                  </button>
                  <button onClick={handleClockOut} className="py-5 bg-white/5 text-red-500 border border-white/10 rounded-2xl font-bold uppercase text-[10px] tracking-[0.3em] hover:bg-red-500 hover:text-white transition-all">
                     Fichar Salida
                  </button>
               </div>
            )}
            
            {/* Banner de peticiones pendientes */}
            {pendingAdminRequests.length > 0 && (
               <div className="mt-6 space-y-3">
                  {pendingAdminRequests.map((req: any) => (
                     <div key={req.id} className="bg-brand-gold/10 border border-brand-gold/40 rounded-2xl p-5 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-3 opacity-10">
                           <span className="material-icons-round text-6xl text-brand-gold">warning</span>
                        </div>
                        <div className="relative z-10">
                           <h3 className="text-brand-gold font-black uppercase tracking-widest text-[10px] mb-2 flex items-center gap-2">
                              <span className="material-icons-round text-sm">edit_calendar</span>
                              La empresa propone una corrección
                           </h3>
                           <p className="text-xs text-brand-platinum mb-3 leading-relaxed">
                              Se ha propuesto cambiar tu horario del <span className="font-bold text-white">{new Date(req.proposed_clock_in).toLocaleDateString()}</span>.<br/>
                              <span className="opacity-60">Nuevo Inicio:</span> {new Date(req.proposed_clock_in).toLocaleTimeString()}<br/>
                              <span className="opacity-60">Nuevo Fin:</span> {req.proposed_clock_out ? new Date(req.proposed_clock_out).toLocaleTimeString() : 'N/A'}<br/>
                              <span className="font-bold text-brand-gold mt-2 block">Motivo: "{req.reason}"</span>
                           </p>
                           <p className="text-[9px] text-white/50 mb-4 italic">Por ley, debes confirmar si estás de acuerdo con esta corrección.</p>
                           <div className="flex gap-2">
                              <button onClick={() => respondToAdminRequest(req.id, 'APPROVED_BY_DRIVER')} className="flex-1 bg-emerald-500 text-brand-black text-[10px] font-black uppercase tracking-widest py-3 rounded-xl shadow-lg shadow-emerald-500/20">Aceptar</button>
                              <button onClick={() => respondToAdminRequest(req.id, 'REJECTED')} className="flex-1 bg-red-500/20 text-red-400 border border-red-500/30 text-[10px] font-black uppercase tracking-widest py-3 rounded-xl">Rechazar</button>
                           </div>
                        </div>
                     </div>
                  ))}
               </div>
            )}
         </div>

         {/* Navigation Tabs */}
         <div className="relative z-10 px-4 md:px-8 mt-6">
            <div className="flex bg-brand-charcoal/40 backdrop-blur-md p-1 rounded-2xl border border-white/5 overflow-x-auto no-scrollbar snap-x">
               <button
                  onClick={() => setActiveTab('services')}
                  className={`min-w-[100px] flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all snap-start ${activeTab === 'services' ? 'bg-white text-brand-black shadow-lg' : 'text-brand-platinum/30 hover:text-white'}`}
               >
                  <span className="material-icons-round text-sm">assignment</span>
                  Servicios
               </button>
               <button
                  onClick={() => setActiveTab('history')}
                  className={`min-w-[100px] flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all snap-start ${activeTab === 'history' ? 'bg-brand-platinum text-brand-black shadow-lg' : 'text-brand-platinum/30 hover:text-white'}`}
               >
                  <span className="material-icons-round text-sm">history</span>
                  Histórico
               </button>
               <button
                  onClick={() => setActiveTab('earnings')}
                  className={`min-w-[100px] flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all snap-start ${activeTab === 'earnings' ? 'bg-brand-gold text-brand-black shadow-lg' : 'text-brand-platinum/30 hover:text-white'}`}
               >
                  <span className="material-icons-round text-sm">payments</span>
                  Ganancias
               </button>
               <button
                  onClick={() => setActiveTab('jornada')}
                  className={`min-w-[100px] flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all snap-start ${activeTab === 'jornada' ? 'bg-blue-500 text-white shadow-lg' : 'text-brand-platinum/30 hover:text-white'}`}
               >
                  <span className="material-icons-round text-sm">timer</span>
                  Jornada
               </button>
            </div>
         </div>

         {activeTab === 'services' ? (
            /* Assignments */
            <div className="relative z-10 p-4 md:p-8 space-y-6 md:space-y-8">
               {(() => {
                  const sortedActiveBookings = [...driverBookings].sort((a: any, b: any) => {
                     const aDateStr = a.pickup_date.split('T')[0];
                     const bDateStr = b.pickup_date.split('T')[0];
                     const aTime = new Date(`${aDateStr}T${a.pickup_time}`).getTime();
                     const bTime = new Date(`${bDateStr}T${b.pickup_time}`).getTime();
                     return aTime - bTime;
                  });
                  
                  const currentBooking = sortedActiveBookings.length > 0 ? sortedActiveBookings[0] : null;
                  const upcomingBookings = sortedActiveBookings.slice(1);
                  
                  // Split into Ayer and Future (Hoy, Mañana)
                  const ayerBookings = upcomingBookings.filter((b: any) => b.pickup_date.split('T')[0] === yesterdayStr);
                  const futureBookings = upcomingBookings.filter((b: any) => b.pickup_date.split('T')[0] === todayStr || b.pickup_date.split('T')[0] === tomorrowStr);
                  
                  const todayDateStr = new Date().toISOString().split('T')[0];
                  const completedToday = completedThisWeek.filter((b: any) => b.pickup_date.split('T')[0] === todayDateStr).sort((a: any, b: any) => {
                     const aDateStr = a.pickup_date.split('T')[0];
                     const bDateStr = b.pickup_date.split('T')[0];
                     const aTime = new Date(`${aDateStr}T${a.pickup_time}`).getTime();
                     const bTime = new Date(`${bDateStr}T${b.pickup_time}`).getTime();
                     return bTime - aTime;
                  });

                  // Helper to parse extras into icons
                  const renderExtrasIcons = (notes: string) => {
                     if (!notes) return null;
                     const text = notes.toLowerCase();
                     const icons = [];
                     if (text.includes('silla') || text.includes('niño')) icons.push({ icon: 'child_care', label: 'Silla de niño' });
                     if (text.includes('maxicosi') || text.includes('bebé')) icons.push({ icon: 'baby_changing_station', label: 'Maxicosi' });
                     if (text.includes('alzador')) icons.push({ icon: 'airline_seat_recline_normal', label: 'Alzador' });
                     if (text.includes('mascota') || text.includes('perro') || text.includes('gato')) icons.push({ icon: 'pets', label: 'Mascota' });
                     if (text.includes('vip')) icons.push({ icon: 'star', label: 'VIP' });
                     
                     if (icons.length === 0) return null;
                     
                     return (
                        <div className="flex gap-2 mt-2">
                           {icons.map((item, idx) => (
                              <div key={idx} className="flex items-center justify-center w-8 h-8 rounded-full bg-brand-gold/20 text-brand-gold" title={item.label}>
                                 <span className="material-icons-round text-[16px]">{item.icon}</span>
                              </div>
                           ))}
                        </div>
                     );
                  };

                  
                  // Render helper for expanded folded cards
                  const renderExpandedDetails = (b: any) => (
                     <div className="mt-4 pt-4 border-t border-white/5 space-y-4 animate-in fade-in slide-in-from-top-2">
                        <div className="grid grid-cols-2 gap-4">
                           <div>
                              <p className="text-[8px] font-bold text-brand-platinum/40 uppercase tracking-[0.3em] mb-1">Recogida</p>
                              <p className="text-xs text-white font-light">{b.origin_address || b.origin}</p>
                           </div>
                           <div>
                              <p className="text-[8px] font-bold text-brand-gold/40 uppercase tracking-[0.3em] mb-1">Destino</p>
                              <p className="text-xs text-white font-light">{b.destination_address || b.destination}</p>
                           </div>
                        </div>
                        <div className="flex gap-4">
                           <div className="bg-brand-black/40 px-3 py-2 rounded-xl flex items-center gap-2">
                              <span className="material-icons-round text-sm text-brand-platinum/50">groups</span>
                              <span className="text-[10px] font-bold text-white uppercase">{b.pax || 1} PAX</span>
                           </div>
                           {b.flight_number && (
                              <div className="bg-brand-black/40 px-3 py-2 rounded-xl flex items-center gap-2">
                                 <span className="material-icons-round text-sm text-brand-platinum/50">flight</span>
                                 <span className="text-[10px] font-bold text-white uppercase">{b.flight_number}</span>
                              </div>
                           )}
                           <div className="bg-brand-black/40 px-3 py-2 rounded-xl flex items-center gap-2">
                              <span className="material-icons-round text-sm text-brand-platinum/50">phone</span>
                              <span className="text-[10px] font-bold text-white uppercase">{b.phone || 'N/A'}</span>
                           </div>
                        </div>
                        {b.notes && (
                           <div className="p-3 bg-brand-platinum/5 rounded-xl border border-white/5">
                              <p className="text-[8px] font-bold text-brand-gold uppercase tracking-widest mb-1">NOTAS:</p>
                              <p className="text-[10px] text-brand-platinum/70 italic">{b.notes}</p>
                           </div>
                        )}
                     </div>
                  );

                  if (!currentBooking && completedToday.length === 0) {
                     return (
                        <div className="p-20 text-center bg-brand-charcoal/20 border border-dashed border-white/5 rounded-[3rem] text-brand-platinum opacity-30 font-light italic">
                           No tienes servicios pendientes por ahora
                        </div>
                     );
                  }

                  return (
                     <div className="space-y-12">
                        {/* AYER BOOKINGS (ABOVE CURRENT) */}
                        {ayerBookings.length > 0 && (
                           <div className="mb-8">
                              <div className="flex items-center gap-4 mb-4">
                                 <div className="w-8 h-px bg-brand-platinum opacity-30"></div>
                                 <h2 className="text-[9px] font-bold text-brand-platinum uppercase tracking-[0.5em]">Servicios de Ayer</h2>
                              </div>
                              <div className="space-y-3">
                                 {ayerBookings.map((b: any) => (
                                    <div key={b.id} className="flex flex-col p-4 bg-brand-charcoal/20 border border-white/5 rounded-2xl relative transition-all">
                                       <div className="flex items-center justify-between">
                                          <div className="flex items-center gap-4">
                                             <div className="text-center px-3 border-r border-white/10">
                                                <p className="text-[10px] text-brand-platinum uppercase font-bold">{b.pickup_time}</p>
                                             </div>
                                             <div>
                                                <p className="text-xs text-white font-bold tracking-widest uppercase">{b.passenger}</p>
                                                <div className="flex items-center gap-2 mt-1">
                                                   <span className="material-icons-round text-[10px] text-brand-platinum/50">route</span>
                                                   <p className="text-[9px] text-brand-platinum/50 uppercase truncate max-w-[150px] sm:max-w-[250px]">{b.origin} → {b.destination}</p>
                                                </div>
                                             </div>
                                          </div>
                                          <div className="flex items-center gap-3">
                                             <span className="px-2 py-1 bg-white/5 rounded-lg text-[8px] uppercase tracking-widest text-brand-platinum">{b.status}</span>
                                             <button 
                                                onClick={() => setExpandedBookingId(expandedBookingId === b.id ? null : b.id)}
                                                className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-brand-gold/20 hover:text-brand-gold text-brand-platinum transition-colors"
                                             >
                                                <span className="material-icons-round text-sm">{expandedBookingId === b.id ? 'expand_less' : 'visibility'}</span>
                                             </button>
                                          </div>
                                       </div>
                                       {expandedBookingId === b.id && renderExpandedDetails(b)}
                                    </div>
                                 ))}
                              </div>
                           </div>
                        )}

                        {/* CURRENT BOOKING */}
                        {currentBooking ? (
                           <div className="mb-8">
                              <div className="flex items-center gap-4 mb-4">
                                 <div className="w-8 h-px bg-brand-gold opacity-50"></div>
                                 <h2 className="text-[9px] font-bold text-brand-gold uppercase tracking-[0.5em] animate-pulse">Servicio Actual</h2>
                              </div>
                              <div className="group relative bg-brand-charcoal/30 backdrop-blur-md border border-white/5 border-l-brand-gold/50 border-l-4 rounded-3xl md:rounded-[2.5rem] p-5 md:p-8 overflow-hidden transition-all duration-500 hover:bg-brand-charcoal/50 shadow-[0_0_40px_rgba(197,160,89,0.05)]">
                                 <div className="flex justify-between items-start mb-10">
                                    <div className="space-y-1">
                                       <div className="flex flex-wrap items-center gap-3 mb-2">
                                          <div className="flex items-center gap-2 bg-brand-gold/10 px-4 py-2 rounded-xl border border-brand-gold/20">
                                             <span className="material-icons-round text-brand-gold text-sm">event</span>
                                             <p className="text-brand-gold font-bold text-sm tracking-widest uppercase">
                                                {new Date(currentBooking.pickup_date).toLocaleDateString('es-ES')} {currentBooking.pickup_time}h
                                             </p>
                                          </div>
                                          {getTimeRemaining(currentBooking.pickup_date, currentBooking.pickup_time) && (
                                             <div className="flex items-center gap-2 bg-emerald-500/10 px-4 py-2 rounded-xl border border-emerald-500/20 animate-pulse">
                                                <span className="material-icons-round text-emerald-500 text-sm">schedule</span>
                                                <p className="text-emerald-500 font-bold text-[10px] tracking-widest uppercase">
                                                   {getTimeRemaining(currentBooking.pickup_date, currentBooking.pickup_time)}
                                                </p>
                                             </div>
                                          )}
                                       </div>
                                       <h3 className="text-lg font-bold text-white tracking-widest uppercase group-hover:platinum-text transition-all leading-tight">{currentBooking.passenger}</h3>
                                       <div className="flex items-center gap-3 mt-1">
                                          <p className="text-brand-platinum text-[10px] font-bold tracking-[0.3em] flex items-center gap-2 uppercase opacity-50">
                                             <span className="material-icons-round text-xs">phone</span> {currentBooking.phone || 'No disponible'}
                                             <span className="ml-2 opacity-30 tracking-[0.5em]">ID: #{currentBooking.display_id || currentBooking.id.slice(0, 6)}</span>
                                          </p>
                                          <div className="flex items-center gap-1 bg-white/5 px-2 py-0.5 rounded-lg border border-white/10">
                                             <span className="material-icons-round text-[10px] text-white">groups</span>
                                             <span className="text-[10px] font-bold text-white uppercase">{currentBooking.pax || 1} PAX</span>
                                          </div>
                                       </div>
                                       {renderExtrasIcons(currentBooking.notes)}
                                    </div>
                                    <div className="flex flex-col items-end gap-2">
                                       <span className={`px-4 py-1.5 rounded-full text-[8px] font-bold uppercase tracking-[0.2em] border ${currentBooking.status === 'Pending' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20 animate-pulse' : 'bg-white/5 text-brand-platinum border-white/10'}`}>
                                          {currentBooking.status}
                                       </span>
                                       <button 
                                          onClick={() => generatePDF(currentBooking)}
                                          className="flex items-center gap-1.5 px-4 py-2 bg-brand-gold/10 border border-brand-gold/20 text-brand-gold rounded-full hover:bg-brand-gold hover:text-black transition-all shadow-[0_0_15px_rgba(197,160,89,0.2)]"
                                       >
                                          <span className="text-[10px] font-black uppercase tracking-widest">LETRERO</span>
                                       </button>
                                    </div>
                                 </div>

                                 <div className="grid md:grid-cols-2 gap-8 mb-10">
                                    <div className="space-y-6">
                                       <div className="flex items-start gap-4 group/loc">
                                          <div className="w-1.5 h-1.5 rounded-full bg-brand-platinum mt-1.5 shrink-0 shadow-[0_0_8px_rgba(142,145,150,0.5)]"></div>
                                          <div>
                                             <p className="text-brand-platinum/40 uppercase font-bold text-[8px] tracking-[0.3em] mb-1.5">Recogida</p>
                                             <p className="text-slate-200 font-light text-sm leading-relaxed tracking-tight group-hover/loc:text-white transition-colors">{currentBooking.origin_address || currentBooking.origin}</p>
                                          </div>
                                       </div>
                                       <div className="flex items-start gap-4 group/loc">
                                          <div className="w-1.5 h-1.5 rounded-full bg-brand-gold mt-1.5 shrink-0 shadow-[0_0_8px_rgba(197,160,89,0.5)]"></div>
                                          <div>
                                             <p className="text-brand-gold/40 uppercase font-bold text-[8px] tracking-[0.3em] mb-1.5">Destino</p>
                                             <p className="text-slate-200 font-light text-sm leading-relaxed tracking-tight group-hover/loc:text-white transition-colors">{currentBooking.destination_address || currentBooking.destination}</p>
                                          </div>
                                       </div>
                                    </div>
                                 </div>

                                 <div className="grid grid-cols-2 gap-4 mb-6">
                                    {currentBooking.flight_number && (
                                       <div className="bg-brand-black/30 backdrop-blur-md p-5 rounded-[2rem] border border-white/5 hover:border-white/10 transition-all col-span-2">
                                          <p className="text-[8px] font-bold text-brand-platinum uppercase tracking-[0.3em] mb-2 opacity-50 italic">Vuelo</p>
                                          <p className="text-sm font-light text-white flex items-center gap-2 tracking-tight uppercase">
                                             <span className="material-icons-round text-sm opacity-50">flight</span> {currentBooking.flight_number}
                                          </p>
                                       </div>
                                    )}
                                 </div>

                                 {currentBooking.notes && (
                                    <div className="mb-8 p-6 bg-brand-platinum/5 border border-brand-platinum/10 rounded-[2rem] relative overflow-hidden">
                                       <div className="absolute top-0 right-0 p-3 opacity-10">
                                          <span className="material-icons-round text-4xl">info</span>
                                       </div>
                                       <p className="text-[8px] font-bold text-brand-platinum uppercase tracking-[0.4em] mb-3 flex justify-between">
                                          NOTAS DEL SERVICIO
                                       </p>
                                       <p className="text-[11px] text-slate-300 leading-relaxed font-light italic uppercase tracking-wider">{currentBooking.notes}</p>
                                    </div>
                                 )}

                                 <div className="grid grid-cols-1 gap-3">
                                    {currentBooking.status === 'Pending' && (
                                       <button onClick={() => updateStatus(currentBooking.id, 'Confirmed')} className="w-full py-5 bg-white text-brand-black rounded-2xl text-[10px] font-bold uppercase tracking-[0.3em] shadow-xl hover:bg-slate-200 transition-all">Confirmar Recepción</button>
                                    )}
                                    {currentBooking.status === 'Confirmed' && (
                                       <button onClick={() => { updateStatus(currentBooking.id, 'En Route'); openGoogleMaps(currentBooking.origin_address || currentBooking.origin); }} className="w-full py-5 bg-white/5 border border-white/10 text-white rounded-2xl text-[10px] font-bold uppercase tracking-[0.3em] hover:bg-white/10 transition-all">De Camino</button>
                                    )}
                                    {currentBooking.status === 'En Route' && (
                                       <button onClick={() => updateStatus(currentBooking.id, 'At Origin')} className="w-full py-5 bg-white/5 border border-white/10 text-white rounded-2xl text-[10px] font-bold uppercase tracking-[0.3em] hover:bg-white/10 transition-all">En Origen</button>
                                    )}
                                    {currentBooking.status === 'At Origin' && (
                                       <button onClick={() => { updateStatus(currentBooking.id, 'In Progress'); openGoogleMaps(currentBooking.destination_address || currentBooking.destination); }} className="w-full py-5 bg-brand-gold text-brand-black rounded-2xl text-[10px] font-bold uppercase tracking-[0.3em] hover:bg-brand-gold/90 transition-all shadow-lg shadow-brand-gold/20">Pasajero a Bordo</button>
                                    )}
                                    {currentBooking.status === 'In Progress' && (
                                       <button onClick={() => initiateCollection(currentBooking)} className="w-full py-5 bg-emerald-600 text-white rounded-2xl text-[10px] font-bold uppercase tracking-[0.3em] hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-900/40">Finalizar Traslado</button>
                                    )}
                                 </div>
                              </div>
                           </div>
                        ) : null}

                        {/* UPCOMING BOOKINGS (Future) */}
                        {futureBookings.length > 0 && (
                           <div>
                              <div 
                                 className="flex items-center justify-between mb-4 cursor-pointer group"
                                 onClick={() => setUpcomingCollapsed(!upcomingCollapsed)}
                              >
                                 <div className="flex items-center gap-4">
                                    <div className="w-8 h-px bg-brand-platinum opacity-30 group-hover:bg-brand-gold transition-colors"></div>
                                    <h2 className="text-[9px] font-bold text-brand-platinum group-hover:text-brand-gold transition-colors uppercase tracking-[0.5em]">
                                       Próximos Servicios ({futureBookings.length})
                                    </h2>
                                 </div>
                                 <span className="material-icons-round text-brand-platinum/50 group-hover:text-brand-gold text-sm transition-all">
                                    {upcomingCollapsed ? 'expand_more' : 'expand_less'}
                                 </span>
                              </div>
                              
                              {!upcomingCollapsed && (
                                 <div className="space-y-6">
                                    {['Hoy', 'Mañana'].map(dayGroup => {
                                       const targetStr = dayGroup === 'Hoy' ? todayStr : tomorrowStr;
                                       const groupBookings = futureBookings.filter((b: any) => b.pickup_date.split('T')[0] === targetStr);
                                       if (groupBookings.length === 0) return null;
                                       
                                       return (
                                          <div key={dayGroup} className="space-y-3">
                                             <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest pl-2">
                                                {dayGroup} - {new Date(targetStr).toLocaleDateString('es-ES')}
                                             </p>
                                             {groupBookings.map((b: any) => (
                                                <div key={b.id} className="flex flex-col p-4 bg-brand-charcoal/20 border border-white/5 rounded-2xl relative transition-all">
                                                   <div className="flex items-center justify-between">
                                                      <div className="flex items-center gap-4">
                                                         <div className="text-center px-3 border-r border-white/10">
                                                            <p className="text-[10px] text-brand-platinum uppercase font-bold">{b.pickup_time}</p>
                                                         </div>
                                                         <div>
                                                            <p className="text-xs text-white font-bold tracking-widest uppercase">{b.passenger}</p>
                                                            <div className="flex items-center gap-2 mt-1">
                                                               <span className="material-icons-round text-[10px] text-brand-platinum/50">route</span>
                                                               <p className="text-[9px] text-brand-platinum/50 uppercase truncate max-w-[150px] sm:max-w-[250px]">{b.origin} → {b.destination}</p>
                                                            </div>
                                                         </div>
                                                      </div>
                                                      <div className="flex flex-col items-end gap-2">
                                                         <div className="flex items-center gap-3">
                                                            <span className="px-2 py-1 bg-white/5 rounded-lg text-[8px] uppercase tracking-widest text-brand-platinum">{b.status}</span>
                                                            <button 
                                                               onClick={() => setExpandedBookingId(expandedBookingId === b.id ? null : b.id)}
                                                               className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-brand-gold/20 hover:text-brand-gold text-brand-platinum transition-colors"
                                                            >
                                                               <span className="material-icons-round text-sm">{expandedBookingId === b.id ? 'expand_less' : 'visibility'}</span>
                                                            </button>
                                                         </div>
                                                         {getTimeRemaining(b.pickup_date, b.pickup_time) && (
                                                            <span className="text-[8px] font-bold text-emerald-500 uppercase tracking-widest bg-emerald-500/10 px-2 py-1 rounded">
                                                               {getTimeRemaining(b.pickup_date, b.pickup_time)}
                                                            </span>
                                                         )}
                                                      </div>
                                                   </div>
                                                   {expandedBookingId === b.id && renderExpandedDetails(b)}
                                                </div>
                                             ))}
                                          </div>
                                       );
                                    })}
                                 </div>
                              )}
                           </div>
                        )}

                        {/* PAST BOOKINGS TODAY */}
                        {completedToday.length > 0 && (
                           <div>
                              <div className="flex items-center gap-4 mb-4">
                                 <div className="w-8 h-px bg-emerald-500 opacity-30"></div>
                                 <h2 className="text-[9px] font-bold text-emerald-500 uppercase tracking-[0.5em]">Servicios Realizados (Hoy)</h2>
                              </div>
                              <div className="space-y-3 opacity-60">
                                 {completedToday.map((b: any) => (
                                    <div key={b.id} className="flex items-center justify-between p-4 bg-emerald-900/10 border border-emerald-500/10 rounded-2xl">
                                       <div className="flex items-center gap-4">
                                          <div className="text-center px-3 border-r border-emerald-500/20">
                                             <p className="text-[10px] text-emerald-500 uppercase font-bold">{b.pickup_time}</p>
                                          </div>
                                          <div>
                                             <p className="text-xs text-emerald-100 font-bold tracking-widest uppercase line-through">{b.passenger}</p>
                                             <p className="text-[9px] text-emerald-500/50 uppercase truncate max-w-[150px] sm:max-w-[250px]">{b.origin} → {b.destination}</p>
                                          </div>
                                       </div>
                                       <span className="material-icons-round text-emerald-500 text-sm">check_circle</span>
                                    </div>
                                 ))}
                              </div>
                           </div>
                        )}
                     </div>
                  );
               })()}
            </div>
         ) : activeTab === 'history' ? (
            <div className="relative z-10">
               <HistoricoDriverView driverId={selectedDriverId} />
            </div>
         ) : activeTab === 'earnings' ? (
            <div className="relative z-10">
               <GananciasDriverView driverId={selectedDriverId} />
            </div>
         ) : (
            /* Jornada Tab */
            <div className="relative z-10 p-8 space-y-6">
               <div className="flex items-center gap-4 mb-4">
                  <div className="w-8 h-px bg-brand-platinum opacity-30"></div>
                  <h2 className="text-[9px] font-bold text-brand-platinum uppercase tracking-[0.5em]">Registro Horario Oficial</h2>
               </div>
               
               {myLogs?.filter((l: any) => l.driver_id === selectedDriverId).length === 0 ? (
                  <div className="p-20 text-center bg-brand-charcoal/20 border border-dashed border-white/5 rounded-[3rem] text-brand-platinum opacity-30 font-light italic">
                     No tienes fichajes registrados
                  </div>
               ) : (
                  myLogs?.filter((l: any) => l.driver_id === selectedDriverId).slice(0, 30).map((log: any) => {
                     const pendingReq = correctionRequests?.find((r: any) => r.log_id === log.id && r.status === 'PENDING');
                     
                     return (
                        <div key={log.id} className="bg-brand-charcoal/40 border border-white/5 rounded-3xl p-6 group">
                           <div className="flex justify-between items-start mb-4">
                              <div className="flex items-center gap-3">
                                 <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${log.type === 'WORK' ? 'bg-emerald-500/20 text-emerald-500' : 'bg-amber-500/20 text-amber-500'}`}>
                                    <span className="material-icons-round text-lg">{log.type === 'WORK' ? 'directions_car' : 'coffee'}</span>
                                 </div>
                                 <div>
                                    <p className="text-xs font-bold text-white uppercase tracking-wider">{log.type === 'WORK' ? 'Trabajo' : 'Pausa'}</p>
                                    <p className="text-[10px] text-brand-platinum uppercase tracking-widest">{new Date(log.clock_in).toLocaleDateString()}</p>
                                 </div>
                              </div>
                              {pendingReq ? (
                                 <span className="px-2 py-1 bg-brand-gold/20 text-brand-gold border border-brand-gold/30 rounded text-[8px] font-black uppercase tracking-widest">En Revisión</span>
                              ) : (
                                 <button onClick={() => openDriverProposeModal(log)} className="px-3 py-1.5 bg-white/5 border border-white/10 text-brand-platinum hover:text-white rounded-lg text-[9px] font-bold uppercase tracking-widest transition-all">
                                    Solicitar Corrección
                                 </button>
                              )}
                           </div>
                           <div className="flex items-center gap-4 text-sm font-light text-slate-300">
                              <div className="flex items-center gap-2">
                                 <span className="material-icons-round text-sm text-emerald-500 opacity-70">login</span>
                                 {new Date(log.clock_in).toLocaleTimeString()}
                              </div>
                              <span className="text-white/20">→</span>
                              <div className="flex items-center gap-2">
                                 <span className="material-icons-round text-sm text-red-500 opacity-70">logout</span>
                                 {log.clock_out ? new Date(log.clock_out).toLocaleTimeString() : <span className="text-emerald-500 font-bold animate-pulse">Activo</span>}
                              </div>
                           </div>
                        </div>
                     );
                  })
               )}
            </div>
         )}

         {/* Driver Propose Modal */}
         {driverProposeModal && (
            <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
               <div className="bg-brand-charcoal border border-brand-gold/30 rounded-3xl w-full max-w-md p-6">
                  <h2 className="text-lg font-black text-brand-gold mb-2">Solicitar Corrección</h2>
                  <p className="text-xs text-brand-platinum mb-6">
                     ¿Te olvidaste de fichar? Indica la hora correcta. La empresa deberá aprobar tu solicitud para que tenga validez legal.
                  </p>

                  <div className="space-y-4">
                     <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Mi hora de inicio real fue:</label>
                        <input type="datetime-local" value={driverProposeForm.inTime} onChange={e => setDriverProposeForm({...driverProposeForm, inTime: e.target.value})} className="w-full bg-slate-800 text-white p-3 rounded-xl border border-white/5 focus:border-brand-gold outline-none" />
                     </div>
                     <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Mi hora de fin real fue:</label>
                        <input type="datetime-local" value={driverProposeForm.outTime} onChange={e => setDriverProposeForm({...driverProposeForm, outTime: e.target.value})} className="w-full bg-slate-800 text-white p-3 rounded-xl border border-white/5 focus:border-brand-gold outline-none" />
                     </div>
                     <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Motivo / Justificación (Obligatorio)</label>
                        <textarea 
                           value={driverProposeForm.reason} 
                           onChange={e => setDriverProposeForm({...driverProposeForm, reason: e.target.value})} 
                           placeholder="Ej: Me olvidé el móvil en el coche y no pude fichar la salida a tiempo..."
                           className="w-full bg-slate-800 text-white p-3 rounded-xl border border-white/5 focus:border-brand-gold outline-none min-h-[80px]" 
                        />
                     </div>
                  </div>

                  <div className="flex gap-3 mt-8">
                     <button onClick={() => setDriverProposeModal(false)} className="flex-1 bg-white/5 text-white font-bold p-3 rounded-xl hover:bg-white/10 transition">Cancelar</button>
                     <button onClick={submitDriverProposal} className="flex-1 bg-brand-gold text-brand-black font-black uppercase tracking-widest p-3 rounded-xl hover:bg-yellow-500 transition">
                        Enviar Solicitud
                     </button>
                  </div>
               </div>
            </div>
         )}

         {/* Payment Collection Modal */}
         {paymentModalOpen && (
            <div className="fixed inset-0 z-[100] bg-brand-black/95 backdrop-blur-xl flex items-end sm:items-center justify-center p-4">
               <div className="bg-brand-charcoal w-full max-w-sm rounded-[32px] border border-white/5 shadow-2xl p-8 animate-in slide-in-from-bottom duration-300">
                  <div className="text-center mb-8">
                     <div className="w-16 h-16 bg-emerald-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="material-icons-round text-emerald-500 text-3xl">account_balance_wallet</span>
                     </div>
                     <h2 className="text-xl font-black text-white">Registrar Cobro</h2>
                     <p className="text-xs text-brand-platinum/30 mt-1 uppercase tracking-widest">Servicio #{collectingBooking?.display_id}</p>
                  </div>

                  <div className="space-y-6">
                     <div className="flex bg-brand-black p-1 rounded-2xl border border-white/5 mb-6">
                        <button
                           onClick={() => { setActualPaymentMethod('Efectivo'); setTpvAmount(''); setCashAmount(collectingBooking?.price?.toString() || ''); }}
                           className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${actualPaymentMethod === 'Efectivo' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/40' : 'text-brand-platinum/30 hover:text-white'}`}
                        >Efectivo</button>
                        <button
                           onClick={() => { setActualPaymentMethod('TPV'); setCashAmount(''); setTpvAmount(collectingBooking?.price?.toString() || ''); }}
                           className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${actualPaymentMethod === 'TPV' ? 'bg-brand-gold text-brand-black shadow-lg shadow-brand-gold/40' : 'text-brand-platinum/30 hover:text-white'}`}
                        >TPV</button>
                        <button
                           onClick={() => { setActualPaymentMethod('Mixto'); }}
                           className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${actualPaymentMethod === 'Mixto' ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/40' : 'text-brand-platinum/30 hover:text-white'}`}
                        >Mixto</button>
                     </div>

                     <div className="space-y-4">
                        {(actualPaymentMethod === 'Efectivo' || actualPaymentMethod === 'Mixto') && (
                           <div className="animate-in slide-in-from-left duration-300">
                              <label className="text-[10px] font-black text-emerald-500 uppercase tracking-widest block mb-2">Efectivo (€)</label>
                              <input
                                 type="number"
                                 value={cashAmount}
                                 onChange={(e) => setCashAmount(e.target.value)}
                                 className="w-full bg-brand-black border border-white/5 rounded-2xl px-5 py-4 text-xl font-black text-white focus:border-emerald-500 outline-none transition-all"
                                 placeholder="0.00"
                              />
                           </div>
                        )}

                        {(actualPaymentMethod === 'TPV' || actualPaymentMethod === 'Mixto') && (
                           <div className="animate-in slide-in-from-right duration-300">
                              <label className="text-[10px] font-black text-brand-gold uppercase tracking-widest block mb-2">TPV - Tarjeta (€)</label>
                              <input
                                 type="number"
                                 value={tpvAmount}
                                 onChange={(e) => setTpvAmount(e.target.value)}
                                 className="w-full bg-brand-black border border-white/5 rounded-2xl px-5 py-4 text-xl font-black text-white focus:border-blue-500 outline-none transition-all"
                                 placeholder="0.00"
                              />
                           </div>
                        )}

                        {actualPaymentMethod === 'Mixto' && (
                           <div className="pt-2 border-t border-white/5 flex justify-between items-center">
                              <span className="text-[10px] font-black text-brand-platinum/30 uppercase">Total a Cobrar</span>
                              <span className="text-lg font-black text-white">{(parseFloat(cashAmount || '0') + parseFloat(tpvAmount || '0')).toFixed(2)}€</span>
                           </div>
                        )}
                     </div>

                     <div className="pt-4 space-y-3">
                        <button
                           onClick={finalizeService}
                           disabled={!(parseFloat(cashAmount || '0') + parseFloat(tpvAmount || '0') > 0)}
                           className="w-full py-5 bg-gradient-to-r from-emerald-600 to-blue-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:scale-[1.02] active:scale-95 shadow-xl shadow-emerald-900/40 transition-all disabled:opacity-50 disabled:grayscale"
                        >
                           Finalizar y Guardar Cobro
                        </button>
                        <button
                           onClick={() => setPaymentModalOpen(false)}
                           className="w-full py-4 text-brand-platinum/30 hover:text-white font-black uppercase text-[10px] tracking-widest transition-all"
                        >
                           Volver
                        </button>
                     </div>
                  </div>
               </div>
            </div>
         )}

         {/* KM Prompt Modal */}
         {kmModalOpen && (
            <div className="fixed inset-0 z-[100] bg-brand-black/95 backdrop-blur-xl flex items-center justify-center p-4 overflow-y-auto">
               <div className="bg-brand-charcoal w-full max-w-md rounded-[32px] border border-white/5 shadow-2xl p-6 sm:p-8 animate-in zoom-in-95 duration-200 my-8">
                  <div className="text-center mb-6">
                     <div className="w-16 h-16 bg-blue-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="material-icons-round text-blue-500 text-3xl">fact_check</span>
                     </div>
                     <h2 className="text-xl font-black text-white px-4">{pendingAction === 'clockIn' ? 'Fichar Entrada' : 'Fichar Salida'}</h2>
                     <p className="text-xs text-brand-platinum/50 mt-2">Por favor, revisa y completa el parte de vehículo.</p>
                  </div>

                  <div className="space-y-4">
                     <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-brand-platinum uppercase tracking-widest pl-1">Kilometraje Actual</label>
                        <div className="relative">
                           <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-brand-platinum/30 uppercase text-xs">KM</span>
                           <input
                              type="number"
                              value={currentKm}
                              onChange={(e) => setCurrentKm(e.target.value)}
                              className="w-full bg-brand-black border border-white/5 rounded-2xl pl-12 pr-5 py-4 text-xl font-black text-white focus:border-blue-500 outline-none transition-all placeholder-white/10"
                              placeholder="0"
                           />
                        </div>
                     </div>

                     {pendingAction === 'clockIn' && (
                        <>
                           <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-1.5">
                                 <label className="text-[10px] font-bold text-brand-platinum uppercase tracking-widest pl-1">Limpieza/Estado</label>
                                 <select
                                    value={vehicleCondition}
                                    onChange={(e) => setVehicleCondition(e.target.value)}
                                    className="w-full bg-brand-black border border-white/5 rounded-2xl px-4 py-4 text-sm font-bold text-white focus:border-blue-500 outline-none transition-all appearance-none"
                                 >
                                    <option value="Impecable">Impecable</option>
                                    <option value="Aceptable">Aceptable</option>
                                    <option value="Sucio">Sucio</option>
                                 </select>
                              </div>
                              <div className="space-y-1.5">
                                 <label className="text-[10px] font-bold text-brand-platinum uppercase tracking-widest pl-1">Combustible</label>
                                 <select
                                    value={fuelLevel}
                                    onChange={(e) => setFuelLevel(e.target.value)}
                                    className="w-full bg-brand-black border border-white/5 rounded-2xl px-4 py-4 text-sm font-bold text-white focus:border-blue-500 outline-none transition-all appearance-none"
                                 >
                                    <option value="100%">100%</option>
                                    <option value="75%">75%</option>
                                    <option value="50%">50%</option>
                                    <option value="25%">25%</option>
                                    <option value="Reserva">Reserva</option>
                                 </select>
                              </div>
                           </div>

                           <div className="space-y-1.5">
                              <label className="text-[10px] font-bold text-brand-platinum uppercase tracking-widest pl-1">Incidencias / Daños</label>
                              <textarea
                                 value={incidenceNotes}
                                 onChange={(e) => setIncidenceNotes(e.target.value)}
                                 className="w-full bg-brand-black border border-white/5 rounded-2xl px-4 py-3 text-sm text-white focus:border-blue-500 outline-none transition-all resize-none h-20 placeholder-white/20"
                                 placeholder="Opcional. Escribe si hay algún rasguño, ruido, falta de agua..."
                              />
                           </div>

                           <div className="space-y-1.5">
                              <label className="text-[10px] font-bold text-brand-platinum uppercase tracking-widest pl-1">Fotografía (Opcional)</label>
                              <label className="flex items-center justify-center w-full h-16 bg-brand-black border border-white/5 border-dashed rounded-2xl cursor-pointer hover:border-brand-gold/50 transition-all group">
                                 <div className="flex items-center gap-3 overflow-hidden px-4">
                                    <span className="material-icons-round text-brand-platinum group-hover:text-brand-gold transition-colors">add_a_photo</span>
                                    <span className="text-xs font-bold text-brand-platinum group-hover:text-brand-gold transition-colors truncate">
                                       {photoFile ? photoFile.name : 'Subir o tomar foto'}
                                    </span>
                                 </div>
                                 <input 
                                    type="file" 
                                    accept="image/*" 
                                    capture="environment"
                                    className="hidden" 
                                    onChange={(e) => {
                                       if (e.target.files && e.target.files[0]) {
                                          setPhotoFile(e.target.files[0]);
                                       }
                                    }} 
                                 />
                              </label>
                           </div>
                        </>
                     )}

                     <div className="pt-4 grid gap-3">
                        <button
                           onClick={confirmKmAndProceed}
                           disabled={uploadingPhoto}
                           className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-blue-500 active:scale-95 shadow-lg shadow-blue-900/40 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                           {uploadingPhoto && <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>}
                           {uploadingPhoto ? 'Subiendo...' : 'Confirmar y Fichar'}
                        </button>
                        <button
                           onClick={() => { setKmModalOpen(false); setPendingAction(null); setPhotoFile(null); }}
                           disabled={uploadingPhoto}
                           className="w-full py-3 text-brand-platinum/50 hover:text-white font-bold uppercase text-[10px] tracking-widest transition-all"
                        >
                           Cancelar
                        </button>
                     </div>
                  </div>
               </div>
            </div>
         )}

      </div>
   );
};
