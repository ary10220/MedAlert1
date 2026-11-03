# Contratos Edge Functions — MedAlert MVP

Todas las rutas son `POST {SUPABASE_URL}/functions/v1/{nombre}` con `Content-Type: application/json`. Salvo `notify`, requieren `Authorization: Bearer <JWT de Supabase Auth>`. El `user_id` opcional de los contratos antiguos nunca sustituye al JWT: si se envía, debe coincidir con el usuario autenticado. Respuestas de error: `{ "error": "..." }`; 400 datos inválidos, 401 sin sesión, 403 rol incorrecto, 404 recurso ausente, 409 conflicto, 5xx dependencia o servidor.

| Función | Rol | Entrada | Salida exitosa |
| --- | --- | --- | --- |
| `triage-ia` | testigo propietario o admin | `{incident_id,photo_url}` | `{incident_id,priority,scene_description,tipo_accidente,cantidad_heridos_estimada,suggested_unit,confidence}` |
| `dispatch` | testigo propietario o admin | `{incident_id}` | `{incident_id,status:"searching",radius_km,hospitals:[{id,nombre,distancia_km}]}` |
| `accept-incident` | hospital_staff ofrecido | `{incident_id,ambulance_id,user_id?}` | `{incident_id,ambulance_id,status:"assigned"}` |
| `update-incident-status` | staff asignado o admin para cancelar | `{incident_id,nuevo_estado,user_id?}` | `{incident_id,status}` |
| `report-false-alarm` | staff asignado | `{incident_id,reason,user_id?}` | `{incident_id,status:"cancelled",admin_review:"pending"}` |
| `notify` | solo servicio interno | `{user_ids:[uuid],title,body,data?:{clave:"valor"}}` | `{skipped:boolean,results:[{user_id,sent,failed}]}` |
| `create-staff` | admin | `{hospital_id,email,nombre,ci,telefono}` | `{user_id,hospital_id,invite_sent:true}` (201) |
| `create-driver` | admin | `{hospital_id,nombre,ci,licencia_numero?,licencia_categoria?,licencia_vence?,telefono?}` | `{driver_id,hospital_id}` (201) |

## Flujo y datos

1. La app sube la foto a Storage privado `incident-photos/{reporter_id}/{archivo}`, crea el incidente con `foto_url` igual a la ruta del objeto y llama `triage-ia`. La IA es apoyo visual, no diagnóstico; un humano revisa.
2. `dispatch` pasa de `open` a `searching`, busca hospitales activos en radios 5→10→15→20 km, inserta `incident_offers` y avisa al staff. Si ninguno aparece, devuelve lista vacía. El hospital ve ofertas abiertas por RLS; se cierran al aceptar o cancelar el caso.
3. `accept-incident` usa `accept_incident_atomic`: bloquea incidente y ambulancia, confirma hospital ofrecido, unidad disponible y chofer activo/licencia vigente, asigna ambos y escribe auditoría. Una segunda aceptación devuelve 409.
4. `update-incident-status` permite `assigned → on_site → completed` al staff asignado y cancelación de un caso no terminal por staff asignado o admin. `report-false-alarm` cancela un caso asignado, escribe auditoría e inbox admin.
5. `notify` es interno y requiere la service role key en `Authorization`. Sin Firebase configurado devuelve `skipped:true` sin fallar el flujo principal. FCM es best effort.

## Migración, secretos y despliegue

Revisar y ejecutar **manualmente** `services/supabase/migrations/0002_drivers_and_extras.sql` en SQL Editor después de la migración inicial. El CLI no la aplica automáticamente porque el repositorio conserva la migración 0002 en la carpeta de revisión manual. No ejecutar `supabase db push`.

El proyecto CLI está en `services/supabase/supabase`. Hay entradas de función en `supabase/functions/{nombre}/index.ts` que importan el código fuente de `services/supabase/functions/{nombre}/index.ts`. Tras aplicar la migración y configurar secretos, la tech lead puede desplegar desde `services/supabase` con `supabase functions deploy {nombre}`. URL resultante: `https://<project-ref>.supabase.co/functions/v1/{nombre}`. Las URLs reales aún no existen.

Secretos del runtime: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (proporcionados por Supabase), `GEMINI_API_KEY`, opcional `GEMINI_MODEL` (por defecto `gemini-3.6-flash`), y `FIREBASE_SERVICE_ACCOUNT_JSON` para FCM HTTP v1. `FCM_SERVER_KEY` no autentica HTTP v1. No colocar secretos en `apps/admin` ni en Git.

## Storage privado: pasos en Dashboard

1. Storage → New bucket → `incident-photos`; desactivar público; límite 5 MB; MIME permitidos `image/jpeg`, `image/png`, `image/webp`.
2. Guardar `incidents.foto_url` como ruta de objeto `{user_id}/{uuid}.jpg` (sin prefijo de bucket). En SQL Editor, tras revisar la migración y crear el bucket, aplicar:

```sql
create policy "reportante sube foto propia" on storage.objects
for insert to authenticated with check (
  bucket_id = 'incident-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);
create policy "reportante y operadores leen foto de incidente" on storage.objects
for select to authenticated using (
  bucket_id = 'incident-photos'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or exists (
      select 1 from public.incidents i
      where i.foto_url = name
        and (
          public.current_profile_role() = 'admin'
          or i.assigned_hospital_id = public.current_hospital_id()
        )
    )
  )
);
```

3. El staff solo podrá leer la foto una vez asignado su hospital. El backend usa service role para descargarla únicamente después de validar al dueño del incidente o al admin.
4. No hacer el bucket público. Usar URLs firmadas de corta duración en los paneles.

## Fuentes técnicas

Backup manual: agregar `SUPABASE_DB_URL` (connection string PostgreSQL) a `services/supabase/.env.local` y ejecutar `bash scripts/backup.sh` desde la raíz del repo. El archivo comprimido queda en `backups/`. `SUPABASE_URL` y la service role key no bastan para `pg_dump`.

- [Modelos Gemini y retiros](https://ai.google.dev/gemini-api/docs/deprecations)
- [FCM HTTP v1](https://firebase.google.com/docs/cloud-messaging/send/v1-api)
- [Configuración Edge Functions](https://supabase.com/docs/guides/functions/function-configuration)
