// Prueba de punta a punta contra un Supabase real (por ejemplo, el local de
// `supabase start` con las migraciones de services/supabase aplicadas).
// Sin configuración se salta. Para correrla:
//
//   flutter test test/supabase_backend_test.dart \
//     --dart-define=TEST_SUPABASE_URL=http://127.0.0.1:54321 \
//     --dart-define=TEST_SUPABASE_KEY=<anon key> \
//     --dart-define=TEST_TESTIGO_EMAIL=<correo> \
//     --dart-define=TEST_TESTIGO_PASSWORD=<contraseña> \
//     --dart-define=TEST_STAFF_EMAIL=<correo de hospital_staff> \
//     --dart-define=TEST_STAFF_PASSWORD=<contraseña> \
//     --dart-define=TEST_AMBULANCIA=<uuid> --dart-define=TEST_CHOFER=<uuid>
//
// Con TEST_STAFF_* el hospital acepta el caso y se verifica que el testigo
// lo vea en vivo.

import 'dart:async';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:medalert/data/backend.dart';
import 'package:medalert/data/supabase_backend.dart';
import 'package:medalert/models/incident.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

const _url = String.fromEnvironment('TEST_SUPABASE_URL');
const _key = String.fromEnvironment('TEST_SUPABASE_KEY');
const _email = String.fromEnvironment('TEST_TESTIGO_EMAIL');
const _password = String.fromEnvironment('TEST_TESTIGO_PASSWORD');
const _staffEmail = String.fromEnvironment('TEST_STAFF_EMAIL');
const _staffPassword = String.fromEnvironment('TEST_STAFF_PASSWORD');
const _ambulancia = String.fromEnvironment('TEST_AMBULANCIA');
const _chofer = String.fromEnvironment('TEST_CHOFER');

// JPEG mínimo válido (1x1 px): el bucket solo acepta imágenes.
const _jpeg = [
  0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01, //
  0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00, 0xFF, 0xDB, 0x00, 0x43,
  0x00, 0x03, 0x02, 0x02, 0x02, 0x02, 0x02, 0x03, 0x02, 0x02, 0x02, 0x03,
  0x03, 0x03, 0x03, 0x04, 0x06, 0x04, 0x04, 0x04, 0x04, 0x04, 0x08, 0x06,
  0x06, 0x05, 0x06, 0x09, 0x08, 0x0A, 0x0A, 0x09, 0x08, 0x09, 0x09, 0x0A,
  0x0C, 0x0F, 0x0C, 0x0A, 0x0B, 0x0E, 0x0B, 0x09, 0x09, 0x0D, 0x11, 0x0D,
  0x0E, 0x0F, 0x10, 0x10, 0x11, 0x10, 0x0A, 0x0C, 0x12, 0x13, 0x12, 0x10,
  0x13, 0x0F, 0x10, 0x10, 0x10, 0xFF, 0xC9, 0x00, 0x0B, 0x08, 0x00, 0x01,
  0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xFF, 0xCC, 0x00, 0x06, 0x00, 0x10,
  0x10, 0x05, 0xFF, 0xDA, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3F, 0x00,
  0xD2, 0xCF, 0x20, 0xFF, 0xD9,
];

SupabaseClient _cliente() => SupabaseClient(
  _url,
  _key,
  authOptions: const AuthClientOptions(authFlowType: AuthFlowType.implicit),
);

Future<void> _esperar(bool Function() condicion, {int segundos = 20}) async {
  final limite = DateTime.now().add(Duration(seconds: segundos));
  while (!condicion()) {
    if (DateTime.now().isAfter(limite)) {
      throw TimeoutException('No se cumplió a tiempo');
    }
    await Future<void>.delayed(const Duration(milliseconds: 250));
  }
}

void main() {
  final configurado = _url.isNotEmpty && _key.isNotEmpty && _email.isNotEmpty;

  group(
    'SupabaseBackend',
    skip: configurado ? false : 'sin TEST_SUPABASE_*',
    () {
      late SupabaseClient cliente;
      late SupabaseBackend backend;
      late Directory carpeta;

      setUp(() async {
        cliente = _cliente();
        backend = SupabaseBackend(cliente);
        carpeta = await Directory.systemTemp.createTemp('medalert_test');
      });

      tearDown(() async {
        await backend.cerrarSesion();
        backend.dispose();
        await carpeta.delete(recursive: true);
      });

      test('credenciales incorrectas dan un mensaje claro', () async {
        await expectLater(
          backend.iniciarSesion(email: _email, password: 'otra-cosa-123'),
          throwsA(
            isA<BackendException>().having(
              (e) => e.mensaje,
              'mensaje',
              'Correo o contraseña incorrectos',
            ),
          ),
        );
        expect(backend.sesionActiva, isFalse);
      });

      test(
        'el testigo reporta y ve en vivo cuando el hospital acepta',
        () async {
          await backend.iniciarSesion(email: _email, password: _password);
          expect(backend.sesionActiva, isTrue);
          expect(backend.usuario!.email, _email);

          final foto = File('${carpeta.path}/accidente.jpg');
          await foto.writeAsBytes(_jpeg);
          final pasos = <PasoEnvio>[];
          final envio = EnvioReporte(
            fotoLocal: foto.path,
            latitud: -17.78333,
            longitud: -63.18211,
          );

          final reporte = await backend.enviarReporte(
            envio,
            alAvanzar: pasos.add,
          );

          expect(pasos, PasoEnvio.values);
          expect(reporte.estado, IncidentStatus.searching);
          expect(
            reporte.hospitalesAvisados,
            greaterThan(0),
            reason: 'el seed tiene hospitales a menos de 5 km',
          );
          expect(
            envio.fotoRemota,
            startsWith('${cliente.auth.currentUser!.id}/'),
          );

          // Reintentar un envío que ya llegó no crea otro incidente.
          final otra = await backend.enviarReporte(envio);
          expect(otra.id, reporte.id);

          await backend.cargarReportes();
          expect(backend.reportes.first.id, reporte.id);
          expect(backend.reportes.first.estado, IncidentStatus.searching);

          final detalle = await backend.cargarDetalle(reporte.id);
          expect(detalle!.latitud, closeTo(-17.78333, 1e-4));
          expect(detalle.longitud, closeTo(-63.18211, 1e-4));

          if (_staffEmail.isEmpty) return;

          backend.seguir(reporte.id);
          // Dar tiempo a que Realtime se suscriba antes del cambio.
          await Future<void>.delayed(const Duration(seconds: 2));

          final hospital = _cliente();
          await hospital.auth.signInWithPassword(
            email: _staffEmail,
            password: _staffPassword,
          );
          final aceptado = await hospital.functions.invoke(
            'accept-incident',
            body: {
              'incident_id': reporte.id,
              'ambulance_id': _ambulancia,
              'driver_id': _chofer,
            },
          );
          expect(aceptado.data['status'], 'assigned');

          await _esperar(
            () =>
                backend.buscarReporte(reporte.id)?.hospital != null &&
                backend.buscarReporte(reporte.id)?.estado ==
                    IncidentStatus.assigned,
          );
          final asignado = backend.buscarReporte(reporte.id)!;
          expect(asignado.hospital!.nombre, isNotEmpty);
          expect(asignado.ambulancia?.placa, isNotNull);

          await hospital.functions.invoke(
            'update-incident-status',
            body: {'incident_id': reporte.id, 'nuevo_estado': 'on_site'},
          );
          await _esperar(
            () =>
                backend.buscarReporte(reporte.id)?.estado ==
                IncidentStatus.onSite,
          );
          await hospital.functions.invoke(
            'update-incident-status',
            body: {'incident_id': reporte.id, 'nuevo_estado': 'completed'},
          );
          await _esperar(
            () =>
                backend.buscarReporte(reporte.id)?.estado ==
                IncidentStatus.completed,
          );
          backend.dejarDeSeguir(reporte.id);
          await hospital.auth.signOut();
          hospital.dispose();
        },
      );
    },
  );
}
