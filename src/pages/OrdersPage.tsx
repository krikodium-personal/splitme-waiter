
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Clock, CheckCircle2, Utensils, Hash, 
  MessageSquare, Play, Check, 
  Timer, AlertCircle, Loader2, ChevronDown, ChevronUp, X,
  Maximize2, Minimize2, Copy, RefreshCw
} from 'lucide-react';
import { supabase } from '../supabase';

interface OrdersPageProps {
  restaurant: { id: string; name: string };
  waiterTableIds: string[];
  onNewBatch?: () => void;
  onTableMenuData?: (data: {
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
  }) => void;
}

/** Calcula el estado de la mesa para mostrar en chip o detalle */
function getOrderTableStatus(order: any): { label: string; colorClass: string; isMesaListaParaCerrar: boolean } {
  const orderGuests = order.order_guests || [];
  const allBatches = order.order_batches || [];
  const batchesForStatusCheck = allBatches.filter((b: any) => b.status !== 'CREADO');
  const hasOpenBatches = batchesForStatusCheck.some((b: any) => ['ENVIADO', 'PREPARANDO'].includes(b.status));
  const batchesToCheck = allBatches.filter((b: any) => b.status !== 'CREADO');
  const allBatchesServed = batchesToCheck.length === 0 || batchesToCheck.every((b: any) => b.status === 'SERVIDO');
  const totalPaidAmount = orderGuests
    .filter((g: any) => g.paid === true)
    .reduce((sum: number, g: any) => sum + (Number(g.individual_amount) || 0), 0);
  const totalAmount = Number(order.total_amount) || 0;
  const amountTolerance = Math.max(1, totalAmount * 0.005);
  const isTotalAmountPaid = totalAmount > 0 && Math.abs(totalPaidAmount - totalAmount) <= amountTolerance;
  const hasUnpaidGuests = !isTotalAmountPaid && orderGuests.some((g: any) =>
    g.paid === false && (Number(g.individual_amount) || 0) > 0
  );
  const isMesaCerrada = order.status === 'CERRADO';
  const isMesaAbierta = !isMesaCerrada && (hasOpenBatches || hasUnpaidGuests);
  let isMesaPagada = false;
  let isMesaListaParaCerrar = false;
  if (!isMesaCerrada && !isMesaAbierta) {
    const canBePagadaOLista = allBatchesServed && (totalAmount <= 0 || isTotalAmountPaid);
    if (canBePagadaOLista) {
      if (order.status === 'Pagado') isMesaPagada = true;
      else isMesaListaParaCerrar = true;
    }
  }
  if (isMesaCerrada) return { label: 'Mesa cerrada', colorClass: 'bg-emerald-100 text-emerald-800 border-emerald-200', isMesaListaParaCerrar: false };
  if (isMesaPagada) return { label: 'Mesa pagada', colorClass: 'bg-blue-100 text-blue-800 border-blue-200', isMesaListaParaCerrar: false };
  if (isMesaListaParaCerrar) return { label: 'Lista para cerrar', colorClass: 'bg-amber-100 text-amber-800 border-amber-200', isMesaListaParaCerrar: true };
  return { label: 'Mesa abierta', colorClass: 'bg-red-100 text-red-800 border-red-200', isMesaListaParaCerrar: false };
}

const BatchCard: React.FC<{ 
  batch: any, 
  batchIndex: number,
  onUpdateBatchStatus: (batchId: string, newStatus: string) => void,
  isArchived?: boolean
}> = ({ batch, batchIndex, onUpdateBatchStatus }) => {
  const [isExpanded, setIsExpanded] = useState(batch.status !== 'SERVIDO');

  // Colapsar automáticamente cuando el batch se marca como SERVIDO
  useEffect(() => {
    if (batch.status === 'SERVIDO') {
      setIsExpanded(false);
    }
  }, [batch.status]);

  const statusConfig = {
    'CREADO': { color: 'bg-gray-100 text-gray-600 border-gray-200', icon: Clock, next: null, label: 'En creación' },
    'ENVIADO': { color: 'bg-blue-100 text-blue-800 border-blue-200', icon: Play, next: 'PREPARANDO', label: 'Comenzar Preparación' },
    'PREPARANDO': { color: 'bg-amber-100 text-amber-800 border-amber-200', icon: Clock, next: 'LISTO', label: 'Marcar Listo' },
    'LISTO': { color: 'bg-emerald-100 text-emerald-800 border-emerald-200', icon: Check, next: 'SERVIDO', label: 'Marcar Servido' },
    'SERVIDO': { color: 'bg-emerald-50 text-emerald-600 border-emerald-100', icon: CheckCircle2, next: null, label: 'Entregado' }
  };

  // Estado por defecto: si no existe en config, usar ENVIADO (estado inicial después de CREADO)
  const currentStatus = statusConfig[batch.status as keyof typeof statusConfig] || statusConfig['ENVIADO'];

  const sortedItems = [...(batch.order_items || [])].sort((a, b) => 
    new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  return (
    <div className={`rounded-[2rem] border transition-all duration-500 mb-3 overflow-hidden ${
      batch.status === 'SERVIDO' 
        ? 'opacity-60 border-emerald-100 bg-emerald-50/10' 
        : 'shadow-sm border-gray-200 bg-white'
    }`}>
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        className={`px-5 py-3.5 cursor-pointer transition-colors border-b ${
          isExpanded ? 'bg-indigo-50/30 border-gray-100' : 'bg-gray-50/80 border-transparent'
        } hover:bg-indigo-50/50`}
      >
        {/* Primera línea: Badge #, ENVÍO # y pill de estado */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-[10px] transition-all duration-500 transform shrink-0 ${
              batch.status === 'SERVIDO' ? 'bg-emerald-500 text-white scale-90 rotate-[360deg]' : 'bg-slate-800 text-white shadow-md'
            }`}>
              {batch.status === 'SERVIDO' ? <CheckCircle2 size={16} /> : `#${batchIndex + 1}`}
            </div>
            <div className="flex items-center gap-2">
              <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest">
                {batch.status === 'SERVIDO' ? `ENVÍO # ${batchIndex + 1} SERVIDO` : `ENVÍO # ${batchIndex + 1}`}
              </h4>
              {batch.status !== 'SERVIDO' && (
                <span className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase border transition-colors ${currentStatus.color}`}>
                  {batch.status}
                </span>
              )}
            </div>
          </div>
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all shrink-0 ${isExpanded ? 'bg-indigo-600 text-white shadow-md' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}>
            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>
        </div>

        {/* Segunda línea: Tiempo y CTA */}
        <div className="flex items-center justify-between" onClick={e => e.stopPropagation()}>
          <p className="text-[9px] text-slate-500 font-bold flex items-center gap-1">
            <Timer size={10} /> {new Date(batch.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
          {currentStatus.next && (
            <button 
              onClick={() => onUpdateBatchStatus(batch.id, currentStatus.next!)}
              className={`flex items-center gap-2 px-3 py-1.5 text-white rounded-xl font-black text-[9px] uppercase tracking-widest transition-all shadow-sm active:scale-95 shrink-0 ${
                batch.status === 'ENVIADO' 
                  ? 'bg-red-600 hover:bg-red-700'
                  : batch.status === 'PREPARANDO'
                  ? 'bg-indigo-600 hover:bg-indigo-700'
                  : batch.status === 'LISTO'
                  ? 'bg-green-600 hover:bg-green-700'
                  : 'bg-indigo-600 hover:bg-indigo-700'
              }`}
            >
              <currentStatus.icon size={10} /> {currentStatus.label}
            </button>
          )}
        </div>
      </div>

      <div className={`transition-all duration-500 ease-in-out ${isExpanded ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'} overflow-hidden`}>
        <div className="px-5 pb-5 pt-3 space-y-2">
          {sortedItems.map((item: any) => {
            const menuItem = Array.isArray(item.menu_items) ? item.menu_items[0] : item.menu_items;
            const itemName = menuItem?.name || 'Cargando...';
            const unitPrice = item.unit_price || 0;
            const subtotal = unitPrice * (item.quantity || 1);

            let extrasArr: string[] = [];
            if (item.extras && Array.isArray(item.extras)) extrasArr = item.extras;
            else if (typeof item.extras === 'string' && item.extras) extrasArr = item.extras.split(',').map((s: string) => s.trim()).filter(Boolean);
            else if (item.notes?.includes('EXTRAS:')) {
              const m = item.notes.match(/EXTRAS:\s*([^|]+)/);
              if (m?.[1]) extrasArr = m[1].split(',').map((s: string) => s.trim()).filter(Boolean);
            }
            let removedArr: string[] = [];
            if (item.removed_ingredients && Array.isArray(item.removed_ingredients)) removedArr = item.removed_ingredients;
            else if (typeof item.removed_ingredients === 'string' && item.removed_ingredients) removedArr = item.removed_ingredients.split(',').map((s: string) => s.trim()).filter(Boolean);
            else if (item.notes?.includes('SIN:')) {
              const m = item.notes.match(/SIN:\s*([^|]+)/) || item.notes.match(/SIN:\s*(.+)/);
              if (m?.[1]) removedArr = m[1].split(',').map((s: string) => s.trim()).filter(Boolean);
            }

            return (
              <div key={item.id} className="flex justify-between items-start py-2 border-b border-slate-50 last:border-0">
                <div className="flex gap-3 flex-1">
                  <span className="text-xs font-black text-indigo-700 bg-indigo-50 w-6 h-6 rounded-lg flex items-center justify-center border border-indigo-100">
                    {item.quantity}
                  </span>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-slate-800 leading-tight">
                      {itemName}
                    </p>
                    {(extrasArr.length > 0 || removedArr.length > 0) && (
                      <div className="flex flex-wrap items-center gap-1.5 mt-1">
                        {extrasArr.map((ex: string) => (
                          <span key={ex} className="text-[9px] font-black uppercase bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-md border border-emerald-100">
                            +{ex}
                          </span>
                        ))}
                        {removedArr.map((rem: string) => (
                          <span key={rem} className="text-[9px] font-black uppercase bg-red-50 text-red-600 px-2 py-0.5 rounded-md border border-red-100">
                            -{rem}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] font-bold text-slate-500">
                        ${Number(unitPrice).toLocaleString('es-CL')} c/u
                      </span>
                      {item.quantity > 1 && (
                        <>
                          <span className="text-[9px] text-slate-300">×</span>
                          <span className="text-[10px] font-bold text-slate-500">
                            {item.quantity}
                          </span>
                          <span className="text-[9px] text-slate-300">=</span>
                          <span className="text-[10px] font-black text-indigo-600">
                            ${Number(subtotal).toLocaleString('es-CL')}
                          </span>
                        </>
                      )}
                    </div>
                    {item.notes && (
                      <div className="flex items-center gap-1.5 mt-1.5 text-[10px] text-amber-700 font-medium italic bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-100/50">
                        <MessageSquare size={10} /> {item.notes}
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-right ml-3">
                  {item.quantity === 1 ? (
                    <span className="text-sm font-black text-indigo-600">
                      ${Number(unitPrice).toLocaleString('es-CL')}
                    </span>
                  ) : (
                    <div className="text-right">
                      <span className="text-xs font-bold text-slate-400 line-through">
                        ${Number(unitPrice).toLocaleString('es-CL')}
                      </span>
                      <div className="text-sm font-black text-indigo-600">
                        ${Number(subtotal).toLocaleString('es-CL')}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export const OrderGroupCard: React.FC<{ 
  order: any, 
  onCloseMesa: (order: any) => Promise<void>,
  onUpdateBatchStatus: (batchId: string, newStatus: string) => void,
  onMarkGuestAsPaid: (guestId: string) => void,
  markingGuestAsPaid: string | null,
  forceExpanded?: boolean,
  isClosed?: boolean
}> = ({ order, onCloseMesa, onUpdateBatchStatus, onMarkGuestAsPaid, markingGuestAsPaid, forceExpanded = false, isClosed: propIsClosed = false }) => {
  // Inicializamos colapsado por defecto, a menos que se fuerce la expansión
  const [isCollapsed, setIsCollapsed] = useState(!forceExpanded);
  const [copiedPaymentId, setCopiedPaymentId] = useState<string | null>(null);
  // Filtrar lotes: no mostrar los que están en estado "CREADO"
  const batches = (order.order_batches || []).filter((batch: any) => batch.status !== 'CREADO');

  // Para la lógica de estado, usar todos los batches (incluyendo CREADO)
  const allBatches = order.order_batches || [];

  // Calcular el estado de la mesa según los criterios:
  // Abierta: Tiene batches en CREADO, ENVIADO, PREPARANDO y/o algún guest tiene paid=FALSE con individual_amount > 0
  // Pagada: Todos los guests tienen paid=TRUE y order status='Pagado'
  // Cerrada: Todos los batches en SERVIDO, todos los guests paid=TRUE y order status='CERRADO'
  
  const orderGuests = order.order_guests || [];
  
  // Verificar si hay batches en estados que indican que la mesa está abierta (usar allBatches para incluir CREADO)
  // IMPORTANTE: Solo considerar batches que NO están en CREADO para determinar si la mesa está abierta
  // Los batches en CREADO no cuentan como "abiertos" para la lógica de estado
  const batchesForStatusCheck = allBatches.filter((b: any) => b.status !== 'CREADO');
  const hasOpenBatches = batchesForStatusCheck.some((b: any) =>
    ['ENVIADO', 'PREPARANDO'].includes(b.status)
  );
  
  // Verificar si hay batches en CREADO para mostrar el mensaje "Pidiendo"
  const hasBatchesCreado = allBatches.some((b: any) => b.status === 'CREADO');

  // Verificar si todos los batches están en SERVIDO (excluyendo CREADO)
  const batchesToCheck = allBatches.filter((b: any) => b.status !== 'CREADO');
  const allBatchesServed = batchesToCheck.length === 0 || batchesToCheck.every((b: any) => b.status === 'SERVIDO');

  // Calcular la suma de los individual_amount de los guests con paid=TRUE
  const totalPaidAmount = orderGuests
    .filter((g: any) => g.paid === true)
    .reduce((sum: number, g: any) => sum + (Number(g.individual_amount) || 0), 0);

  const totalAmount = Number(order.total_amount) || 0;
  // Tolerancia para redondeos: al menos 1 unidad o 0.5% del total (útil en CLP y otros)
  const amountTolerance = Math.max(1, totalAmount * 0.005);
  const isTotalAmountPaid = totalAmount > 0 && Math.abs(totalPaidAmount - totalAmount) <= amountTolerance;

  // Verificar si hay guests sin pagar (paid=FALSE y individual_amount > 0)
  // IMPORTANTE: Solo considerar como "sin pagar" si la suma de los pagados NO cubre el total
  // Si el total ya está cubierto por los guests pagados, no importa si hay guests sin pagar
  const hasUnpaidGuests = !isTotalAmountPaid && orderGuests.some((g: any) =>
    g.paid === false && (Number(g.individual_amount) || 0) > 0
  );

  // Determinar el estado de la mesa según los criterios (con prioridad)
  // PRIORIDAD 0: Si el status de la orden es 'CERRADO' → CERRADA (siempre, independientemente de batches o pagos)
  let isMesaCerrada = order.status === 'CERRADO';

  // PRIORIDAD 1: Si hay batches abiertos (ENVIADO, PREPARANDO) o guests sin pagar → ABIERTA (siempre)
  // NOTA: Los batches en CREADO NO cuentan como "abiertos" para esta lógica
  // NOTA: Si la mesa ya está cerrada, no la marcamos como abierta
  const isMesaAbierta = !isMesaCerrada && (hasOpenBatches || hasUnpaidGuests);

  // PRIORIDAD 2: Solo si NO hay batches abiertos ni guests sin pagar, verificar otros estados
  let isMesaPagada = false;
  let isMesaListaParaCerrar = false;

  if (!isMesaCerrada && !isMesaAbierta) {
    // Condición principal: todos los batches servidos Y el total cubierto por los pagos de los comensales
    // isTotalAmountPaid es obligatorio cuando hay monto: la suma de lo pagado por guests debe cubrir order.total_amount
    const canBePagadaOLista = allBatchesServed && (totalAmount <= 0 || isTotalAmountPaid);
    if (canBePagadaOLista) {
      if (order.status === 'Pagado') {
        isMesaPagada = true;
      } else {
        isMesaListaParaCerrar = true;
      }
    }
  }

  // Sincronizar con forceExpanded cuando cambie externamente (nuevo pedido)
  useEffect(() => {
    if (forceExpanded) {
      setIsCollapsed(false);
    }
  }, [forceExpanded]);

  return (
    <div className={`bg-white rounded-[2.5rem] border border-gray-100 shadow-md overflow-hidden flex flex-col transition-all duration-500 ease-in-out h-fit animate-in fade-in slide-in-from-bottom-4 min-w-0 w-full ${isCollapsed ? 'max-w-full' : ''}`}>
      <div 
        className={`p-6 cursor-pointer transition-colors duration-300 ${isCollapsed ? 'bg-slate-50/50' : 'border-b border-gray-50 bg-gray-50/30'}`}
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <div className="flex flex-wrap justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm border border-gray-100 font-black text-xl transition-transform duration-500 ${isCollapsed ? 'scale-90' : 'scale-100'}`}>
              {order.tables?.table_number || '??'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-slate-900 tracking-tight leading-none">Mesa {order.tables?.table_number}</h3>
                {isCollapsed && (
                   <span className="px-3 py-0.5 bg-indigo-600 text-white rounded-lg text-[10px] font-black tracking-tighter shadow-sm animate-in zoom-in-95">
                    ${Number(order.total_amount).toLocaleString('es-CL')}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-1.5 text-[9px] font-black uppercase text-slate-400 tracking-widest">
                <Timer size={10} /> {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                <span className="mx-0.5 opacity-20">•</span>
                <Hash size={10} /> {order.id.slice(0, 6).toUpperCase()}
              </div>
            </div>
          </div>

          <div className="flex flex-col items-end gap-2" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3">
              <span className={`text-[10px] font-black uppercase tracking-widest ${
                isMesaCerrada ? 'text-emerald-600' : isMesaPagada ? 'text-blue-600' : 'text-red-600'
              }`}>
                {isMesaCerrada ? 'MESA CERRADA' : isMesaPagada ? 'MESA PAGADA' : isMesaListaParaCerrar ? 'LISTA PARA CERRAR' : 'MESA ABIERTA'}
              </span>
              {isMesaListaParaCerrar && (
                <button
                  onClick={async (e) => {
                    e.stopPropagation();
                    await onCloseMesa(order);
                  }}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-sm active:scale-95"
                >
                  Cerrar mesa
                </button>
              )}
              <button 
                onClick={() => setIsCollapsed(!isCollapsed)}
                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 ${isCollapsed ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'}`}
              >
                {isCollapsed ? <Maximize2 size={18} /> : <Minimize2 size={18} />}
              </button>
            </div>
            {hasBatchesCreado && (
              <span className="text-[9px] font-black uppercase tracking-widest text-amber-600">
                Pidiendo
              </span>
            )}
          </div>
           
        </div>
      </div>

      <div className={`transition-all duration-500 ease-in-out overflow-hidden ${isCollapsed ? 'max-h-0' : 'max-h-[1200px]'}`}>
        <div className="flex-1 p-6 overflow-y-auto custom-scrollbar bg-white max-h-[500px]">
          {batches.length > 0 ? (
            batches.map((batch: any, idx: number) => (
              <BatchCard 
                key={batch.id} 
                batch={batch} 
                batchIndex={idx} 
                onUpdateBatchStatus={onUpdateBatchStatus}
                isArchived={propIsClosed}
              />
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-slate-200">
              <AlertCircle size={32} strokeWidth={1} className="mb-2" />
              <p className="text-[9px] font-black uppercase tracking-widest">Esperando primer pedido...</p>
            </div>
          )}
        </div>

        <div className="px-8 py-5 bg-slate-50/50 border-t border-gray-100">
          <div className="flex justify-between items-center mb-4">
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Total Acumulado</p>
              <p className="text-2xl font-black text-indigo-600 tracking-tighter">${Number(order.total_amount).toLocaleString('es-CL')}</p>
            </div>
            <div className="px-4 py-1.5 bg-indigo-50 text-indigo-700 rounded-full text-[9px] font-black uppercase tracking-widest border border-indigo-100">
              {batches.length} {batches.length === 1 ? 'Envío' : 'Envíos'}
            </div>
          </div>

          {/* Detalle de división de pago por comensal */}
          {order.order_guests?.length > 0 && (() => {
            // Filtrar comensales con saldo $0 si la suma del resto es igual al total
            const guestsWithAmount = order.order_guests.filter((g: any) => (g.individual_amount || 0) > 0);
            const sumOfGuestsWithAmount = guestsWithAmount.reduce((sum: number, g: any) => sum + (Number(g.individual_amount) || 0), 0);
            const totalAmount = Number(order.total_amount || 0);
            
            // Si la suma de los comensales con monto es igual al total, ocultar los de $0
            const guestsToShow = (sumOfGuestsWithAmount === totalAmount && totalAmount > 0)
              ? guestsWithAmount
              : order.order_guests;
            
            return guestsToShow.length > 0 ? (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">División de Pago</p>
                <div className="space-y-2">
                  {guestsToShow.map((guest: any) => {
                  // Obtener payment_method desde order_guests (en tiempo real)
                  const paymentMethod = guest.payment_method?.toLowerCase() || null;
                  const guestTotal = guest.individual_amount || 0;

                  // Verificar si está pagado: solo usar el campo paid de order_guests
                  const isPaid = guest.paid === true;

                  // Obtener payment_id directamente de order_guests
                  const paymentId = guest.payment_id || null;

                  // Determinar si necesita pago manual (solo efectivo o transferencia)
                  // Para mercadopago, no mostrar botón, solo esperar que paid=true automáticamente
                  const needsManualPayment = paymentMethod && (
                    paymentMethod === 'efectivo' || 
                    paymentMethod === 'transferencia'
                  );

                  // Para mercadopago, no mostrar botón, solo el estado
                  const isMercadoPago = paymentMethod === 'mercadopago';

                  return (
                    <div 
                      key={guest.id} 
                      className="flex items-center justify-between p-3 bg-white rounded-xl border border-gray-100"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-black text-slate-900">{guest.name || 'Sin nombre'}</p>
                          <span className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase ${
                            isPaid 
                              ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' 
                              : 'bg-amber-100 text-amber-700 border border-amber-200'
                          }`}>
                            {isPaid ? 'Pagado' : 'Pendiente'}
                          </span>
                        </div>
                        {paymentMethod && (
                          <>
                            <p className="text-[9px] text-slate-500 font-medium">
                              Método: <span className="font-black text-slate-700 capitalize">{paymentMethod}</span>
                            </p>
                            {isMercadoPago && isPaid && paymentId && (
                              <div className="flex items-center gap-1.5 mt-1">
                                <span className="text-[9px] text-indigo-600">ID: {paymentId}</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    navigator.clipboard.writeText(paymentId);
                                    setCopiedPaymentId(paymentId);
                                    setTimeout(() => setCopiedPaymentId(null), 1500);
                                  }}
                                  className="p-0.5 rounded hover:bg-gray-100 text-indigo-600"
                                  title="Copiar ID"
                                >
                                  {copiedPaymentId === paymentId ? <Check size={12} /> : <Copy size={12} />}
                                </button>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                      <div className="flex items-center gap-3 ml-4">
                        <div className="text-right">
                          <p className="text-lg font-black text-indigo-600 flex items-center justify-end gap-2 flex-wrap">
                            ${Number(guestTotal).toLocaleString('es-CL')}
                            {isPaid && <span className="text-emerald-600 font-black text-[9px] uppercase tracking-widest">PAGADO</span>}
                          </p>
                        </div>
                        {/* Mostrar botón solo para efectivo o transferencia cuando no está pagado */}
                        {needsManualPayment && (
                          !isPaid && !propIsClosed ? (
                            <button
                              onClick={() => onMarkGuestAsPaid(guest.id)}
                              disabled={markingGuestAsPaid === guest.id}
                              className="px-4 py-2 bg-red-600 text-white rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-red-700 transition-all shadow-sm active:scale-95 whitespace-nowrap disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                              {markingGuestAsPaid === guest.id ? (
                                <>
                                  <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                  <span>Procesando...</span>
                                </>
                              ) : (
                                'Marcar Pagado'
                              )}
                            </button>
                          ) : null
                        )}
                        {/* Para MercadoPago, no mostrar botón, solo mostrar estado */}
                        {isMercadoPago && !isPaid && (
                          <div className="px-4 py-2 bg-blue-50 text-blue-600 rounded-xl font-black text-[9px] uppercase tracking-widest whitespace-nowrap border border-blue-100">
                            Esperando Pago
                          </div>
                        )}
                      </div>
                    </div>
                  );
                  })}
                </div>
              </div>
            ) : null;
          })()}
        </div>
      </div>
    </div>
  );
};

/** Vista detalle de una mesa: header total (separado), envíos (BatchCards sueltos), card División de pago */
const OrderDetailContent: React.FC<{
  order: any;
  onCloseMesa: (order: any) => Promise<void>;
  onUpdateBatchStatus: (batchId: string, newStatus: string) => void;
  onMarkGuestAsPaid: (guestId: string) => void;
  markingGuestAsPaid: string | null;
  onRefresh?: () => void;
  isClosed?: boolean;
}> = ({ order, onCloseMesa, onUpdateBatchStatus, onMarkGuestAsPaid, markingGuestAsPaid, onRefresh, isClosed = false }) => {
  const [copiedPaymentId, setCopiedPaymentId] = useState<string | null>(null);
  const batches = (order.order_batches || []).filter((b: any) => b.status !== 'CREADO');
  const status = getOrderTableStatus(order);

  const guestsWithAmount = order.order_guests?.filter((g: any) => (g.individual_amount || 0) > 0) ?? [];
  const sumOfGuestsWithAmount = guestsWithAmount.reduce((sum: number, g: any) => sum + (Number(g.individual_amount) || 0), 0);
  const totalAmount = Number(order.total_amount || 0);
  const guestsToShow = (sumOfGuestsWithAmount === totalAmount && totalAmount > 0) ? guestsWithAmount : (order.order_guests ?? []);

  return (
    <div className="space-y-6 min-w-0 w-full">
      {/* 1. Header separado: Total acumulado + N envíos + Cerrar mesa */}
      <div className="px-6 py-5 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-2xl border border-indigo-400 shadow-lg">
        <div className="flex flex-wrap justify-between items-center gap-4">
          <div>
            <p className="text-[9px] font-black text-indigo-100 uppercase tracking-widest mb-0.5">Total acumulado</p>
            <p className="text-2xl font-black text-white tracking-tighter">${Number(order.total_amount).toLocaleString('es-CL')}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="px-4 py-1.5 bg-white/20 backdrop-blur-sm text-white rounded-full text-[9px] font-black uppercase tracking-widest border border-white/30">
              {batches.length} {batches.length === 1 ? 'Envío' : 'Envíos'}
            </span>
            {status.isMesaListaParaCerrar && (
              <button
                onClick={() => onCloseMesa(order)}
                className="px-4 py-2 bg-emerald-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-sm active:scale-95"
              >
                Cerrar mesa
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2. Cards de envíos (BatchCards) — fuera de cualquier card contenedora */}
      {batches.length > 0 ? (
        <div className="space-y-3">
          {batches.map((batch: any, idx: number) => (
            <BatchCard
              key={batch.id}
              batch={batch}
              batchIndex={idx}
              onUpdateBatchStatus={onUpdateBatchStatus}
              isArchived={isClosed}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-10 rounded-2xl border border-dashed border-gray-200 bg-gray-50/50 text-slate-400">
          <AlertCircle size={32} strokeWidth={1} className="mb-2" />
          <p className="text-[9px] font-black uppercase tracking-widest">Esperando primer pedido...</p>
        </div>
      )}

      {/* 3. Card separada: División de Pago — orden descendente por monto; $0 abajo y en gris sin pill */}
      {guestsToShow.length > 0 && (() => {
        const sorted = [...guestsToShow].sort((a, b) => (Number(b.individual_amount) || 0) - (Number(a.individual_amount) || 0));
        return (
          <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-md overflow-hidden">
            <div className="px-6 py-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">División de Pago</p>
                {onRefresh && (
                  <button type="button" onClick={onRefresh} className="text-[10px] font-black text-indigo-600 hover:text-indigo-700 uppercase tracking-widest flex items-center gap-1">
                    <RefreshCw size={12} /> Actualizar
                  </button>
                )}
              </div>
              <div className="space-y-2">
                {sorted.map((guest: any) => {
                  const paymentMethod = guest.payment_method?.toLowerCase() || null;
                  const guestTotal = Number(guest.individual_amount) || 0;
                  const isZero = guestTotal === 0;
                  const isPaid = guest.paid === true;
                  const paymentId = guest.payment_id || null;
                  const needsManualPayment = paymentMethod && (paymentMethod === 'efectivo' || paymentMethod === 'transferencia');
                  const isMercadoPago = paymentMethod === 'mercadopago';
                  return (
                    <div key={guest.id} className={`flex items-center justify-between p-3 rounded-xl border ${isZero ? 'bg-gray-50/80 border-gray-100' : 'bg-slate-50 border-gray-100'}`}>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-black text-slate-900">{guest.name || 'Sin nombre'}</p>
                          {!isZero && (
                            <span className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase ${isPaid ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-amber-100 text-amber-700 border border-amber-200'}`}>
                              {isPaid ? 'Pagado' : 'Pendiente'}
                            </span>
                          )}
                        </div>
                        {paymentMethod && !isZero && (
                          <>
                            <p className="text-[9px] text-slate-500 font-medium">Método: <span className="font-black text-slate-700 capitalize">{paymentMethod}</span></p>
                            {isMercadoPago && isPaid && paymentId && (
                              <div className="flex items-center gap-1.5 mt-1">
                                <span className="text-[9px] text-indigo-600">ID: {paymentId}</span>
                                <button type="button" onClick={() => { navigator.clipboard.writeText(paymentId); setCopiedPaymentId(paymentId); setTimeout(() => setCopiedPaymentId(null), 1500); }} className="p-0.5 rounded hover:bg-gray-100 text-indigo-600" title="Copiar ID">
                                  {copiedPaymentId === paymentId ? <Check size={12} /> : <Copy size={12} />}
                                </button>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                      <div className="flex items-center gap-3 ml-4">
                        <p className={`text-lg font-black flex items-center justify-end gap-2 flex-wrap ${isZero ? 'text-slate-400' : 'text-indigo-600'}`}>
                          ${guestTotal.toLocaleString('es-CL')}
                          {!isZero && isPaid && <span className="text-emerald-600 font-black text-[9px] uppercase tracking-widest">PAGADO</span>}
                        </p>
                        {!isZero && needsManualPayment && !isPaid && !isClosed ? (
                          <button onClick={() => onMarkGuestAsPaid(guest.id)} disabled={markingGuestAsPaid === guest.id} className="px-4 py-2 bg-red-600 text-white rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-red-700 transition-all shadow-sm active:scale-95 whitespace-nowrap disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2">
                            {markingGuestAsPaid === guest.id ? (<><div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div><span>Procesando...</span></>) : 'Marcar Pagado'}
                          </button>
                        ) : null}
                        {!isZero && isMercadoPago && !isPaid && (
                          <div className="px-4 py-2 bg-blue-50 text-blue-600 rounded-xl font-black text-[9px] uppercase tracking-widest whitespace-nowrap border border-blue-100">Esperando Pago</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

const OrdersPage: React.FC<OrdersPageProps> = ({ restaurant, waiterTableIds, onNewBatch, onTableMenuData }) => {
  const [orders, setOrders] = useState<any[]>([]);
  const [allAssignedTables, setAllAssignedTables] = useState<Array<{ id: string; table_number: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [toggleLoading, setToggleLoading] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [isDraggingStrip, setIsDraggingStrip] = useState(false);

  const restaurantId = restaurant.id;
  const selectedOrder = orders.find(o => o.id === selectedOrderId) ?? orders[0] ?? null;
  const effectiveSelectedId = selectedOrder?.id ?? null;
  const [markingGuestAsPaid, setMarkingGuestAsPaid] = useState<string | null>(null);
  const [, setClosingOrderId] = useState<string | null>(null);
  const bellAudioRef = useRef<HTMLAudioElement | null>(null);
  const tableStripRef = useRef<HTMLDivElement>(null);
  const stripDragStart = useRef({ x: 0, scrollLeft: 0, moved: false });
  const waiterTableIdsRef = useRef(waiterTableIds);

  useEffect(() => {
    waiterTableIdsRef.current = waiterTableIds;
  }, [waiterTableIds]);

  // Obtener todas las mesas asignadas con sus números
  useEffect(() => {
    if (waiterTableIds.length === 0) {
      setAllAssignedTables([]);
      return;
    }
    supabase
      .from('tables')
      .select('id, table_number')
      .in('id', waiterTableIds)
      .order('table_number', { ascending: true })
      .then(({ data, error }) => {
        if (error) {
          console.error('Error al cargar mesas asignadas:', error);
          setAllAssignedTables([]);
        } else {
          setAllAssignedTables((data || []).map((t: any) => ({ id: t.id, table_number: t.table_number })));
        }
      });
  }, [waiterTableIds]);

  useEffect(() => {
    bellAudioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');

    fetchActiveOrders();

    const channel = supabase
      .channel('admin-kitchen-realtime')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'orders',
        filter: restaurantId ? `restaurant_id=eq.${restaurantId}` : undefined
      }, (payload) => {
        setExpandedOrderId(payload.new.id);
        fetchActiveOrders();
      })
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'order_batches' 
      }, (payload) => {
        if (bellAudioRef.current) {
          bellAudioRef.current.currentTime = 0;
          bellAudioRef.current.play().catch(() => {});
        }
        onNewBatch?.();
        setExpandedOrderId(payload.new.order_id);
        fetchActiveOrders();
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'order_batches' }, () => {
        fetchActiveOrders();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_items' }, () => {
        fetchActiveOrders();
      })
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'orders',
        filter: restaurantId ? `restaurant_id=eq.${restaurantId}` : undefined
      }, () => {
        fetchActiveOrders();
      })
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'order_guests'
      }, (payload) => {
        if (import.meta.env.DEV) console.log('[Realtime] order_guests', payload.eventType, payload);
        fetchActiveOrders();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [restaurantId]);

  useEffect(() => {
    if (orders.length === 0) return;
    const hasExpanded = expandedOrderId && orders.some(o => o.id === expandedOrderId);
    setSelectedOrderId(prev => {
      if (hasExpanded && expandedOrderId) return expandedOrderId;
      if (prev && orders.some(o => o.id === prev)) return prev;
      return orders[0].id;
    });
  }, [orders, expandedOrderId]);

  // Polling: refrescar datos cada 20s cuando hay una mesa seleccionada (fallback si Realtime no llega)
  useEffect(() => {
    if (!effectiveSelectedId) return;
    const interval = setInterval(() => {
      fetchActiveOrders();
    }, 20000);
    return () => clearInterval(interval);
  }, [effectiveSelectedId]);

  const handleTableStripPointerDown = (e: React.PointerEvent) => {
    if (!tableStripRef.current) return;
    stripDragStart.current = {
      x: e.clientX,
      scrollLeft: tableStripRef.current.scrollLeft,
      moved: false,
    };
    setIsDraggingStrip(true);
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const handleTableStripPointerMove = (e: React.PointerEvent) => {
    if (!tableStripRef.current || !isDraggingStrip) return;
    const dx = stripDragStart.current.x - e.clientX;
    if (Math.abs(dx) > 5) stripDragStart.current.moved = true;
    tableStripRef.current.scrollLeft = stripDragStart.current.scrollLeft + dx;
    stripDragStart.current.x = e.clientX;
    stripDragStart.current.scrollLeft = tableStripRef.current.scrollLeft;
  };

  const handleTableStripPointerUp = (e: React.PointerEvent) => {
    (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
    setIsDraggingStrip(false);
    stripDragStart.current.scrollLeft = tableStripRef.current?.scrollLeft ?? 0;
  };

  const handleTableStripPointerLeave = () => {
    setIsDraggingStrip(false);
  };

  const handleTableChipClick = (orderId: string | null) => {
    if (!orderId) return;
    if (stripDragStart.current.moved) {
      stripDragStart.current.moved = false;
      return;
    }
    setSelectedOrderId(orderId);
  };

  const fetchActiveOrders = async () => {
    if (!restaurantId) return;
    try {
      setErrorMsg(null);

      const ordersTable = 'orders';
      const batchesTable = 'order_batches';
      const itemsTable = 'order_items';
      const guestsTable = 'order_guests';
      const paymentsTable = 'payments';

      const query = supabase
        .from(ordersTable)
        .select('*')
        .eq('restaurant_id', restaurantId)
        .or('status.eq.ABIERTO,status.eq.SOLICITADO,status.eq.Pagado,status.eq.CERRADO');

      const { data: ordersData, error: ordersError } = await query;

      // Debug: verificar qué tabla se está consultando
      console.log(`✅ Consulta completada. Tabla: ${ordersTable}, Órdenes encontradas:`, ordersData?.length || 0);
      if (ordersData && ordersData.length > 0) {
        console.log('📊 Primeras órdenes:', ordersData.slice(0, 3).map(o => ({ id: o.id, status: o.status, table_id: o.table_id })));
      }

      if (ordersError) throw ordersError;
      if (!ordersData) { setOrders([]); return; }

      const waiterTableIdsList = waiterTableIdsRef.current;
      const ordersFiltered = waiterTableIdsList.length > 0
        ? ordersData.filter((o: any) => o.table_id && waiterTableIdsList.includes(o.table_id))
        : ordersData;

      const orderIds = ordersFiltered.map((order: any) => order.id);

      // Obtener información de las mesas por separado (ya que no hay relación directa con orders_archive)
      const tableIds = [...new Set(ordersFiltered.map((order: any) => order.table_id).filter(Boolean))];
      let tablesData: any[] = [];
      if (tableIds.length > 0) {
        const { data: tables, error: tablesError } = await supabase
          .from('tables')
          .select('id, table_number')
          .in('id', tableIds);
        if (tablesError) {
          console.error('Error al cargar tables:', tablesError);
        } else {
          tablesData = tables || [];
        }
      }

      // Obtener batches por separado (ya que no podemos hacer join entre tablas diferentes)
      let batchesData: any[] = [];
      if (orderIds.length > 0) {
        const { data: batches, error: batchesError } = await supabase
          .from(batchesTable)
          .select('*')
          .in('order_id', orderIds);
        if (batchesError) {
          console.error('Error al cargar batches:', batchesError);
        } else {
          batchesData = batches || [];
        }
      }

      const batchIds = batchesData.map(batch => batch.id);

      let itemsData: any[] = [];
      if (batchIds.length > 0) {
        // Obtener items sin el join con menu_items (ya que no hay relación directa con _archive)
        const { data: items, error: itemsError } = await supabase
          .from(itemsTable)
          .select('*')
          .in('batch_id', batchIds);
        if (itemsError) throw itemsError;
        itemsData = items || [];

        // Obtener menu_items por separado si hay items
        if (itemsData.length > 0) {
          const menuItemIds = [...new Set(itemsData.map(item => item.menu_item_id).filter(Boolean))];
          if (menuItemIds.length > 0) {
            const { data: menuItems, error: menuItemsError } = await supabase
              .from('menu_items')
              .select('id, name')
              .in('id', menuItemIds);
            if (menuItemsError) {
              console.error('Error al cargar menu_items:', menuItemsError);
            } else {
              // Combinar menu_items con items
              itemsData = itemsData.map(item => {
                const menuItem = menuItems?.find(mi => mi.id === item.menu_item_id);
                return {
                  ...item,
                  menu_items: menuItem ? { name: menuItem.name } : null
                };
              });
            }
          }
        }
      }

      // Obtener order_guests para cada orden
      let guestsData: any[] = [];
      if (orderIds.length > 0) {
        const { data: guests, error: guestsError } = await supabase
          .from(guestsTable)
          .select('*')
          .in('order_id', orderIds);
        if (guestsError) {
          console.error('Error al cargar order_guests:', guestsError);
        } else {
          guestsData = guests || [];
        }
      }

      // Obtener payments para cada orden
      let paymentsData: any[] = [];
      if (orderIds.length > 0) {
        const { data: payments, error: paymentsError } = await supabase
          .from(paymentsTable)
          .select('*')
          .in('order_id', orderIds);
        if (paymentsError) throw paymentsError;
        paymentsData = payments || [];
      }

      const processedOrders = ordersFiltered.map((order: any) => {
        // Obtener batches para esta orden
        const orderBatches = batchesData
          .filter(batch => batch.order_id === order.id)
          .map((batch: any) => ({
            ...batch,
            order_items: itemsData.filter(item => item.batch_id === batch.id)
          }))
          .sort((a: any, b: any) => 
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          );

        // Calcular el timestamp de la actividad más reciente (orden o último lote)
        const latestBatchTime = orderBatches.length > 0 
          ? Math.max(...orderBatches.map((b: any) => new Date(b.created_at).getTime()))
          : new Date(order.created_at).getTime();

        const lastActivity = Math.max(new Date(order.created_at).getTime(), latestBatchTime);

        // Obtener guests y payments para esta orden
        const orderGuests = guestsData.filter(guest => guest.order_id === order.id);
        const orderPayments = paymentsData.filter(payment => payment.order_id === order.id);

        // Combinar guests con sus payments
        const guestsWithPayments = orderGuests.map(guest => {
          const guestPayment = orderPayments.find(p => p.guest_id === guest.id);
          return {
            ...guest,
            payment: guestPayment || null
          };
        });

        // Obtener información de la mesa
        const tableInfo = tablesData.find(table => table.id === order.table_id);

        return {
          ...order,
          tables: tableInfo ? { table_number: tableInfo.table_number } : null,
          order_batches: orderBatches,
          order_guests: guestsWithPayments,
          lastActivity
        };
      });

      // Filtrar órdenes: excluir aquellas que solo tienen batches con status 'CREADO'
      const filteredOrders = processedOrders.filter(order => {
          const batches = order.order_batches || [];
          // Si no tiene batches, no mostrar
          if (batches.length === 0) {
            return false;
          }
          // Si tiene batches, verificar si al menos uno NO es 'CREADO'
          const hasNonCreatedBatch = batches.some((batch: any) => batch.status !== 'CREADO');
          return hasNonCreatedBatch;
        });

      // Ordenar por actividad reciente DESC
      filteredOrders.sort((a, b) => b.lastActivity - a.lastActivity);

      setOrders(prev => {
        if (filteredOrders.length === 0 && prev.length > 0 && waiterTableIdsList.length > 0) {
          if (import.meta.env.DEV) console.warn('[fetchActiveOrders] Refetch devolvió 0 órdenes pero ya había mesas; se mantiene la lista anterior para evitar parpadeo.');
          return prev;
        }
        return filteredOrders;
      });
    } catch (err: any) {
      console.error("Fetch Orders Error:", err);
      setErrorMsg(err.message || 'Error de conexión con cocina');
    } finally {
      setLoading(false);
      setToggleLoading(false);
    }
  };

  const handleUpdateBatchStatus = async (batchId: string, newStatus: string) => {
    if (!batchId || !newStatus) {
      alert('Error: Datos inválidos para actualizar el batch');
      return;
    }

    try {
      const updateData: any = { status: newStatus };

      // Si el nuevo estado es SERVIDO, guardar el timestamp
      if (newStatus === 'SERVIDO') {
        updateData.served_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('order_batches')
        .update(updateData)
        .eq('id', batchId)
        .select();

      if (error) {
        console.error('Error al actualizar batch:', error);
        if (error.message?.includes('policy') || error.message?.includes('RLS') || error.message?.includes('permission')) {
          alert(
            'Error: No tienes permisos para actualizar order_batches.\n\n' +
            'Solución: Verifica las políticas RLS en Supabase para permitir UPDATE en order_batches.'
          );
        } else {
          alert("Error al actualizar el estado del batch: " + error.message);
        }
        return;
      }

      // Refrescar las órdenes para mostrar el cambio
      await fetchActiveOrders();
    } catch (err: any) {
      console.error('Error completo al actualizar batch:', err);
      alert("Error al actualizar el estado del batch: " + (err.message || 'Error desconocido'));
    }
  };

  const handleMarkGuestAsPaid = async (guestId: string) => {
    if (!guestId) {
      alert('Error: ID de guest no válido');
      return;
    }

    // Activar estado de loading
    setMarkingGuestAsPaid(guestId);

    try {
      // Intentar primero con función RPC (bypassa RLS)
      const { error: rpcError } = await supabase.rpc('mark_guest_as_paid', {
        guest_id: guestId
      });

      if (rpcError) {
        // Si la función RPC no existe o falla, intentar con update directo
        console.warn('Función RPC no disponible, intentando update directo:', rpcError.message);

        const { error } = await supabase
          .from('order_guests')
          .update({ paid: true })
          .eq('id', guestId)
          .select();

        if (error) {
          console.error('Error al actualizar order_guests:', error);
          setMarkingGuestAsPaid(null); // Desactivar loading en caso de error
          if (error.message?.includes('policy') || error.message?.includes('RLS') || error.message?.includes('permission')) {
            alert(
              'Error: No tienes permisos para actualizar order_guests.\n\n' +
              'Solución: Ejecuta el script "mark_guest_as_paid_function.sql" en el SQL Editor de Supabase\n' +
              'O ejecuta "add_order_guests_paid_policy.sql" para agregar políticas RLS de UPDATE.'
            );
          } else {
            alert("Error al marcar como pagado: " + error.message);
          }
          return;
        }
      }

      // Refrescar las órdenes para mostrar el cambio
      await fetchActiveOrders();
    } catch (err: any) {
      console.error('Error completo al marcar como pagado:', err);
      setMarkingGuestAsPaid(null); // Desactivar loading en caso de error
      alert("Error al marcar como pagado: " + (err.message || 'Error desconocido'));
    } finally {
      // Desactivar loading después de completar (con un pequeño delay para que se vea el cambio)
      setTimeout(() => {
        setMarkingGuestAsPaid(null);
      }, 500);
    }
  };

  const handleCloseMesa = async (order: any): Promise<void> => {
    if (!restaurantId) {
      setErrorMsg("No hay restaurante seleccionado");
      return;
    }

    try {
      setClosingOrderId(order.id);
      setErrorMsg(null);
      console.log('🔄 Cerrando mesa - Cambiando status a "CERRADO"...', order.id);

      // Usar la nueva función RPC para cerrar la orden
      const { data: rpcResult, error: rpcError } = await supabase.rpc('close_order_as_cerrado', {
        order_id: order.id,
        restaurant_id_param: restaurantId
      });

      if (rpcError) {
        console.error("❌ Error al llamar la función RPC:", rpcError);
        setErrorMsg("No se pudo cerrar la mesa: " + (rpcError.message || 'Error desconocido'));
        
        // Si la función no existe, mostrar mensaje específico
        if (rpcError.message?.includes('function') || rpcError.message?.includes('does not exist') || rpcError.code === '42883') {
          setErrorMsg("⚠️ La función de cerrar orden no está disponible. Ejecuta close_order_cerrado_function.sql en Supabase SQL Editor.");
        }
        return;
      }

      if (rpcResult && rpcResult.error) {
        console.error("❌ Error en la función RPC:", rpcResult.error);
        setErrorMsg("No se pudo cerrar la mesa: " + (rpcResult.error || 'Error desconocido'));
        return;
      }

      if (!rpcResult) {
        console.error("❌ La función RPC no devolvió resultado");
        setErrorMsg("No se pudo cerrar la mesa: La función no devolvió resultado");
        return;
      }

      console.log('✅ Orden cerrada usando RPC:', rpcResult);
      
      // Verificar que el status se actualizó correctamente
      const validClosedStatuses = ['CERRADO', 'Pagado'];
      if (rpcResult.status && !validClosedStatuses.includes(rpcResult.status)) {
        console.error("❌ El status no se actualizó correctamente. Status actual:", rpcResult.status);
        setErrorMsg(`El status no se actualizó. Status actual: ${rpcResult.status}, esperado: CERRADO o Pagado`);
        return;
      }

      console.log(`✅ Orden cerrada correctamente con status: ${rpcResult.status || 'CERRADO'}`);
      console.log('✅ Mesa cerrada correctamente');
      
      // Refrescar las órdenes
      await fetchActiveOrders();
    } catch (err: any) {
      console.error("Error al cerrar la mesa:", err);
      setErrorMsg("No se pudo cerrar la mesa: " + (err.message || 'Error desconocido'));
    } finally {
      setClosingOrderId(null);
    }
  };

  // Crear array combinado de todas las mesas asignadas (con y sin órdenes)
  // IMPORTANTE: Este hook debe estar ANTES del return condicional para cumplir las reglas de Hooks
  const allTablesWithStatus = useMemo(() => {
    return allAssignedTables.map(table => {
      const orderForTable = orders.find(o => o.table_id === table.id);
      if (orderForTable) {
        const status = getOrderTableStatus(orderForTable);
        return {
          tableId: table.id,
          tableNumber: table.table_number,
          orderId: orderForTable.id,
          status: status.label,
          statusColorClass: status.colorClass,
          hasOrder: true
        };
      } else {
        return {
          tableId: table.id,
          tableNumber: table.table_number,
          orderId: null,
          status: 'LIBRE',
          statusColorClass: 'bg-gray-100 text-gray-600 border-gray-200',
          hasOrder: false
        };
      }
    });
  }, [allAssignedTables, orders]);

  // Exponer datos del menú a App.tsx
  // IMPORTANTE: Este hook también debe estar ANTES del return condicional
  useEffect(() => {
    if (onTableMenuData && !loading) {
      onTableMenuData({
        allTablesWithStatus,
        selectedOrderId: effectiveSelectedId,
        onTableClick: handleTableChipClick,
        tableStripRef,
        isDraggingStrip,
        handlers: {
          onPointerDown: handleTableStripPointerDown,
          onPointerMove: handleTableStripPointerMove,
          onPointerUp: handleTableStripPointerUp,
          onPointerLeave: handleTableStripPointerLeave,
          onPointerCancel: handleTableStripPointerUp,
        },
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allTablesWithStatus, effectiveSelectedId, isDraggingStrip, loading]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-40 gap-4">
        <Loader2 className="animate-spin text-indigo-600" size={48} />
        <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Sincronizando cocina...</p>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="space-y-10 animate-in fade-in duration-700 pb-20">

      {errorMsg && (
        <div className="p-6 bg-rose-50 border-2 border-rose-100 rounded-3xl flex items-center gap-4 text-rose-600 animate-shake">
          <AlertCircle size={24} />
          <div className="flex-1">
            <p className="font-black text-xs uppercase tracking-widest">Atención Requerida</p>
            <p className="text-sm font-bold opacity-80">{errorMsg}</p>
          </div>
          <button onClick={() => setErrorMsg(null)} className="p-2 hover:bg-rose-100 rounded-full">
            <X size={18} />
          </button>
        </div>
      )}

      {toggleLoading ? (
        <div className="max-w-xl">
          <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-md overflow-hidden animate-pulse min-w-0 w-full">
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="h-6 bg-gray-200 rounded-lg w-32"></div>
                <div className="h-8 bg-gray-200 rounded-xl w-20"></div>
              </div>
              <div className="space-y-2 pt-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-24 bg-gray-100 rounded-2xl"></div>
                ))}
              </div>
              <div className="pt-4 border-t border-gray-100">
                <div className="h-10 bg-gray-200 rounded-xl"></div>
              </div>
            </div>
          </div>
        </div>
      ) : orders.length > 0 && selectedOrder ? (
        <div className="max-w-xl">
          <OrderDetailContent
            order={selectedOrder}
            onCloseMesa={handleCloseMesa}
            onUpdateBatchStatus={handleUpdateBatchStatus}
            onMarkGuestAsPaid={handleMarkGuestAsPaid}
            markingGuestAsPaid={markingGuestAsPaid}
            onRefresh={fetchActiveOrders}
            isClosed={selectedOrder.status === 'Pagado'}
          />
        </div>
      ) : orders.length > 0 ? (
        <div className="py-20 text-center text-slate-400">
          <p className="text-sm font-medium">Selecciona una mesa arriba</p>
        </div>
      ) : (
        <div className="py-40 flex flex-col items-center justify-center bg-white rounded-[4rem] border border-dashed border-gray-200 text-center">
           <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center text-gray-200 mb-6">
              <Utensils size={40} />
           </div>
           <h3 className="text-xl font-black text-slate-300 uppercase tracking-widest">Cocina en calma</h3>
           <p className="text-xs text-slate-400 mt-2 font-medium">Los pedidos aparecerán aquí automáticamente</p>
           <p className="text-[10px] text-slate-400 mt-4 max-w-xs">Arriba verás «Mesas asignadas». Al haber pedidos en tus mesas, aparecerán los botones de cada mesa; al tocar uno verás el total acumulado, los envíos y la división de pago.</p>
        </div>
      )}
      </div>
    </div>
  );
};

export default OrdersPage;
