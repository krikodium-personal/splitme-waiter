#!/bin/bash

# Script de deploy que incrementa la versión automáticamente antes de hacer push

set -e  # Salir si hay errores

echo "🚀 Iniciando deploy con incremento de versión..."

# Incrementar versión patch
echo "📦 Incrementando versión..."
npm run version:patch

# Verificar que los cambios de versión se guardaron
if [ -z "$(git status --porcelain package.json src/version.ts CHANGELOG.md)" ]; then
  echo "⚠️  No hay cambios de versión. ¿Ya está todo commiteado?"
else
  echo "✅ Versión incrementada correctamente"
fi

# Agregar todos los cambios (incluyendo los de versión)
echo "📝 Agregando cambios a git..."
git add .

# Si hay un mensaje de commit proporcionado, usarlo; si no, generar uno automático
if [ -z "$1" ]; then
  VERSION=$(node -p "require('./package.json').version")
  COMMIT_MSG="chore: bump version to $VERSION"
else
  VERSION=$(node -p "require('./package.json').version")
  COMMIT_MSG="$1 - v$VERSION"
fi

# Hacer commit
echo "💾 Haciendo commit: $COMMIT_MSG"
git commit -m "$COMMIT_MSG" || {
  echo "⚠️  No hay cambios para commitear (puede que ya estén commiteados)"
}

# Push a GitHub
echo "⬆️  Haciendo push a GitHub..."
git push origin main

echo "✅ Deploy completado! Versión actual: $(node -p "require('./package.json').version")"
