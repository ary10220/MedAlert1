# Contratos del backend MedAlert

Todas las Edge Functions reciben POST {SUPABASE_URL}/functions/v1/{nombre}, JSON y Authorization: Bearer {JWT de Supabase Auth}. notify es interna y usa la service role key. Errores: {"error":"..."} y código HTTP 400, 401, 403, 404, 409 o 5xx. El backend verifica rol y hospital desde el JWT.

## Testigo

| Función | Entrada | Salida principal |
| --- | --- | --- |
| triage-ia | incident_id, photo_url | prioridad, descripción, tipo, heridos estimados, unidad sugerida, confianza |
| dispatch | incident_id | status=searching, radio, hospitales ofrecidos |
| get-incident | incident_id | detalle propio, hospital y mapa, foto firmada |

El testigo crea el incidente con Supabase Auth y RLS y sube la foto al bucket privado incident-photos bajo {reporter_id}/{archivo}. foto_url guarda la ruta del objeto. La interfaz de registro/login del testigo se implementará después. La IA sugiere; el operador confirma.

## Hospital

| Función | Entrada | Salida principal |
| --- | --- | --- |
| get-incident | incident_id | caso, foto firmada 5 minutos, mapa, reportante (nombre, teléfono, email), triaje |
| reject-offer | incident_id, reason opcional | status=rejected, new_hospitals |
| report-false-alarm | incident_id, reason | report_id, review=pending, incident_status, new_hospitals |
| update-incident-details | incident_id, cantidad_heridos_confirmada, referencia | updated=true; null limpia un campo |
| accept-incident | incident_id, ambulance_id, driver_id | status=assigned y IDs asignados |
| update-incident-status | incident_id, nuevo_estado | nuevo status |
| create-driver | hospital_id opcional, nombre, ci, licencia_numero, licencia_categoria, licencia_vence, licencia_documento_url, telefono | driver_id, hospital_id |
| update-driver | driver_id, nombre, ci, licencia_numero, licencia_categoria, licencia_vence, licencia_documento_url, telefono, activo | updated=true |
| manage-ambulance-type | hospital_id opcional, action=create/rename/activate/deactivate, type_id, nombre, base_tipo | type_id, hospital_id, action |
| manage-ambulance | hospital_id opcional, action=create/update/activate/deactivate/maintenance_on/maintenance_off, ambulance_id, codigo, placa, type_id, driver_id | ambulance_id, action |
| set-duty | staff_id opcional, on_duty | staff_id, on_duty |
| update-hospital-profile | hospital_id opcional, nombre, direccion, telefono_despacho, logo_url, horario_atencion | updated_fields |

Para hospital_staff, hospital_id se infiere del perfil; admin debe enviarlo al gestionar recursos. manage-ambulance exige codigo, placa y type_id al crear o actualizar. El tipo configurable conserva una categoría base basica, avanzada o uti. licencia_documento_url usa la ruta {hospital_id}/{archivo} en driver-licenses. logo_url usa la ruta {hospital_id}/{archivo} en hospital-logos.

Rechazar una oferta cierra solo la oferta del hospital. Si no quedan ofertas abiertas, se buscan otros hospitales hasta 20 km sin repetir los ya contactados. Marcar falsa alarma crea un reporte pendiente para admin. Desde una oferta abierta también rechaza esa oferta; desde un caso asignado cancela el despacho y libera la ambulancia. La marca no cuenta como fraude hasta que admin la confirme. Descartarla no reabre automáticamente un despacho cancelado.

El despacho reserva incidente, ambulancia y chofer en una transacción. La licencia debe estar vigente y el chofer activo y libre. incidents.assigned_driver_id conserva el chofer del caso aunque cambie luego el titular de la unidad. Estados: assigned → on_site → completed, además de cancelación autorizada.

## Admin

| Función | Entrada | Salida principal |
| --- | --- | --- |
| admin-overview | objeto vacío | hospitales y disponibilidad, reportes pendientes, alertas sin oferta |
| get-incident | incident_id | detalle con CI del reportante |
| get-reporter-history | reporter_id | perfil, últimos 100 incidentes, sus reportes, conteo total confirmado |
| review-false-alarm | report_id, decision=confirmed/dismissed, note | status revisado |
| set-reporter-status | reporter_id, activo, reason | estado de la cuenta |
| create-staff | hospital_id, email, nombre, ci, telefono | user_id, hospital_id, invite_sent |

Admin abre la solicitud pendiente con get-incident y el historial con get-reporter-history. Solo las falsas alarmas confirmadas suman al conteo. No hay suspensión automática al tercer caso ni multa; set-reporter-status exige una decisión manual documentada. Las tablas de hospitales, flota, tipos, conductores, turnos, incidentes e historial se leen con Supabase Auth + RLS. Paginar listados extensos.

## Migraciones, Storage y despliegue

Orden manual en SQL Editor: services/supabase/supabase/migrations/20261101000438_init_schema.sql, luego services/supabase/migrations/0002_drivers_and_extras.sql, después services/supabase/migrations/0003_hospital_workflows.sql y finalmente services/supabase/storage/001_private_buckets.sql. Verificar qué pasos ya se aplicaron antes de ejecutar. 0003 extiende 0002. No ejecutar supabase db push ni desplegar funciones antes de la revisión de la tech lead.

El proyecto CLI está en services/supabase/supabase. Sus entradas supabase/functions/{nombre}/index.ts importan el código de services/supabase/functions/{nombre}/index.ts. Tras aplicar SQL y secretos, desplegar las funciones nuevas y modificadas. Hasta entonces las URLs reales no existen. Secretos: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, GEMINI_API_KEY, GEMINI_MODEL opcional y FIREBASE_SERVICE_ACCOUNT_JSON para FCM HTTP v1. No poner secretos en Git.

Los buckets incident-photos, hospital-logos y driver-licenses son privados. El SQL de Storage define tamaño, MIME y permisos por rol/hospital. Las fotos se entregan con URL firmada de corta duración. Realtime publica incidentes, ofertas y reportes de falsa alarma bajo RLS. Si falla el push, la transacción sigue guardada; los paneles deben leer Realtime o refrescar.

Backup manual: SUPABASE_DB_URL en services/supabase/.env.local y bash scripts/backup.sh desde la raíz. pg_dump crea el archivo en backups/. La URL REST y la service role key no sustituyen la connection string PostgreSQL.

Para copia opcional en Drive, configurar BACKUP_RCLONE_DEST con un remoto rclone y BACKUP_AGE_RECIPIENT con la clave pública age. El script cifra el archivo antes de subirlo. Se requieren age y rclone; la clave privada de descifrado se guarda fuera del repositorio. El archivo local en backups/ sigue siendo texto descifrable y debe protegerse.
