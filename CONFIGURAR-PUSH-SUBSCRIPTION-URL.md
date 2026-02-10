# Cómo obtener la URL correcta para VITE_PUSH_SUBSCRIPTION_URL

La URL **no es inventada**: se arma con **tu dominio del push-service** + **el path del endpoint** que está en el código.

---

## Paso 1: Obtener el dominio del push-service (en Vercel)

1. Entra a [Vercel Dashboard](https://vercel.com/dashboard).
2. Abre el proyecto **splitme-waiter-push** (el del microservicio de push, no el de la app del mesero).
3. En la página del proyecto, mira la sección **Domains** (o en el último deployment, en "Domains").
4. Anota la URL que aparece, por ejemplo:
   - `splitme-waiter-push.vercel.app`
   - O la que tengas si usas dominio propio.

**Tu dominio base es:** `https://splitme-waiter-push.vercel.app`  
(Si en Vercel ves otra, usa esa. Siempre con `https://`.)

---

## Paso 2: Confirmar el path del endpoint (en el código)

El endpoint que recibe las suscripciones está definido en el push-service:

- **Archivo:** `push-service/server.js`
- **Línea:** donde dice `app.post('/api/push-subscribe', ...)`
- **Path:** `/api/push-subscribe`

Por tanto, la ruta completa del endpoint es: **`/api/push-subscribe`**

---

## Paso 3: Armar la URL completa

Fórmula:

```
https://[TU-DOMINIO-DEL-PASO-1]/api/push-subscribe
```

Ejemplo con el dominio que viste antes:

```
https://splitme-waiter-push.vercel.app/api/push-subscribe
```

- Sin barra final.
- Sin espacios.
- `https://` + dominio + `/api/push-subscribe`.

---

## Paso 4: Dónde configurarla en Vercel

1. En Vercel, abre el proyecto **splitme-waiter** (la app del mesero, no el push-service).
2. Ve a **Settings** → **Environment Variables**.
3. Agrega:
   - **Key:** `VITE_PUSH_SUBSCRIPTION_URL`
   - **Value:** la URL que armaste en el Paso 3 (ej: `https://splitme-waiter-push.vercel.app/api/push-subscribe`).
   - **Environment:** todas (Production, Preview, Development).
4. Guarda y haz **Redeploy** del proyecto `splitme-waiter`.

---

## Paso 5: Comprobar que la URL es correcta (opcional)

Después de que el push-service esté desplegado y respondiendo:

1. Abre en el navegador (o con `curl`):
   ```
   https://splitme-waiter-push.vercel.app/health
   ```
   Deberías ver algo como: `{"status":"ok", ...}`.

2. La URL que vas a configurar es la del **mismo dominio** pero con path `/api/push-subscribe`:
   ```
   https://splitme-waiter-push.vercel.app/api/push-subscribe
   ```
   Ese endpoint no se “ve” en el navegador (es POST), pero si `/health` responde, el mismo dominio es el correcto.

---

## Resumen

| Qué | Valor |
|-----|--------|
| Dominio (lo ves en Vercel, proyecto push) | `https://splitme-waiter-push.vercel.app` |
| Path (está en `push-service/server.js`) | `/api/push-subscribe` |
| **URL completa para VITE_PUSH_SUBSCRIPTION_URL** | `https://splitme-waiter-push.vercel.app/api/push-subscribe` |

Solo cambia el dominio si en Vercel tu proyecto push tiene otro (por ejemplo un dominio personalizado). El path `/api/push-subscribe` es el del código y no hay que inventarlo.
