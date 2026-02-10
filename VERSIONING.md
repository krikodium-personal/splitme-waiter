# Sistema de Versionado

Este proyecto utiliza [Semantic Versioning](https://semver.org/lang/es/) para el control de versiones.

## Formato de Versión

Las versiones siguen el formato `MAJOR.MINOR.PATCH`:
- **MAJOR**: Cambios incompatibles en la API
- **MINOR**: Nuevas funcionalidades compatibles hacia atrás
- **PATCH**: Correcciones de bugs compatibles hacia atrás

## Versión Actual

La versión actual se muestra en:
- `package.json` → campo `version`
- `src/version.ts` → constante `APP_VERSION`
- Footer de la aplicación → visible en la parte inferior

## Incrementar Versión

### Opción 1: Usar scripts de npm

```bash
# Incrementar patch (1.0.0 → 1.0.1)
npm run version:patch

# Incrementar minor (1.0.0 → 1.1.0)
npm run version:minor

# Incrementar major (1.0.0 → 2.0.0)
npm run version:major
```

### Opción 2: Usar el script directamente

```bash
node scripts/version.js [patch|minor|major]
```

## Proceso de Deploy con Versión

**⚠️ REGLA CRÍTICA: NUNCA hagas deploy sin incrementar la versión primero**

### Opción 1: Usar script de deploy (RECOMENDADO)

El script incrementa la versión automáticamente antes de hacer push:

```bash
# Deploy con mensaje automático
npm run deploy

# O con mensaje personalizado
bash scripts/deploy.sh "feat: descripción de cambios"
```

### Opción 2: Proceso manual

1. **Haz tus cambios** en el código
2. **Actualiza el CHANGELOG.md** con los cambios realizados
3. **Incrementa la versión**:
   ```bash
   npm run version:patch  # o minor/major según corresponda
   ```
4. **Haz commit y push**:
   ```bash
   git add .
   git commit -m "feat: descripción de cambios - v$(node -p "require('./package.json').version")"
   git push
   ```

**IMPORTANTE:** El footer de la app siempre debe mostrar la versión correcta después de cada deploy.

El script de versión automáticamente:
- ✅ Actualiza `package.json`
- ✅ Actualiza `src/version.ts`
- ✅ Crea una nueva entrada en `CHANGELOG.md` (si no existe)

## CHANGELOG.md

Todos los cambios deben documentarse en `CHANGELOG.md` siguiendo el formato:

```markdown
## [X.Y.Z] - YYYY-MM-DD

### Agregado
- Nueva funcionalidad X
- Nueva funcionalidad Y

### Cambiado
- Cambio en funcionalidad existente

### Corregido
- Bug fix
```

## Ejemplo de Flujo Completo

```bash
# 1. Hacer cambios en el código
# ... editar archivos ...

# 2. Actualizar CHANGELOG.md manualmente con detalles
# ... editar CHANGELOG.md ...

# 3. Incrementar versión (patch para bug fixes)
npm run version:patch

# 4. Verificar cambios
git status

# 5. Commit y push
git add .
git commit -m "fix: corrección de cálculo de envíos - v1.0.1"
git push origin main
```

## Notas

- El footer de la aplicación muestra automáticamente la versión desde `src/version.ts`
- La versión se sincroniza entre `package.json` y `src/version.ts` mediante el script
- Siempre actualiza el CHANGELOG.md antes de incrementar la versión
- Usa mensajes de commit descriptivos que incluyan la versión cuando sea relevante
