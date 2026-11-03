# MedAlert · Panel hospitalario (web)

Panel web para el staff del hospital: recibe alertas de accidentes, despacha ambulancias, sigue los casos y gestiona la flota. Reemplaza la "app hospital" que la ficha planteaba en Flutter (UC-11 a UC-18).

Stack: React 19 + Vite + TypeScript + Tailwind 3 + Zustand + React Router + Leaflet.

## Correr

```bash
cd apps/admin
pnpm install
pnpm dev        # http://localhost:5173
pnpm build      # typecheck + build
pnpm lint
```

**Modo demo:** todo funciona con datos de prueba (`src/data/mockData.ts`, basados en `mock_hospital.dart` de la ficha). Cualquier email con @ y cualquier contraseña entran como *Dra. Carla Méndez · Clínica Foianini*. Los cambios viven en memoria: al recargar la página se reinician los datos (la sesión sí se mantiene).

## Casos de uso

| UC | Ruta | Qué hace |
|---|---|---|
| UC-11 | `/login` | Login del staff, sin registro. Tras entrar muestra logo + nombre del hospital en el sidebar |
| UC-12 | `/` | Alertas entrantes: foto, prioridad grande (P1 rojo, P2 ámbar, P3 verde), ubicación, distancia, hora, ETA sugerida, botón VER. Llega una alerta simulada cada 15 s (se puede pausar en el sidebar) |
| UC-13 | `/alerts/:id` | Detalle: foto, prioridad y descripción IA, mapa con hospital + incidente + ruta sugerida, distancia, ETA. RECHAZAR / ACEPTAR Y DESPACHAR |
| UC-14 | `/alerts/:id/dispatch` | Elegir ambulancia: tipo, placa, estado, chofer. La sugerida por IA aparece primero con "Recomendado"; las en servicio / mantenimiento están deshabilitadas |
| UC-15 | `/alerts/:id/dispatched` | Transición de 2 s y confirmación: unidad, chofer, ETA, "Ver seguimiento" y "Volver al dashboard" |
| UC-16 | `/active` | Casos en atención con mini mapa, estado, tiempo desde el despacho y "Actualizar estado" (En ruta → En el lugar → Completado). Al completar, la unidad vuelve a quedar disponible |
| UC-17 | `/history` | Casos completados/cancelados con filtros (fecha, prioridad, estado, ambulancia), duración total y unidad que atendió |
| UC-18 | `/fleet` | CRUD de ambulancias (código, placa, tipo, chofer) + toggle de mantenimiento. No se puede eliminar ni mandar a mantenimiento una unidad en servicio |

## Estructura

```
src/
  types.ts                 tipos espejo del schema SQL
  data/mockData.ts         datos de prueba
  store/authStore.ts       sesión (simulada)
  store/dataStore.ts       alertas, despacho, casos, flota (en memoria)
  hooks/                   useNow, usePendingAlerts, useActiveCases
  components/              Layout, Sidebar, IncidentMap, IncidentBits, ui.tsx
  pages/                   una página por caso de uso
  lib/                     formato, geo, distancia/ETA, ruta (OSRM)
```

## Notas para conectar el backend (pendiente, lo define Princesa)

- **Supabase:** crear `apps/admin/.env.local` con `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` (Vite solo expone variables con prefijo `VITE_`; nunca la service role key).
- **Login:** `supabase.auth.signInWithPassword` y rechazar si `profiles.rol !== 'hospital_staff'` o la cuenta está inactiva.
- **Alertas en vivo:** realtime sobre `incidents` en estado `searching` dentro del radio (`find_hospitals_in_radius`), reemplazando la simulación de 15 s.
- **Despacho:** idealmente una RPC que actualice `incidents` y `ambulances` en una sola transacción, para que dos operadores no tomen la misma alerta.
- **Columnas que el panel usa y el schema aún no tiene:** `ambulances.codigo`, `ambulances.chofer`, una referencia legible de ubicación en `incidents`, el logo del hospital y una tabla para registrar rechazos por hospital.
- **Mapas:** los mosaicos de OpenStreetMap y el servidor demo de OSRM son solo para desarrollo. En producción usar Mapbox con el token del proyecto.
