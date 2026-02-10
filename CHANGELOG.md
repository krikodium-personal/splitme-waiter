# Changelog

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
