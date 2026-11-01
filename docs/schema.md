# Schema Medalert

## profiles
Extiende `auth.users` de Supabase. Almacena el rol del usuario (`testigo`, `hospital_staff`, `admin`), sus datos personales (nombre, CI, teléfono) y la referencia al hospital al que pertenece (para staff). Es la tabla central de identidad y autorización del sistema.

## hospitals
Registra los hospitales suscritos a la plataforma. Guarda nombre, dirección, coordenada PostGIS (`ubicacion`) y el nivel de suscripción (`basic` / `premium`). La columna `ubicacion` tiene un índice GiST que permite búsquedas eficientes por radio con `st_dwithin`.

## ambulances
Flota de cada hospital. Cada ambulancia pertenece a un hospital (`hospital_id`), tiene placa única, tipo (`basica`, `avanzada`, `uti`) y estado operativo (`disponible`, `en_servicio`, `mantenimiento`). El panel admin usa esta tabla para mostrar disponibilidad en tiempo real.

## incidents
Núcleo del despacho. Se crea cuando un testigo reporta un accidente: guarda ubicación GPS, foto, prioridad asignada por Claude (`ia_output`, `ia_suggested_type`) y el ciclo de vida completo del caso (`open` → `searching` → `assigned` → `on_site` → `completed`). Las FK a `hospitals` y `ambulances` registran qué recurso fue despachado y quién lo autorizó.

## audit_log
Registro inmutable de acciones importantes (despachos, cambios de estado, asignaciones). No tiene RLS — solo los admins pueden leerlo. Sirve para trazabilidad legal y debugging de incidentes críticos.
