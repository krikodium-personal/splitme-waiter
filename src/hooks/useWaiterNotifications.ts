import { useEffect, useState, useRef } from 'react';
import { supabase } from '../supabase';

export interface WaiterNotification {
  id: string;
  waiter_id: string;
  order_id: string;
  table_number: number;
  message: string;
  status: 'pending' | 'read' | 'completed';
  created_at: string;
  updated_at: string;
}

interface UseWaiterNotificationsProps {
  waiterId: string | null;
  onNewNotification?: (notification: WaiterNotification) => void;
}

export const useWaiterNotifications = ({
  waiterId,
  onNewNotification
}: UseWaiterNotificationsProps) => {
  const [notifications, setNotifications] = useState<WaiterNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const lastNotificationIdRef = useRef<string | null>(null);

  // Cargar notificaciones iniciales
  useEffect(() => {
    if (!waiterId || !supabase) return;

    const loadNotifications = async () => {
      const { data, error } = await supabase
        .from('waiter_notifications')
        .select('*')
        .eq('waiter_id', waiterId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('[WaiterNotifications] Error al cargar notificaciones:', error);
        return;
      }

      if (data) {
        const list = data as WaiterNotification[];
        setNotifications(list);
        setUnreadCount(list.filter(n => n.status === 'pending').length);
        if (list.length > 0) lastNotificationIdRef.current = list[0].id;
      }
    };

    loadNotifications();
  }, [waiterId]);

  // Polling fallback: verificar nuevas notificaciones cada 8s (por si Realtime no está habilitado)
  useEffect(() => {
    if (!waiterId || !supabase) return;

    const poll = async () => {
      const { data, error } = await supabase
        .from('waiter_notifications')
        .select('*')
        .eq('waiter_id', waiterId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error || !data?.length) return;

      const list = data as WaiterNotification[];
      setNotifications(prev => {
        const existingIds = new Set(prev.map(n => n.id));
        const trulyNew = list.filter(n => !existingIds.has(n.id));
        if (trulyNew.length === 0) return prev;
        const newPendingCount = trulyNew.filter(n => n.status === 'pending').length;
        trulyNew.forEach(n => {
          playNotificationSound();
          showBrowserNotification(n);
          if (onNewNotification) onNewNotification(n);
        });
        lastNotificationIdRef.current = list[0].id;
        const newIds = new Set(trulyNew.map(n => n.id));
        setUnreadCount(c => c + newPendingCount);
        return [...trulyNew, ...prev.filter(n => !newIds.has(n.id))];
      });
    };

    const interval = setInterval(poll, 8000);
    return () => clearInterval(interval);
  }, [waiterId, onNewNotification]);

  // Suscripción Realtime a nuevas notificaciones
  useEffect(() => {
    if (!waiterId || !supabase) return;

    // Limpiar canal anterior si existe
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channel = supabase
      .channel(`waiter-notifications-${waiterId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'waiter_notifications',
          filter: `waiter_id=eq.${waiterId}`
        },
        (payload) => {
          console.log('[WaiterNotifications] Nueva notificación recibida:', payload.new);

          const newNotification = payload.new as WaiterNotification;

          setNotifications(prev => [newNotification, ...prev]);
          setUnreadCount(prev => prev + 1);
          playNotificationSound();
          showBrowserNotification(newNotification);

          if (onNewNotification) {
            onNewNotification(newNotification);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'waiter_notifications',
          filter: `waiter_id=eq.${waiterId}`
        },
        (payload) => {
          setNotifications(prev =>
            prev.map(n =>
              n.id === (payload.new as WaiterNotification).id ? { ...n, ...payload.new } : n
            )
          );

          setUnreadCount(prev => {
            const updated = payload.new as WaiterNotification;
            const oldStatus = (payload.old as WaiterNotification)?.status;
            if (updated.status === 'pending' && oldStatus !== 'pending') {
              return prev + 1;
            }
            if (updated.status !== 'pending' && oldStatus === 'pending') {
              return Math.max(0, prev - 1);
            }
            return prev;
          });
        }
      )
      .subscribe((status) => {
        console.log('[WaiterNotifications] Estado de suscripción:', status);
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [waiterId, onNewNotification]);

  const markAsRead = async (notificationId: string) => {
    if (!supabase) return;

    const { error } = await supabase
      .from('waiter_notifications')
      .update({ status: 'read' })
      .eq('id', notificationId);

    if (error) {
      console.error('[WaiterNotifications] Error al marcar como leída:', error);
    }
  };

  const markAsCompleted = async (notificationId: string) => {
    if (!supabase) return;

    // Optimistic update: mover al final y marcar como completada
    setNotifications(prev => {
      const updated = prev.map(n =>
        n.id === notificationId ? { ...n, status: 'completed' as const, updated_at: new Date().toISOString() } : n
      );
      const active = updated.filter(n => n.status !== 'completed');
      const completed = updated.filter(n => n.status === 'completed');
      return [...active, ...completed];
    });
    setUnreadCount(prev => Math.max(0, prev - 1));

    const { error } = await supabase
      .from('waiter_notifications')
      .update({ status: 'completed', updated_at: new Date().toISOString() })
      .eq('id', notificationId);

    if (error) {
      console.error('[WaiterNotifications] Error al marcar como completada:', error);
    }
  };

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAsCompleted
  };
};

function playNotificationSound() {
  try {
    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    audio.play().catch(e => console.log('[WaiterNotifications] Error al reproducir sonido:', e));
  } catch (error) {
    console.error('[WaiterNotifications] Error al crear audio:', error);
  }
}

function showBrowserNotification(notification: WaiterNotification) {
  if (!('Notification' in window)) {
    console.log('[WaiterNotifications] Este navegador no soporta notificaciones');
    return;
  }

  if (Notification.permission === 'granted') {
    new Notification(`Mesa ${notification.table_number}`, {
      body: notification.message,
      icon: '/icons/icon-192.png',
      tag: notification.id,
      requireInteraction: false
    });
  } else if (Notification.permission !== 'denied') {
    Notification.requestPermission().then(permission => {
      if (permission === 'granted') {
        new Notification(`Mesa ${notification.table_number}`, {
          body: notification.message,
          icon: '/icons/icon-192.png',
          tag: notification.id
        });
      }
    });
  }
}
