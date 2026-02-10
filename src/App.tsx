import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { Bell, LogOut, Loader2, BellRing, X } from 'lucide-react';
import { supabase } from './supabase';
import LoginPage from './pages/LoginPage';
import OrdersPage from './pages/OrdersPage';
import { isPushSupported } from './pushNotifications';
import type { Waiter } from './types';
import { APP_VERSION } from './version';
import { PushDiagnostics } from './components/PushDiagnostics';

interface Restaurant {
  id: string;
  name: string;
}

interface Notification {
  id: string;
  type: 'batch';
  message: string;
  tableNumber: number;
  orderId: string;
  batchId: string;
  timestamp: Date;
  read: boolean;
}

const App: React.FC = () => {
  const [waiter, setWaiter] = useState<Waiter | null>(null);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [waiterTableIds, setWaiterTableIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotificationsPanel, setShowNotificationsPanel] = useState(false);
  const [showPushDiagnostics, setShowPushDiagnostics] = useState(false);
  const [blinkingTableIds, setBlinkingTableIds] = useState<Set<string>>(new Set());
  const [tableMenuData, setTableMenuData] = useState<{
    allTablesWithStatus: Array<{
      tableId: string;
      tableNumber: number;
      orderId: string | null;
      status: string;
      statusColorClass: string;
      hasOrder: boolean;
    }>;
    selectedOrderId: string | null;
    onTableClick: (orderId: string | null) => void;
    tableStripRef: React.RefObject<HTMLDivElement | null>;
    isDraggingStrip: boolean;
    handlers: {
      onPointerDown: (e: React.PointerEvent) => void;
      onPointerMove: (e: React.PointerEvent) => void;
      onPointerUp: (e: React.PointerEvent) => void;
      onPointerLeave: () => void;
      onPointerCancel: (e: React.PointerEvent) => void;
    };
  } | null>(null);
  const navigate = useNavigate();

  // Cerrar panel de notificaciones al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (showNotificationsPanel && !target.closest('[data-notifications-panel]') && !target.closest('[data-notifications-button]')) {
        setShowNotificationsPanel(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showNotificationsPanel]);


  const handleLoginSuccess = (w: Waiter, r: Restaurant) => {
    setWaiter(w);
    setRestaurant(r);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setWaiter(null);
    setRestaurant(null);
    setWaiterTableIds([]);
    navigate('/login');
  };

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const { data: w } = await supabase
          .from('waiters')
          .select('id, restaurant_id, full_name, nickname, profile_photo_url')
          .eq('user_id', session.user.id)
          .maybeSingle();
        if (w) {
          setWaiter(w);
          const { data: r } = await supabase
            .from('restaurants')
            .select('id, name')
            .eq('id', w.restaurant_id)
            .single();
          if (r) setRestaurant(r);
        }
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        setWaiter(null);
        setRestaurant(null);
        setWaiterTableIds([]);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!waiter?.id) return;
    supabase
      .from('tables')
      .select('id')
      .eq('waiter_id', waiter.id)
      .then(({ data }) => {
        setWaiterTableIds((data || []).map((t: { id: string }) => t.id));
      });
  }, [waiter?.id]);

  // Escuchar mensajes del service worker cuando se hace click en una notificación
  useEffect(() => {
    if (!waiter || !tableMenuData) return;

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'NOTIFICATION_CLICK') {
        const { orderId, batchId, tableNumber } = event.data.data || {};
        if (orderId && tableMenuData) {
          console.log('[App] Navegando desde notificación:', { orderId, batchId, tableNumber });
          // Marcar el batch como nuevo en localStorage
          if (batchId) {
            const newBatches = JSON.parse(localStorage.getItem('newBatches') || '[]');
            if (!newBatches.includes(batchId)) {
              newBatches.push(batchId);
              localStorage.setItem('newBatches', JSON.stringify(newBatches));
            }
          }
          // Navegar a la mesa
          tableMenuData.onTableClick(orderId);
        }
      }
    };

    navigator.serviceWorker?.addEventListener('message', handleMessage);
    return () => {
      navigator.serviceWorker?.removeEventListener('message', handleMessage);
    };
  }, [waiter, tableMenuData]);

  // Manejar parámetros de URL cuando se abre desde una notificación
  useEffect(() => {
    if (!waiter || !tableMenuData) return;

    const params = new URLSearchParams(window.location.search);
    const orderId = params.get('orderId');
    const batchId = params.get('batchId');
    const tableNumber = params.get('tableNumber');

    if (orderId && tableMenuData) {
      console.log('[App] Navegando desde URL params:', { orderId, batchId, tableNumber });
      // Marcar el batch como nuevo en localStorage
      if (batchId) {
        const newBatches = JSON.parse(localStorage.getItem('newBatches') || '[]');
        if (!newBatches.includes(batchId)) {
          newBatches.push(batchId);
          localStorage.setItem('newBatches', JSON.stringify(newBatches));
        }
      }
      // Navegar a la mesa
      tableMenuData.onTableClick(orderId);
      // Limpiar URL params
      window.history.replaceState({}, '', '/');
    }
  }, [waiter, tableMenuData]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="animate-spin text-indigo-600" size={40} />
      </div>
    );
  }

  if (!waiter || !restaurant) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage onLoginSuccess={handleLoginSuccess} />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50 overflow-hidden">
      {/* Header y menú fijos en la parte superior */}
      <div className="flex-shrink-0 bg-white relative">
        <header className="border-b border-gray-100 px-6 py-4 flex items-center justify-between shadow-sm bg-white relative z-30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center overflow-hidden">
              {waiter.profile_photo_url ? (
                <img src={waiter.profile_photo_url} alt={waiter.nickname} className="w-full h-full object-cover" />
              ) : (
                <span className="text-indigo-600 font-black text-sm">{waiter.nickname?.[0] || '?'}</span>
              )}
            </div>
            <div>
              <p className="text-sm font-black text-slate-900">{waiter.nickname || waiter.full_name}</p>
              <p className="text-[10px] text-slate-500 font-medium">{restaurant.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isPushSupported() && (
              <button
                onClick={() => setShowPushDiagnostics(!showPushDiagnostics)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 text-[10px] font-black uppercase tracking-wider hover:bg-indigo-100"
                title="Diagnóstico de push notifications"
              >
                <BellRing size={14} />
                Push
              </button>
            )}
            <button
              onClick={() => setShowNotificationsPanel(!showNotificationsPanel)}
              data-notifications-button
              className="relative w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-slate-600 hover:bg-gray-200 transition-colors"
              title="Notificaciones"
            >
              <Bell size={20} />
              {notifications.filter(n => !n.read).length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center px-1">
                  {notifications.filter(n => !n.read).length > 9 ? '9+' : notifications.filter(n => !n.read).length}
                </span>
              )}
            </button>
            <button
              onClick={handleLogout}
              className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-slate-600 hover:bg-rose-50 hover:text-rose-600 transition-colors"
              title="Cerrar sesión"
            >
              <LogOut size={18} />
            </button>
          </div>
        </header>

        {/* Panel de notificaciones */}
        {showNotificationsPanel && (
          <div data-notifications-panel className="absolute top-full right-6 mt-2 w-[90vw] max-w-md bg-white rounded-2xl shadow-xl border border-gray-200 z-50 max-h-[60vh] overflow-hidden flex flex-col">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Notificaciones</h3>
              <button
                onClick={() => {
                  // Marcar todas como leídas
                  setNotifications(prev => prev.map(n => ({ ...n, read: true })));
                }}
                className="text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:text-indigo-700"
              >
                Marcar todas como leídas
              </button>
            </div>
            <div className="overflow-y-auto flex-1">
              {notifications.length === 0 ? (
                <div className="px-5 py-8 text-center text-slate-400 text-sm">
                  No hay notificaciones
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {notifications.map((notification) => (
                    <button
                      key={notification.id}
                      onClick={() => {
                        // Marcar como leída y navegar a la mesa
                        setNotifications(prev => prev.map(n => 
                          n.id === notification.id ? { ...n, read: true } : n
                        ));
                        setShowNotificationsPanel(false);
                        // Navegar a la mesa si hay tableMenuData
                        if (tableMenuData && notification.orderId) {
                          tableMenuData.onTableClick(notification.orderId);
                        }
                      }}
                      className={`w-full px-5 py-4 text-left hover:bg-gray-50 transition-colors ${
                        !notification.read ? 'bg-indigo-50/30' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-black text-slate-900 mb-1 ${
                            !notification.read ? '' : 'opacity-70'
                          }`}>
                            {notification.message}
                          </p>
                          <p className="text-[10px] text-slate-500">
                            {notification.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                        {!notification.read && (
                          <div className="w-2 h-2 bg-red-500 rounded-full shrink-0 mt-1.5" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Menú de mesas asignadas - siempre visible después del header */}
        {tableMenuData && tableMenuData.allTablesWithStatus.length > 0 && (
          <div className="bg-gray-50 border-b border-gray-100 shadow-sm">
            <div className="px-8 pb-4 pt-2">
              <div
                ref={tableMenuData.tableStripRef}
                role="region"
                aria-label="Mesas asignadas — arrastrar para ver más"
                className={`overflow-x-auto overflow-y-hidden pb-3 -mx-1 flex flex-nowrap gap-3 px-1 select-none touch-pan-x overscroll-x-contain [&::-webkit-scrollbar]:hidden ${tableMenuData.isDraggingStrip ? 'cursor-grabbing' : 'cursor-grab'}`}
                style={{ 
                  WebkitOverflowScrolling: 'touch', 
                  scrollbarWidth: 'none',
                  msOverflowStyle: 'none'
                }}
                onPointerDown={tableMenuData.handlers.onPointerDown}
                onPointerMove={tableMenuData.handlers.onPointerMove}
                onPointerUp={tableMenuData.handlers.onPointerUp}
                onPointerLeave={tableMenuData.handlers.onPointerLeave}
                onPointerCancel={tableMenuData.handlers.onPointerCancel}
              >
                {tableMenuData.allTablesWithStatus.map((tableInfo) => {
                  const isSelected = tableInfo.orderId === tableMenuData.selectedOrderId;
                  const canSelect = tableInfo.hasOrder;
                  const isBlinking = blinkingTableIds.has(tableInfo.tableId);
                  return (
                    <button
                      key={tableInfo.tableId}
                      type="button"
                      onClick={() => {
                        if (canSelect) {
                          tableMenuData.onTableClick(tableInfo.orderId!);
                          // Detener el titilar cuando se hace click
                          setBlinkingTableIds(prev => {
                            const next = new Set(prev);
                            next.delete(tableInfo.tableId);
                            return next;
                          });
                        }
                      }}
                      disabled={!canSelect}
                      className={`shrink-0 flex flex-col items-center justify-center gap-1.5 px-5 py-3.5 rounded-2xl border-2 transition-all duration-200 min-w-[110px] touch-manipulation ${
                        !canSelect
                          ? 'bg-gray-50 border-gray-200 text-slate-500 cursor-default opacity-75'
                          : isSelected
                          ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-200'
                          : 'bg-white border-gray-200 text-slate-700 hover:border-indigo-300 hover:bg-indigo-50/50 active:bg-indigo-50'
                      } ${isBlinking ? 'animate-pulse ring-4 ring-red-400 ring-opacity-75' : ''}`}
                    >
                      <span className={`text-2xl font-black tracking-tighter ${isSelected ? 'text-white' : canSelect ? 'text-indigo-600' : 'text-gray-500'}`}>
                        {tableInfo.tableNumber}
                      </span>
                      <span className={`text-[9px] font-black uppercase tracking-widest ${isSelected ? 'opacity-90' : 'opacity-70'}`}>
                        Mesa
                      </span>
                      <span className={`px-2 py-1 rounded-lg text-[8px] font-black uppercase border ${isSelected ? 'bg-white/20 border-white/30 text-white' : tableInfo.statusColorClass}`}>
                        {tableInfo.status}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      <main className="flex-1 overflow-y-auto">
        <Routes>
          <Route
            path="/"
              element={
                <OrdersPage
                  restaurant={restaurant}
                  waiterTableIds={waiterTableIds}
                  onNewBatch={(data) => {
                    console.log('📬 Callback onNewBatch llamado con datos:', data);
                    
                    // Crear notificación
                    const notification: Notification = {
                      id: `${data.batchId}-${Date.now()}`,
                      type: 'batch',
                      message: `Nuevo envío recibido en Mesa ${data.tableNumber}`,
                      tableNumber: data.tableNumber,
                      orderId: data.orderId,
                      batchId: data.batchId,
                      timestamp: new Date(),
                      read: false
                    };
                    console.log('📝 Creando notificación:', notification);
                    setNotifications(prev => {
                      const updated = [notification, ...prev];
                      console.log('📋 Notificaciones actualizadas:', updated);
                      return updated;
                    });
                    
                    // Agregar animación de titilar a la mesa
                    console.log('✨ Agregando animación de titilar a mesa:', data.tableId);
                    setBlinkingTableIds(prev => {
                      const updated = new Set([...prev, data.tableId]);
                      console.log('💫 Mesas titilando:', Array.from(updated));
                      return updated;
                    });
                    setTimeout(() => {
                      setBlinkingTableIds(prev => {
                        const next = new Set(prev);
                        next.delete(data.tableId);
                        console.log('⏰ Deteniendo titilar para mesa:', data.tableId);
                        return next;
                      });
                    }, 5000); // Titilar por 5 segundos
                    
                    // Mostrar notificación push si está disponible
                    if ('Notification' in window) {
                      console.log('🔔 Permiso de notificaciones:', Notification.permission);
                      if (Notification.permission === 'granted') {
                        console.log('✅ Mostrando notificación push');
                        new Notification('Nuevo envío recibido', {
                          body: `Mesa ${data.tableNumber} tiene un nuevo envío`,
                          icon: '/icons/icon-192.png',
                          badge: '/icons/icon-192.png',
                          tag: `batch-${data.batchId}`,
                          requireInteraction: false
                        });
                      } else {
                        console.log('⚠️ Permiso de notificaciones no concedido:', Notification.permission);
                      }
                    } else {
                      console.log('❌ Notificaciones no soportadas en este navegador');
                    }
                  }}
                  onTableMenuData={setTableMenuData}
                />
              }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        
        {/* Panel de diagnóstico de push notifications */}
        {showPushDiagnostics && (
          <div className="absolute inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowPushDiagnostics(false)}>
            <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
                <h2 className="text-lg font-black text-slate-900">Diagnóstico de Push Notifications</h2>
                <button
                  onClick={() => setShowPushDiagnostics(false)}
                  className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
                >
                  <X size={18} className="text-slate-600" />
                </button>
              </div>
              <div className="p-6">
                <PushDiagnostics waiterId={waiter?.id} />
              </div>
            </div>
          </div>
        )}
      </main>
      
      {/* Footer con versión */}
      {waiter && restaurant && (
        <footer className="flex-shrink-0 px-6 py-3 bg-white border-t border-gray-100">
          <div className="flex items-center justify-center">
            <p className="text-[10px] text-slate-400 font-medium">
              v {APP_VERSION}
            </p>
          </div>
        </footer>
      )}
    </div>
  );
};

export default App;
