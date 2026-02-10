#!/usr/bin/env node

/**
 * Script para incrementar la versión del proyecto
 * Uso: node scripts/version.js [major|minor|patch]
 * Por defecto incrementa patch
 */

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

const packageJsonPath = join(rootDir, 'package.json');
const changelogPath = join(rootDir, 'CHANGELOG.md');
const versionTsPath = join(rootDir, 'src', 'version.ts');

// Leer package.json
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
const currentVersion = packageJson.version;
const [major, minor, patch] = currentVersion.split('.').map(Number);

// Determinar qué parte incrementar
const incrementType = process.argv[2] || 'patch';
let newVersion;

switch (incrementType) {
  case 'major':
    newVersion = `${major + 1}.0.0`;
    break;
  case 'minor':
    newVersion = `${major}.${minor + 1}.0`;
    break;
  case 'patch':
  default:
    newVersion = `${major}.${minor}.${patch + 1}`;
    break;
}

// Actualizar package.json
packageJson.version = newVersion;
writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');

// Actualizar src/version.ts
const versionTsContent = `// Versión de la aplicación
// Este archivo se actualiza automáticamente por el script de versión
export const APP_VERSION = '${newVersion}';
`;
writeFileSync(versionTsPath, versionTsContent);

console.log(`✅ Versión actualizada de ${currentVersion} a ${newVersion}`);

// Actualizar CHANGELOG.md
try {
  const changelog = readFileSync(changelogPath, 'utf8');
  const today = new Date().toISOString().split('T')[0];
  
  // Buscar si ya existe una entrada para esta versión
  if (changelog.includes(`## [${newVersion}]`)) {
    console.log(`⚠️  Ya existe una entrada para la versión ${newVersion} en CHANGELOG.md`);
  } else {
    // Agregar nueva entrada al inicio del changelog
    const newEntry = `## [${newVersion}] - ${today}\n\n### Agregado\n- \n\n### Cambiado\n- \n\n### Corregido\n- \n\n`;
    const updatedChangelog = changelog.replace('# Changelog\n', `# Changelog\n\n${newEntry}`);
    writeFileSync(changelogPath, updatedChangelog);
    console.log(`✅ CHANGELOG.md actualizado con versión ${newVersion}`);
    console.log(`📝 Por favor completa los cambios en CHANGELOG.md`);
  }
} catch (error) {
  console.log(`⚠️  No se pudo actualizar CHANGELOG.md: ${error.message}`);
}

console.log(`\n🚀 Listo para hacer commit y deploy!`);
