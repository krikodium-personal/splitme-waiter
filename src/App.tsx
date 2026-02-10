import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { Bell, LogOut, Loader2, BellRing } from 'lucide-react';
import { supabase } from './supabase';
import LoginPage from './pages/LoginPage';
import OrdersPage from './pages/OrdersPage';
import { isPushSupported, getNotificationPermission, registerPushSubscription } from './pushNotifications';
import type { Waiter } from './types';

interface Restaurant {
  id: string;
  name: string;
}

const App: React.FC = () => {
  const [waiter, setWaiter] = useState<Waiter | null>(null);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [waiterTableIds, setWaiterTableIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [newBatchesCount, setNewBatchesCount] = useState(0);
  const [pushRegistering, setPushRegistering] = useState(false);
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

  const handleEnablePush = async () => {
    if (!waiter?.id) return;
    setPushRegistering(true);
    try {
      await registerPushSubscription(waiter.id);
    } finally {
      setPushRegistering(false);
    }
  };

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
      <div className="flex-shrink-0 bg-white">
        <header className="border-b border-gray-100 px-6 py-4 flex items-center justify-between shadow-sm bg-white">
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
            {isPushSupported() && getNotificationPermission() !== 'granted' && (
              <button
                onClick={handleEnablePush}
                disabled={pushRegistering}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 text-[10px] font-black uppercase tracking-wider hover:bg-indigo-100 disabled:opacity-70"
                title="Activar notificaciones push"
              >
                <BellRing size={14} />
                {pushRegistering ? '...' : 'Push'}
              </button>
            )}
            <button
              onClick={() => setNewBatchesCount(0)}
              className="relative w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-slate-600 hover:bg-gray-200 transition-colors"
              title="Notificaciones"
            >
              <Bell size={20} />
              {newBatchesCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center">
                  {newBatchesCount > 9 ? '9+' : newBatchesCount}
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
                  return (
                    <button
                      key={tableInfo.tableId}
                      type="button"
                      onClick={() => {
                        if (canSelect) {
                          tableMenuData.onTableClick(tableInfo.orderId!);
                        }
                      }}
                      disabled={!canSelect}
                      className={`shrink-0 flex flex-col items-center justify-center gap-1.5 px-5 py-3.5 rounded-2xl border-2 transition-all duration-200 min-w-[110px] touch-manipulation ${
                        !canSelect
                          ? 'bg-gray-50 border-gray-200 text-slate-500 cursor-default opacity-75'
                          : isSelected
                          ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-200'
                          : 'bg-white border-gray-200 text-slate-700 hover:border-indigo-300 hover:bg-indigo-50/50 active:bg-indigo-50'
                      }`}
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
                  onNewBatch={() => setNewBatchesCount((c) => c + 1)}
                  onTableMenuData={setTableMenuData}
                />
              }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
};

export default App;
