# 🚀 Deploy rápido en Vercel

El código ya está en GitHub: **https://github.com/krikodium-personal/splitme-waiter**

## Método rápido (Dashboard de Vercel - recomendado)

1. **Ve a:** https://vercel.com/new
   - Si no tienes cuenta, crea una con GitHub (es gratis)

2. **Importa el repositorio:**
   - Click en **"Import Git Repository"**
   - Busca `krikodium-personal/splitme-waiter`
   - Si no aparece, click **"Adjust GitHub App Permissions"** y autoriza acceso

3. **Configuración (ya viene preconfigurada):**
   - ✅ Framework: Vite (detectado automáticamente)
   - ✅ Build Command: `npm run build`
   - ✅ Output Directory: `dist`
   - ✅ Install Command: `npm install`

4. **Variables de entorno (IMPORTANTE):**
   - Click en **"Environment Variables"**
   - Añade:
     ```
     VITE_SUPABASE_URL = https://tu-proyecto.supabase.co
     VITE_SUPABASE_ANON_KEY = tu-anon-key
     ```
   - (Opcional para push):
     ```
     VITE_VAPID_PUBLIC_KEY = tu-clave-publica
     VITE_PUSH_SUBSCRIPTION_URL = https://tu-api.com/push-subscribe
     ```

5. **Deploy:**
   - Click **"Deploy"**
   - Espera 1-2 minutos
   - ✅ Listo! Te dará una URL como: `https://splitme-waiter.vercel.app`

---

## Método alternativo (CLI)

Si prefieres usar la terminal:

```bash
# 1. Obtén un token de Vercel
# Ve a: https://vercel.com/account/tokens
# Crea un token y cópialo

# 2. Ejecuta el script de deploy
export VERCEL_TOKEN=tu-token-aqui
./deploy.sh

# O directamente:
npx vercel --prod --yes --token=tu-token-aqui
```

---

## Después del deploy

1. **Verifica la URL:** Abre la URL que te dio Vercel
2. **Prueba el login:** Deberías ver la pantalla de login de Splitme Meseros
3. **PWA:** En Chrome/Safari deberías poder instalarla (icono de "Instalar app")

---

## Actualizaciones automáticas

Cada vez que hagas `git push` a `main`, Vercel desplegará automáticamente:

```bash
git add .
git commit -m "Descripción del cambio"
git push origin main
```

Vercel detectará el push y hará un nuevo deploy automáticamente.

---

## Troubleshooting

- **Build falla:** Revisa los logs en Vercel Dashboard → Deployments
- **Variables no funcionan:** Asegúrate de que empiecen con `VITE_`
- **PWA no instala:** Verifica que estés en HTTPS (Vercel lo da por defecto)
