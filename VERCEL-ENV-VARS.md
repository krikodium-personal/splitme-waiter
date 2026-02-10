# Configurar Variables de Entorno en Vercel

## ⚠️ IMPORTANTE: Después de agregar variables, DEBES hacer REDEPLOY

Las variables de entorno solo están disponibles después de un nuevo deploy.

## Paso a paso completo

### 1. Agregar Variable en Vercel

1. Ve a [Vercel Dashboard](https://vercel.com/dashboard)
2. Selecciona tu proyecto `splitme-waiter`
3. Ve a **Settings** → **Environment Variables**
4. Click en **Add New**
5. Completa:
   - **Key:** `VITE_VAPID_PUBLIC_KEY`
   - **Value:** Pega tu VAPID Public Key (sin espacios al inicio/final)
   - **Environment:** ✅ Marca **todas** las opciones:
     - ✅ Production
     - ✅ Preview  
     - ✅ Development
6. Click **Save**

### 2. HACER REDEPLOY (CRÍTICO)

**Las variables NO están disponibles hasta que redesplegas:**

#### Opción A: Redeploy desde Vercel Dashboard
1. Ve a **Deployments**
2. Encuentra el último deployment
3. Click en los **3 puntos** (⋯) a la derecha
4. Selecciona **Redeploy**
5. Espera a que termine el deploy (1-2 minutos)

#### Opción B: Push a GitHub (automático)
```bash
# Cualquier cambio y push hará que Vercel redesplegue automáticamente
git commit --allow-empty -m "trigger redeploy for env vars"
git push
```

### 3. Verificar que la variable está disponible

Después del redeploy:

1. **Abre la app en tu iPhone**
2. **Recarga completamente** la PWA (pull down para refrescar)
3. **Abre el diagnóstico de push notifications**
4. **Revisa la consola del navegador** (si tienes acceso):
   - Deberías ver logs con `[Diagnóstico] VAPID Key check:`
   - Debería mostrar `exists: true` y la longitud de la key

### 4. Verificación en el diagnóstico

El diagnóstico debería mostrar:
- ✅ **VAPID Public Key: Configurada**
- Con detalles mostrando los primeros caracteres de la key

## Troubleshooting

### La variable sigue mostrando "No configurada" después del redeploy

**Verifica:**

1. ✅ **Nombre exacto:** Debe ser exactamente `VITE_VAPID_PUBLIC_KEY` (con `VITE_` al inicio)
2. ✅ **Environment:** Debe estar marcada para **Production** (y Preview/Development si quieres)
3. ✅ **Redeploy hecho:** Las variables solo están disponibles después de un nuevo deploy
4. ✅ **App recargada:** Recarga completamente la PWA después del deploy
5. ✅ **Sin espacios:** La key no debe tener espacios al inicio o final

### Verificar en Vercel que la variable existe

1. Ve a **Settings** → **Environment Variables**
2. Busca `VITE_VAPID_PUBLIC_KEY` en la lista
3. Verifica que esté marcada para **Production**
4. Click en ella para ver el valor (debería mostrar los primeros caracteres)

### Verificar en el código

Abre la consola del navegador en tu iPhone (si es posible) o en Safari Desktop conectado al iPhone:

```javascript
// En la consola del navegador, ejecuta:
console.log('VAPID Key:', import.meta.env.VITE_VAPID_PUBLIC_KEY);
console.log('Todas las vars VITE:', Object.keys(import.meta.env).filter(k => k.startsWith('VITE_')));
```

Si muestra `undefined`, la variable no está disponible (necesitas redeploy).

### La variable está en Vercel pero no funciona

**Posibles causas:**

1. **Variable en ambiente incorrecto:** Si solo está en Development, no funcionará en Production
2. **Cache del navegador:** Limpia el cache o reinstala la PWA
3. **Build antiguo:** El build se hizo antes de agregar la variable
4. **Nombre incorrecto:** Debe empezar con `VITE_` para que Vite la exponga

## Verificación rápida

Después de agregar la variable y hacer redeploy:

```bash
# En tu terminal local, verifica que el build incluye la variable:
npm run build
# Revisa dist/index.html o dist/assets/*.js para ver si la variable está incluida
```

## Nota sobre VITE_

**IMPORTANTE:** Solo las variables que empiezan con `VITE_` son expuestas al código del frontend por Vite. Si agregas una variable sin `VITE_`, no estará disponible en `import.meta.env`.

## Próximos pasos después de configurar

Una vez que la VAPID Key esté configurada y funcionando:

1. ✅ El diagnóstico mostrará "VAPID Public Key: Configurada"
2. ✅ Podrás hacer click en "REGISTRAR PUSH SUBSCRIPTION"
3. ✅ Se creará la suscripción push correctamente
4. ⚠️ Aún necesitarás un backend para enviar notificaciones push reales
