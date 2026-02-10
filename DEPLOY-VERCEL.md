# Desplegar Splitme Meseros en Vercel

Guía paso a paso para crear el repositorio en GitHub y desplegar en Vercel.

---

## Paso 1: Crear repositorio en GitHub

1. Ve a [github.com](https://github.com) e inicia sesión.

2. Click en el **"+"** (arriba derecha) → **"New repository"**.

3. Configuración:
   - **Repository name:** `splitme-waiter` (o el nombre que prefieras)
   - **Description:** "App PWA para meseros de Splitme"
   - **Visibility:** Private (recomendado) o Public
   - **NO marques** "Add a README file" (ya tenemos uno)
   - **NO marques** "Add .gitignore" (ya tenemos uno)
   - **NO marques** "Choose a license"

4. Click **"Create repository"**.

5. GitHub te mostrará comandos. **NO los ejecutes aún** — primero haz commit local.

---

## Paso 2: Conectar repositorio local con GitHub

En la terminal, desde la carpeta del proyecto:

```bash
cd "/Users/kriko/Library/CloudStorage/Dropbox/Mi Mac (christians-MacBook-Pro.local)/Desktop/splitme/splitme-waiter"

# Añadir el remoto (reemplaza TU_USUARIO con tu usuario de GitHub)
git remote add origin https://github.com/TU_USUARIO/splitme-waiter.git

# O si prefieres SSH:
# git remote add origin git@github.com:TU_USUARIO/splitme-waiter.git

# Verificar que está conectado
git remote -v
```

---

## Paso 3: Push inicial a GitHub

```bash
# Asegúrate de estar en la rama main (o master)
git branch -M main

# Push del código
git push -u origin main
```

Si GitHub te pide autenticación:
- **HTTPS:** Usa un Personal Access Token (Settings → Developer settings → Personal access tokens → Generate new token, con permisos `repo`)
- **SSH:** Configura tus claves SSH en GitHub (Settings → SSH and GPG keys)

---

## Paso 4: Desplegar en Vercel

### Opción A: Desde el dashboard de Vercel (recomendado)

1. Ve a [vercel.com](https://vercel.com) e inicia sesión (con GitHub).

2. Click en **"Add New Project"** (o **"New Project"**).

3. **Importa el repositorio:**
   - Si no ves tu repo, click **"Adjust GitHub App Permissions"** y autoriza acceso al repositorio `splitme-waiter`.
   - Busca y selecciona `splitme-waiter`.

4. **Configuración del proyecto:**
   - **Framework Preset:** Vite (debería detectarse automáticamente)
   - **Root Directory:** `./` (dejar por defecto)
   - **Build Command:** `npm run build` (ya viene por defecto)
   - **Output Directory:** `dist` (ya viene por defecto)
   - **Install Command:** `npm install` (ya viene por defecto)

5. **Variables de entorno:**
   - Click en **"Environment Variables"**
   - Añade:
     ```
     VITE_SUPABASE_URL = https://tu-proyecto.supabase.co
     VITE_SUPABASE_ANON_KEY = tu-anon-key
     ```
   - Opcional (si usas push):
     ```
     VITE_VAPID_PUBLIC_KEY = tu-clave-publica-vapid
     VITE_PUSH_SUBSCRIPTION_URL = https://tu-api.com/push-subscribe
     ```

6. Click **"Deploy"**.

7. Espera 1-2 minutos. Vercel mostrará:
   - ✅ Build completado
   - 🌐 URL de producción (ej: `https://splitme-waiter.vercel.app`)

### Opción B: Desde la CLI de Vercel

```bash
# Instalar Vercel CLI globalmente (una vez)
npm install -g vercel

# Desde la carpeta del proyecto
cd "/Users/kriko/Library/CloudStorage/Dropbox/Mi Mac (christians-MacBook-Pro.local)/Desktop/splitme/splitme-waiter"

# Login
vercel login

# Deploy (primera vez)
vercel

# Seguir las preguntas:
# - Set up and deploy? Yes
# - Which scope? Tu cuenta/organización
# - Link to existing project? No (primera vez)
# - Project name? splitme-waiter
# - Directory? ./
# - Override settings? No

# Añadir variables de entorno
vercel env add VITE_SUPABASE_URL
vercel env add VITE_SUPABASE_ANON_KEY
# (repite para cada variable, pega el valor cuando te lo pida)

# Deploy a producción
vercel --prod
```

---

## Paso 5: Verificar el deploy

1. Abre la URL que te dio Vercel (ej: `https://splitme-waiter.vercel.app`).

2. Deberías ver la pantalla de login de Splitme Meseros.

3. **Verifica PWA:**
   - En Chrome/Edge: deberías ver el icono de "Instalar app" en la barra de direcciones.
   - En Safari (iPhone): Compartir → "Añadir a la pantalla de inicio".

---

## Actualizaciones futuras

Cada vez que hagas `git push` a la rama `main` en GitHub, Vercel **desplegará automáticamente** la nueva versión.

```bash
git add .
git commit -m "Descripción del cambio"
git push origin main
```

Vercel detectará el push, hará build y actualizará la URL de producción.

---

## Configuración adicional en Vercel (opcional)

### Dominio personalizado

1. En Vercel Dashboard → Tu proyecto → **Settings** → **Domains**.
2. Añade tu dominio (ej: `waiter.splitme.com`).
3. Sigue las instrucciones para configurar DNS.

### Variables de entorno por ambiente

- **Production:** Variables que se usan en producción.
- **Preview:** Variables para branches/PRs (puedes usar las mismas o diferentes).
- **Development:** Variables para `vercel dev` (local).

---

## Troubleshooting

### Build falla en Vercel

- Revisa los **Build Logs** en Vercel Dashboard → Deployments → Click en el deploy fallido.
- Verifica que todas las dependencias estén en `package.json`.
- Asegúrate de que `npm run build` funciona localmente.

### Variables de entorno no funcionan

- Verifica que los nombres empiecen con `VITE_` (Vite solo expone variables que empiezan así).
- Después de añadir variables, haz un nuevo deploy (o espera el auto-deploy del siguiente push).

### PWA no se instala

- Verifica que estés en **HTTPS** (Vercel lo da por defecto).
- Revisa la consola del navegador (F12) por errores del service worker.
- Asegúrate de que `dist/sw.js` existe después del build.

---

## URLs útiles

- **Vercel Dashboard:** https://vercel.com/dashboard
- **Documentación Vercel:** https://vercel.com/docs
- **Vite + Vercel:** https://vercel.com/guides/deploying-vite-to-vercel
