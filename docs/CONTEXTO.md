# Contexto del proyecto MedAlert

Actualizado: 2026-11-03

## Producto

MedAlert es un sistema de despacho de alertas médicas para Santa Cruz, Bolivia. Un testigo reporta un incidente con foto. Gemini Vision sugiere prioridad P1/P2/P3, describe la escena y recomienda tipo de unidad; el operador hospitalario revisa la sugerencia y decide. El backend busca hospitales cercanos a 5, 10, 15 y 20 km, ofrece el incidente, y registra asignación, estados y auditoría. Un hospital puede reportar una falsa alarma para revisión del admin.

## Arquitectura y roles

- `apps/mobile`: Flutter, app del testigo.
- `apps/admin`: React 19 + Vite + Tailwind, panel web hospitalario y admin.
- `services/supabase`: Postgres + PostGIS + Edge Functions Deno.
- `testigo`: registro propio desde móvil.
- `hospital_staff`: creado por admin, asociado a un hospital.
- `admin`: equipo MedAlert, gestiona hospitales, personal, choferes y auditoría.
- No hay registro público en la web. Service role key solo en Edge Functions.

## Rutas web

El código actual en `main` usa `/`, `/alerts/:id`, `/active`, `/fleet` y `/history` para hospital. La estructura objetivo mantiene hospital en `/` y añade `/admin`, `/admin/dashboard`, `/admin/hospitales`, `/admin/staff`, `/admin/choferes`, `/admin/audit` y `/admin/falsas-alarmas`. `/login` es común: admin redirige a `/admin/dashboard`, hospital_staff a `/`. Staff que entra a `/admin/*` vuelve a `/`; admin que entra a `/` va a `/admin`. Las rutas admin y el login real aún no están integrados en `main`.

## Stack y convenciones

- Gemini Flash vigente vía Google AI Studio, modelo configurable en `GEMINI_MODEL`. Gemini 2.0 Flash fue retirado.
- FCM HTTP v1 para push; requiere `FIREBASE_SERVICE_ACCOUNT_JSON`. La antigua `FCM_SERVER_KEY` no sirve para HTTP v1.
- Mapbox GL para mapas; Netlify web, Supabase backend, APK móvil.
- Paleta: night `#0C1420`, pulse `#E63946`, mint `#4DAE91`, amber `#E8A33D`, canvas `#F2EDE4`.
- Fuentes: Manrope, Fraunces, JetBrains Mono.
- RLS en tablas sensibles; PR con revisión y squash merge.
- Nunca commitear archivos `.env`.

## Backend del MVP

La migración 0002_drivers_and_extras.sql agrega choferes, ofertas, inbox admin y los RPC transaccionales iniciales. La migración 0003_hospital_workflows.sql la extiende con tipos configurables de ambulancia, código de unidad, chofer asignado al caso, turnos, reportes de falsa alarma revisables, detalles confirmados del incidente, RLS activa para las tablas base y rechazo de ofertas. Las dos se revisan y ejecutan manualmente, en ese orden, después de la migración inicial. El SQL services/supabase/storage/001_private_buckets.sql crea tres buckets privados y sus políticas. No hacer supabase db push.

Funciones existentes: triage-ia, dispatch, accept-incident, update-incident-status, report-false-alarm, notify, create-staff, create-driver. Nuevas: reject-offer, review-false-alarm, get-incident, get-reporter-history, admin-overview, set-duty, manage-ambulance, manage-ambulance-type, update-driver, update-hospital-profile, update-incident-details y set-reporter-status. Contratos y orden de aplicación en docs/api-contracts.md.

La sospecha de falsa alarma llega a admin y solo una confirmación humana suma al historial del testigo. No hay bloqueo automático al tercer reporte ni multa. El admin puede suspender la cuenta manualmente con motivo. El registro/login del testigo se añadirá después; el backend ya exige un perfil testigo activo para crear incidentes.

## URLs

- Repo: https://github.com/ary10220/MedAlert1
- Admin local: http://localhost:5173
- Supabase project URL y Edge Function URLs: pendientes de despliegue por la tech lead.

## Pendientes fuera del MVP

- App de choferes.
- Verificación SMS/SEGIP.
