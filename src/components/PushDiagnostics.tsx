import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle2, XCircle, Loader2, RefreshCw } from 'lucide-react';
import { isPushSupported, getNotificationPermission, registerPushSubscription } from '../pushNotifications';

interface DiagnosticResult {
  name: string;
  status: 'success' | 'error' | 'warning' | 'info';
  message: string;
  details?: string;
}

export const PushDiagnostics: React.FC<{ waiterId?: string }> = ({ waiterId }) => {
  const [diagnostics, setDiagnostics] = useState<DiagnosticResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [, setSubscription] = useState<PushSubscription | null>(null);
  const [registering, setRegistering] = useState(false);

  const runDiagnostics = async () => {
    setLoading(true);
    const results: DiagnosticResult[] = [];

    // 1. Verificar soporte de Service Worker
    if ('serviceWorker' in navigator) {
      results.push({
        name: 'Service Worker',
        status: 'success',
        message: 'Soportado',
        details: 'El navegador soporta Service Workers'
      });
    } else {
      results.push({
        name: 'Service Worker',
        status: 'error',
        message: 'No soportado',
        details: 'Tu navegador no soporta Service Workers'
      });
    }

    // 2. Verificar soporte de Push Manager
    if ('PushManager' in window) {
      results.push({
        name: 'Push Manager',
        status: 'success',
        message: 'Soportado',
        details: 'El navegador soporta Push API'
      });
    } else {
      results.push({
        name: 'Push Manager',
        status: 'error',
        message: 'No soportado',
        details: 'Tu navegador no soporta Push API'
      });
    }

    // 3. Verificar soporte de Notificaciones
    if ('Notification' in window) {
      results.push({
        name: 'Notifications API',
        status: 'success',
        message: 'Soportado',
        details: 'El navegador soporta Notifications API'
      });
    } else {
      results.push({
        name: 'Notifications API',
        status: 'error',
        message: 'No soportado',
        details: 'Tu navegador no soporta Notifications API'
      });
    }

    // 4. Verificar si es PWA instalada (iOS)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                         (window.navigator as any).standalone === true ||
                         document.referrer.includes('android-app://');
    
    if (isStandalone) {
      results.push({
        name: 'PWA Instalada',
        status: 'success',
        message: 'Sí',
        details: 'La app está instalada como PWA (requerido para push en iOS)'
      });
    } else {
      results.push({
        name: 'PWA Instalada',
        status: 'warning',
        message: 'No detectada',
        details: 'En iOS, las push notifications solo funcionan si la app está instalada desde la pantalla de inicio'
      });
    }

    // 5. Verificar permisos de notificaciones
    const permission = getNotificationPermission();
    if (permission === 'granted') {
      results.push({
        name: 'Permisos de Notificaciones',
        status: 'success',
        message: 'Concedidos',
        details: 'Tienes permisos para recibir notificaciones'
      });
    } else if (permission === 'denied') {
      results.push({
        name: 'Permisos de Notificaciones',
        status: 'error',
        message: 'Denegados',
        details: 'Los permisos están denegados. Ve a Configuración → Safari → Notificaciones para cambiarlo'
      });
    } else {
      results.push({
        name: 'Permisos de Notificaciones',
        status: 'warning',
        message: 'No concedidos',
        details: 'Necesitas conceder permisos para recibir notificaciones'
      });
    }

    // 6. Verificar Service Worker registrado
    try {
      const registration = await navigator.serviceWorker.ready;
      if (registration) {
        results.push({
          name: 'Service Worker Registrado',
          status: 'success',
          message: 'Sí',
          details: `Estado: ${registration.active?.state || 'unknown'}`
        });
      }
    } catch (error) {
      results.push({
        name: 'Service Worker Registrado',
        status: 'error',
        message: 'Error',
        details: `No se pudo obtener el service worker: ${error}`
      });
    }

    // 7. Verificar suscripción push existente
    try {
      const registration = await navigator.serviceWorker.ready;
      const existingSubscription = await registration.pushManager.getSubscription();
      if (existingSubscription) {
        setSubscription(existingSubscription);
        results.push({
          name: 'Suscripción Push',
          status: 'success',
          message: 'Activa',
          details: `Endpoint: ${existingSubscription.endpoint.substring(0, 50)}...`
        });
      } else {
        results.push({
          name: 'Suscripción Push',
          status: 'warning',
          message: 'No suscrito',
          details: 'No hay una suscripción activa. Usa el botón "Registrar Push" para suscribirte'
        });
      }
    } catch (error) {
      results.push({
        name: 'Suscripción Push',
        status: 'error',
        message: 'Error al verificar',
        details: `Error: ${error}`
      });
    }

    // 8. Verificar VAPID Key configurada
    const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
    console.log('[Diagnóstico] VAPID Key check:', {
      exists: !!vapidKey,
      length: vapidKey?.length || 0,
      preview: vapidKey ? `${vapidKey.substring(0, 20)}...` : 'undefined',
      allEnvKeys: Object.keys(import.meta.env).filter(k => k.startsWith('VITE_'))
    });
    
    if (vapidKey && vapidKey.trim().length > 0) {
      results.push({
        name: 'VAPID Public Key',
        status: 'success',
        message: 'Configurada',
        details: `Key: ${vapidKey.substring(0, 20)}... (${vapidKey.length} caracteres)`
      });
    } else {
      results.push({
        name: 'VAPID Public Key',
        status: 'error',
        message: 'No configurada',
        details: 'Necesitas configurar VITE_VAPID_PUBLIC_KEY en Vercel Environment Variables y hacer redeploy. Verifica que esté en Production environment.'
      });
    }

    // 9. Verificar URL de suscripción
    const subscriptionUrl = import.meta.env.VITE_PUSH_SUBSCRIPTION_URL;
    if (subscriptionUrl) {
      results.push({
        name: 'Push Subscription URL',
        status: 'success',
        message: 'Configurada',
        details: `URL: ${subscriptionUrl}`
      });
    } else {
      results.push({
        name: 'Push Subscription URL',
        status: 'warning',
        message: 'No configurada',
        details: 'VITE_PUSH_SUBSCRIPTION_URL no está configurada. Las suscripciones no se enviarán al backend'
      });
    }

    setDiagnostics(results);
    setLoading(false);
  };

  useEffect(() => {
    runDiagnostics();
  }, []);

  const handleRegisterPush = async () => {
    setRegistering(true);
    try {
      const newSubscription = await registerPushSubscription(waiterId);
      if (newSubscription) {
        setSubscription(newSubscription);
        await runDiagnostics(); // Re-ejecutar diagnósticos
        alert('✅ Suscripción push registrada exitosamente!\n\nLa suscripción se ha creado correctamente. Si VITE_PUSH_SUBSCRIPTION_URL está configurada, también se envió al backend.');
      } else {
        alert('❌ No se pudo registrar la suscripción. Revisa los diagnósticos arriba.');
      }
    } catch (error: any) {
      console.error('Error al registrar push:', error);
      const errorMessage = error?.message || error?.toString() || 'Error desconocido';
      alert(`❌ Error al registrar suscripción:\n\n${errorMessage}\n\nRevisa los diagnósticos arriba para más detalles.`);
    } finally {
      setRegistering(false);
    }
  };

  const handleTestNotification = async () => {
    if (Notification.permission === 'granted') {
      new Notification('Test de Notificación', {
        body: 'Si ves esto, las notificaciones funcionan cuando la app está abierta',
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-192.png',
        tag: 'test-notification'
      });
    } else {
      alert('Primero necesitas conceder permisos de notificaciones');
    }
  };

  const getStatusIcon = (status: DiagnosticResult['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle2 size={16} className="text-green-500" />;
      case 'error':
        return <XCircle size={16} className="text-red-500" />;
      case 'warning':
        return <AlertCircle size={16} className="text-amber-500" />;
      default:
        return <AlertCircle size={16} className="text-blue-500" />;
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">
          Diagnóstico de Push Notifications
        </h3>
        <button
          onClick={runDiagnostics}
          disabled={loading}
          className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
          title="Refrescar diagnósticos"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 size={24} className="animate-spin text-indigo-600" />
        </div>
      ) : (
        <>
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {diagnostics.map((diagnostic, index) => (
              <div
                key={index}
                className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 border border-gray-100"
              >
                {getStatusIcon(diagnostic.status)}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-black text-slate-900 mb-1">
                    {diagnostic.name}
                  </p>
                  <p className={`text-[10px] font-medium ${
                    diagnostic.status === 'success' ? 'text-green-700' :
                    diagnostic.status === 'error' ? 'text-red-700' :
                    diagnostic.status === 'warning' ? 'text-amber-700' :
                    'text-blue-700'
                  }`}>
                    {diagnostic.message}
                  </p>
                  {diagnostic.details && (
                    <p className="text-[9px] text-slate-500 mt-1">
                      {diagnostic.details}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-2 pt-4 border-t border-gray-200">
            <button
              onClick={handleRegisterPush}
              disabled={registering || !isPushSupported()}
              className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {registering ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Registrando...
                </>
              ) : (
                'Registrar Push Subscription'
              )}
            </button>
            <button
              onClick={handleTestNotification}
              disabled={Notification.permission !== 'granted'}
              className="px-4 py-2 bg-gray-100 text-slate-700 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-gray-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Probar Notificación Local
            </button>
          </div>
        </>
      )}
    </div>
  );
};
