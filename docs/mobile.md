# App móvil del testigo

Actualizado: 2026-11-04

La app (`apps/mobile`, Flutter) sigue el prototipo `testigo.html`: el testigo toca **Reportar emergencia**, toma o elige una foto, la revisa y toca **Enviar alerta**. Después ve en vivo cuándo un hospital acepta, cuándo llega la ambulancia y cuándo se cierra el caso.

## Correr la app

| Modo | Comando (desde `apps/mobile`) | Para qué |
| --- | --- | --- |
| Demo | `flutter run` | Sin backend: datos simulados y un despacho que avanza solo. Lo indica en pantalla. |
| Supabase | `flutter run --dart-define-from-file=env.json` | Backend real. Copiar `env.example.json` a `env.json` con la URL y la anon key. `env.json` no se sube al repo. |
| APK para la demo | `flutter build apk --release --split-per-abi --dart-define-from-file=env.json` | Para un celular actual se instala `build/app/outputs/flutter-apk/app-arm64-v8a-release.apk`. Sin `--split-per-abi`, un solo APK para todos pesa unos 127 MB. |

En el emulador de Android, un Supabase local se alcanza en `http://10.0.2.2:54321`. El HTTP sin cifrar está habilitado solo en debug.

## Qué usa del backend

Todo pasa con la sesión del testigo, bajo RLS:

1. **Inicio de sesión:** Supabase Auth con correo y contraseña. Lee `profiles` y solo admite `rol = 'testigo'` activo.
2. **Foto:** la sube a `incident-photos/{uid}/{milisegundos}.jpg`, en JPEG de unos 1600 px como máximo.
3. **Incidente:** lo inserta en `incidents` con `reporter_id`, `ubicacion` (`SRID=4326;POINT(lon lat)`) y `foto_url` (la ruta del objeto).
4. **Funciones:**
   - `triage-ia` se llama sin esperar la respuesta, porque la IA solo sugiere y no debe demorar el aviso.
   - `dispatch` sí se espera; su lista `hospitals` da el número de hospitales avisados.
5. **Seguimiento:** Realtime sobre `incidents` filtrado por id, más `get-incident` para el hospital, la ambulancia y la foto firmada. Como respaldo pide `get-incident` cada 15 s.
6. **Historial:** `select` sobre `incidents` propios, con las fotos firmadas en lote.

Si un envío falla, el reintento retoma desde el paso que falló, sin subir otra foto ni crear otro incidente. Un `already_dispatched` en el reintento se toma como éxito.

## Pendientes del backend

1. **Error en `0003_hospital_workflows.sql`.** En `validate_ambulance_refs` sobra un `end if;`: después del último `raise exception 'inactive ambulance driver'` hay dos `end if;` seguidos y debe quedar uno solo. Con el archivo tal cual, la migración falla en una base nueva con `syntax error at or near "if"`. Corregido en una copia local, todo lo demás de 0002, 0003 y Storage se aplica sin errores.
2. **Despliegue.** La app necesita la URL del proyecto y la anon key, más las migraciones, Storage y las funciones desplegadas. Para la demo también hacen falta `GEMINI_API_KEY`, porque sin ella `triage-ia` responde 503 (la app no se frena, pero el hospital no ve la sugerencia), y al menos un hospital con ambulancia y chofer vigentes a menos de 20 km del lugar de la demo.
3. **Registro de testigos.** Hoy nadie puede crear su cuenta: no existe ninguna regla ni trigger que cree el perfil `testigo`. La app ya envía `origen`, `nombre`, `ci` y `telefono` en los metadatos del `signUp`. Propuesta, probada en local:

   ```sql
   -- El rol queda fijo en 'testigo': los metadatos solo aportan datos.
   -- Los usuarios de create-staff no traen origen = 'app_testigo' y no se tocan.
   create or replace function public.crear_perfil_testigo() returns trigger
   language plpgsql security definer set search_path = public as $$
   begin
     if new.raw_user_meta_data->>'origen' = 'app_testigo' then
       insert into public.profiles (id, rol, nombre, ci, telefono)
       values (
         new.id, 'testigo',
         left(coalesce(new.raw_user_meta_data->>'nombre', ''), 120),
         left(coalesce(new.raw_user_meta_data->>'ci', ''), 20),
         left(coalesce(new.raw_user_meta_data->>'telefono', ''), 20)
       )
       on conflict (id) do nothing;
     end if;
     return new;
   end $$;

   create trigger crear_perfil_testigo after insert on auth.users
   for each row execute function public.crear_perfil_testigo();
   ```

   Si se mantiene la confirmación por correo, el testigo confirma y después inicia sesión; la app lo explica. Sin el trigger, se pueden crear cuentas de prueba a mano: un usuario en Auth más su fila en `profiles` con `rol = 'testigo'`.

## Guion de la demo

1. El testigo abre la app: el inicio muestra "Tu ubicación está activa".
2. Toca **Reportar emergencia**, saca la foto y toca **Enviar alerta**.
3. La app muestra **Alerta enviada** y cuántos hospitales recibieron el aviso.
4. En el panel web, el hospital ve la alerta, elige ambulancia y chofer, y acepta.
5. En unos segundos la app cambia sola a **Ambulancia en camino**, con el hospital, la ambulancia y el botón para llamar.
6. El hospital marca "en el lugar" y "completado"; la app lo refleja en vivo.

Si el backend o la red fallan durante la demo, la app sin `env.json` corre el mismo flujo en modo demo.

## Pruebas

- `flutter test`: pantallas, validaciones, modo demo y GPS, sin red.
- `test/supabase_backend_test.dart`: el flujo de punta a punta contra un Supabase real. El encabezado del archivo indica los `--dart-define` que necesita. Sin ellos se salta.
