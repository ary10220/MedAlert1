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

**Configuración:** copiá `.env.example` a `.env.local` y completá `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` del proyecto Supabase. Sin eso, el login muestra el aviso de configuración faltante.

**Cuentas:** no hay registro. El admin crea al operador con `create-staff`; la persona recibe un email de invitación, abre el enlace y define su contraseña en `/set-password`. "¿Olvidaste tu contraseña?" envía un enlace de recuperación a la misma ruta. En Supabase Auth, la *Site URL* y las *Redirect URLs* deben incluir la URL del panel (p. ej. `http://localhost:5173` y la de Netlify).

## Casos de uso y backend

| UC | Ruta | Lee (RLS) | Escribe (Edge Function) |
|---|---|---|---|
| UC-11 | `/login`, `/set-password` | `profiles`, `hospitals` | Supabase Auth |
| UC-12 | `/` | `incident_offers` abiertas + `incidents`, fotos firmadas de `incident-photos` | — |
| UC-13 | `/alerts/:id` | `get-incident`, `incident_offers` | `update-incident-details`, `reject-offer`, `report-false-alarm` |
| UC-14 | `/alerts/:id/dispatch` | `ambulances`, `ambulance_types`, `drivers` | `accept-incident` (unidad + chofer) |
| UC-15 | `/alerts/:id/dispatched` | `get-incident` | — |
| UC-16 | `/active` | `incidents` asignados en curso | `update-incident-status`, `report-false-alarm` |
| UC-17 | `/history` | `incidents` cerrados (filtros y paginación en el servidor) | — |
| UC-18 | `/fleet` | `ambulances`, `ambulance_types`, `drivers` | `manage-ambulance`, `manage-ambulance-type`, `create-driver`, `update-driver` (+ subida a `driver-licenses`) |
| — | sidebar | `staff_shifts` | `set-duty` (en turno) |

Tiempo real: el panel se suscribe con Realtime a `incident_offers` e `incidents` (filtrados por RLS) y además refresca cada 15 s, porque cuando otro hospital toma una alerta la fila deja de ser visible y Realtime no avisa.

## Estructura

```
src/
  types.ts                 tipos espejo del schema (init + 0002 + 0003)
  lib/supabase.ts          cliente Supabase (lee .env.local)
  lib/api.ts               callFunction() para Edge Functions + mensajes de error
  lib/queries.ts           lecturas con RLS
  lib/storage.ts           URLs firmadas y subida a buckets privados
  lib/geo.ts               distancia y parser de geography (EWKB / GeoJSON)
  store/authStore.ts       sesión Supabase Auth + perfil + hospital
  store/refreshStore.ts    tick global (Realtime / refresco) y estado en vivo
  hooks/                   useQuery, useAction, datos del hospital, fotos firmadas
  components/              Layout (Realtime), Sidebar, mapa, modales, fleet/*
  pages/                   una página por caso de uso
```

## Notas

- Los mapas usan mosaicos de OpenStreetMap y el servidor demo de OSRM: solo para desarrollo. En producción, Mapbox con el token del proyecto.
- El ETA es una estimación local (distancia × 1.4 a 40 km/h); el backend no calcula ETA.
- El rol `admin` no puede entrar a este panel todavía (las rutas `/admin/*` están pendientes).
