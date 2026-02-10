# Changelog

## [1.0.9] - 2026-02-10

### Agregado
- 

### Cambiado
- 

### Corregido
- 


## [1.0.8] - 2026-02-10

### Agregado
- 

### Cambiado
- 

### Corregido
- 


## [1.0.7] - 2026-02-10

### Agregado
- 

### Cambiado
- 

### Corregido
- 


## [1.0.6] - 2026-02-10

### Agregado
- 

### Cambiado
- 

### Corregido
- 


## [1.0.5] - 2026-02-10

### Agregado
- 

### Cambiado
- 

### Corregido
- 


## [1.0.4] - 2026-02-10

### Agregado
- 

### Cambiado
- 

### Corregido
- 


## [1.0.3] - 2026-02-10

### Agregado
- 

### Cambiado
- 

### Corregido
- 


## [1.0.2] - 2026-02-10

### Agregado
- 

### Cambiado
- 

### Corregido
- 


## [1.0.1] - 2026-02-09

### Agregado
- Sistema de diagnóstico completo para push notifications
- Componente PushDiagnostics con verificación de 9 aspectos críticos
- Panel modal para diagnosticar problemas de push notifications
- Botones para registrar suscripción push y probar notificaciones locales
- Documentación PUSH-DIAGNOSTICS.md con guía de solución de problemas


Todas las modificaciones notables de este proyecto serán documentadas en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es-1.0.0/),
y este proyecto adhiere a [Semantic Versioning](https://semver.org/lang/es/).

## [1.0.0] - 2026-02-09

### Agregado
- Sistema de notificaciones push para nuevos batches
- Panel de notificaciones con lista de eventos recibidos
- Animación de titilar en botones de mesa cuando reciben nuevos batches
- Badge de notificaciones en el icono de campana con contador
- Footer con número de versión en la aplicación
- Ordenamiento de batches con los más recientes primero
- Cálculo correcto del número de envío basado en orden cronológico

### Cambiado
- Menú de mesas asignadas ahora es sticky y siempre visible
- Rediseño del header de BatchCard para mejor visualización en mobile
- Estilo mejorado del header "Total acumulado" con gradiente

### Corregido
- Error de cálculo de número de envío (ahora muestra el número correcto)
- Problemas de sintaxis en OrdersPage.tsx
