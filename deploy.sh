#!/bin/bash
# Script para deploy en Vercel (requiere autenticación previa)

echo "🚀 Desplegando Splitme Meseros en Vercel..."
echo ""

# Verificar si hay token de Vercel
if [ -z "$VERCEL_TOKEN" ]; then
  echo "⚠️  No hay VERCEL_TOKEN configurado."
  echo ""
  echo "Opción 1: Usar dashboard de Vercel (más fácil):"
  echo "  1. Ve a https://vercel.com/new"
  echo "  2. Importa el repo: krikodium-personal/splitme-waiter"
  echo "  3. Añade variables de entorno y haz deploy"
  echo ""
  echo "Opción 2: Usar CLI con token:"
  echo "  1. Ve a https://vercel.com/account/tokens"
  echo "  2. Crea un token y ejecuta:"
  echo "     export VERCEL_TOKEN=tu-token"
  echo "     ./deploy.sh"
  exit 1
fi

# Deploy con npx vercel
npx --yes vercel --prod --yes --token="$VERCEL_TOKEN"
