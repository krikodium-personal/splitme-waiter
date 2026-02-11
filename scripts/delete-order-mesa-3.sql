-- Borrar la orden y todas sus dependencias de la MESA 3 (sin borrar la mesa)
-- Ejecutar en Supabase > SQL Editor
-- Ajusta table_number si tu "mesa 3" usa otro número.

DO $$
DECLARE
  v_table_id UUID;
  v_order_ids UUID[];
  v_batch_ids UUID[];
  v_deleted_items int;
  v_deleted_payments int;
  v_deleted_guests int;
  v_deleted_batches int;
  v_deleted_orders int;
BEGIN
  -- 1) Obtener id de la mesa con table_number = 3 (columna puede ser text o integer)
  SELECT id INTO v_table_id
  FROM public.tables
  WHERE table_number::text = '3'
  LIMIT 1;

  IF v_table_id IS NULL THEN
    RAISE EXCEPTION 'No existe ninguna mesa con table_number = 3';
  END IF;

  -- 2) Obtener ids de órdenes de esa mesa
  SELECT ARRAY_AGG(id) INTO v_order_ids
  FROM public.orders
  WHERE table_id = v_table_id;

  IF v_order_ids IS NULL OR array_length(v_order_ids, 1) IS NULL THEN
    RAISE NOTICE 'No hay órdenes en la mesa 3. Nada que borrar.';
    RETURN;
  END IF;

  -- 3) Obtener ids de batches de esas órdenes (para order_items)
  SELECT ARRAY_AGG(id) INTO v_batch_ids
  FROM public.order_batches
  WHERE order_id = ANY(v_order_ids);

  -- 4) Borrar en orden (hijos primero por FKs)

  -- order_items (referencian batch_id)
  IF v_batch_ids IS NOT NULL AND array_length(v_batch_ids, 1) > 0 THEN
    DELETE FROM public.order_items WHERE batch_id = ANY(v_batch_ids);
    GET DIAGNOSTICS v_deleted_items = ROW_COUNT;
    RAISE NOTICE 'order_items borrados: %', v_deleted_items;
  END IF;

  -- payments (referencian order_id y/o guest_id de order_guests de estas órdenes)
  DELETE FROM public.payments WHERE order_id = ANY(v_order_ids);
  GET DIAGNOSTICS v_deleted_payments = ROW_COUNT;
  RAISE NOTICE 'payments borrados: %', v_deleted_payments;

  -- order_guests (referencian order_id)
  DELETE FROM public.order_guests WHERE order_id = ANY(v_order_ids);
  GET DIAGNOSTICS v_deleted_guests = ROW_COUNT;
  RAISE NOTICE 'order_guests borrados: %', v_deleted_guests;

  -- order_batches (referencian order_id)
  DELETE FROM public.order_batches WHERE order_id = ANY(v_order_ids);
  GET DIAGNOSTICS v_deleted_batches = ROW_COUNT;
  RAISE NOTICE 'order_batches borrados: %', v_deleted_batches;

  -- orders (referencian table_id; la mesa no se toca)
  DELETE FROM public.orders WHERE table_id = v_table_id;
  GET DIAGNOSTICS v_deleted_orders = ROW_COUNT;
  RAISE NOTICE 'orders borrados: %', v_deleted_orders;

  RAISE NOTICE 'Listo. Mesa 3 (table_id %) sigue existiendo; orden y dependencias eliminadas.', v_table_id;
END $$;
