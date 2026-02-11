import React, { useState, useEffect } from 'react';
import { useWaiterNotifications } from '../hooks/useWaiterNotifications';

const SolicitudesIcon = () => (
  <svg width="20" height="20" viewBox="0 0 510 510" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
    <path d="M480 231.266V225C480 100.65 379.368 0 255 0C130.65 0 30 100.632 30 225V231.266C12.767 235.718 0 251.396 0 270C0 292.056 17.944 310 40 310H470C492.056 310 510 292.056 510 270C510 251.396 497.233 235.718 480 231.266ZM53.001 190H456.998C460.664 211.22 459.89 226.989 459.999 230H50C50.112 226.895 49.319 211.314 53.001 190ZM255 20C348.991 20 428.401 83.587 452.497 170H57.503C81.599 83.587 161.009 20 255 20ZM470 290H40C28.972 290 20 281.028 20 270C20 258.972 28.972 250 40 250H470C481.028 250 490 258.972 490 270C490 281.028 481.028 290 470 290Z" fill="currentColor"/>
    <path d="M488.533 306.362C475.471 288.525 450.462 284.668 432.624 297.745L347.812 359.901C343.416 349.311 334.557 340.892 323.106 337.211L191.246 294.811C161.974 285.397 129.653 290.581 104.792 308.674C96.977 314.36 20.852 369.745 17.842 371.935C14.272 374.532 12.827 379.162 14.287 383.328L56.327 503.307C58.553 509.657 66.264 512.005 71.646 508.087L138.501 459.461C144.116 455.382 151.583 454.51 157.988 457.187L245.309 493.678C267.808 503.076 294.009 499.967 313.731 485.523L479.916 362.265C490.159 354.756 496.274 342.687 496.274 329.981C496.275 321.43 493.596 313.259 488.533 306.362ZM70.756 484.004L35.621 383.731L74.604 355.369L109.739 455.65L70.756 484.004ZM468.048 346.168L301.866 469.423C287.812 479.717 269.094 481.94 253.02 475.224L165.7 438.733C152.897 433.384 137.971 435.126 126.743 443.284L126.627 443.368L91.492 343.083L116.559 324.846C136.279 310.496 161.911 306.388 185.123 313.85L316.984 356.25C325.287 358.92 330.865 366.567 330.865 375.28C330.865 388.878 317.603 398.469 304.735 394.33L229.336 370.09C224.073 368.396 218.445 371.293 216.755 376.55C215.065 381.808 217.957 387.441 223.215 389.131L298.614 413.371C321.338 420.672 345.44 406.608 350.103 383.018L444.447 313.875C453.226 307.44 465.768 309.125 472.403 318.188C478.774 326.865 477.272 339.406 468.048 346.168Z" fill="currentColor"/>
  </svg>
);
import type { WaiterNotification } from '../hooks/useWaiterNotifications';

interface WaiterNotificationsPanelProps {
  waiterId: string | null;
}

export const WaiterNotificationsPanel: React.FC<WaiterNotificationsPanelProps> = ({ waiterId }) => {
  const [isOpen, setIsOpen] = useState(false);
  const { notifications, unreadCount, markAsCompleted } = useWaiterNotifications({
    waiterId,
    onNewNotification: (notification: WaiterNotification) => {
      console.log('[WaiterNotificationsPanel] Nueva notificación:', notification);
    }
  });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (isOpen && !target.closest('[data-notifications-panel]') && !target.closest('[data-notifications-button]')) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  return (
    <div className="relative" data-notifications-panel>
      <button
        onClick={() => setIsOpen(!isOpen)}
        data-notifications-button
        className="relative w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-slate-600 hover:bg-gray-200 transition-colors"
        title="Notificaciones de solicitudes"
      >
        <SolicitudesIcon />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center px-1">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="fixed left-4 right-4 top-20 z-[100] max-h-[calc(100vh-6rem)] bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden flex flex-col sm:absolute sm:left-auto sm:right-0 sm:top-12 sm:w-80 sm:max-h-96">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">
              Solicitudes de comensales
            </h3>
            {unreadCount > 0 && (
              <p className="text-[10px] text-slate-500 font-medium">{unreadCount} sin leer</p>
            )}
          </div>

          <div className="divide-y divide-gray-100 overflow-y-auto flex-1">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-slate-500 text-sm">
                No hay notificaciones
              </div>
            ) : (
              [...notifications]
                .sort((a, b) => {
                  // Completadas al final
                  if (a.status === 'completed' && b.status !== 'completed') return 1;
                  if (a.status !== 'completed' && b.status === 'completed') return -1;
                  return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
                })
                .map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 transition-colors ${
                      notification.status === 'pending'
                        ? 'bg-blue-50/50 hover:bg-blue-50/70'
                        : notification.status === 'completed'
                          ? 'opacity-70'
                          : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span
                            className={
                              notification.status === 'completed'
                                ? 'font-bold text-slate-500'
                                : 'font-black text-slate-900'
                            }
                          >
                            Mesa {notification.table_number}
                          </span>
                          {notification.status === 'pending' && (
                            <span className="bg-blue-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
                              Nueva
                            </span>
                          )}
                          {notification.status === 'completed' && (
                            <span className="bg-green-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
                              Listo
                            </span>
                          )}
                        </div>
                        <p
                          className={
                            notification.status === 'completed'
                              ? 'text-sm text-slate-400'
                              : 'text-sm text-slate-600'
                          }
                        >
                          {notification.message}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-1">
                          {new Date(notification.created_at).toLocaleString('es-AR')}
                        </p>
                      </div>
                    </div>

                    {notification.status === 'pending' && (
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={() => markAsCompleted(notification.id)}
                          className="text-[10px] px-3 py-1.5 bg-green-500 text-white rounded-lg hover:bg-green-600 font-bold"
                        >
                          Completar
                        </button>
                      </div>
                    )}
                  </div>
                ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
