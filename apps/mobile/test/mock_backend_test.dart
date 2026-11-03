import 'package:fake_async/fake_async.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:medalert/data/backend.dart';
import 'package:medalert/data/mock_backend.dart';
import 'package:medalert/models/incident.dart';

void main() {
  late MockBackend backend;

  setUp(
    () => backend = MockBackend(
      demoraRed: Duration.zero,
      pasoSimulacion: const Duration(seconds: 1),
    ),
  );

  test('carga los reportes de prueba, del más reciente al más antiguo', () {
    expect(backend.reportes.map((r) => r.id), [
      'inc-003',
      'inc-001',
      'inc-002',
    ]);
    expect(backend.reporteActivo?.id, 'inc-003');
    expect(backend.reporteActivo?.hospital?.nombre, 'Caja Petrolera');
  });

  test('los estados de prueba existen en el backend', () {
    for (final reporte in backend.reportes) {
      expect(IncidentStatus.values, contains(reporte.estado));
    }
  });

  test('un reporte nuevo recorre el flujo y recibe hospital', () {
    fakeAsync((async) {
      late Incident reporte;
      final pasos = <PasoEnvio>[];
      backend
          .enviarReporte(
            EnvioReporte(fotoLocal: 'f.jpg', latitud: -17.7, longitud: -63.1),
            alAvanzar: pasos.add,
          )
          .then((r) => reporte = r);
      async.flushMicrotasks();
      async.elapse(Duration.zero);

      expect(pasos, PasoEnvio.values);
      expect(reporte.id, 'inc-004');
      expect(reporte.estado, IncidentStatus.searching);
      expect(backend.reporteActivo?.id, 'inc-004');

      backend.seguir(reporte.id);
      final vistos = <IncidentStatus>[];
      for (var i = 0; i < 3; i++) {
        async.elapse(const Duration(seconds: 1));
        vistos.add(backend.buscarReporte(reporte.id)!.estado);
      }
      expect(vistos, [
        IncidentStatus.assigned,
        IncidentStatus.onSite,
        IncidentStatus.completed,
      ]);
      expect(backend.buscarReporte(reporte.id)!.hospital, isNotNull);
      expect(async.pendingTimers, isEmpty, reason: 'la simulación termina');
    });
  });

  test('dejar de seguir detiene la simulación', () {
    fakeAsync((async) {
      backend.seguir('inc-003');
      async.elapse(const Duration(seconds: 1));
      expect(backend.buscarReporte('inc-003')!.estado, IncidentStatus.onSite);
      backend.dejarDeSeguir('inc-003');
      async.elapse(const Duration(seconds: 5));
      expect(backend.buscarReporte('inc-003')!.estado, IncidentStatus.onSite);
    });
  });

  test(
    'la sesión empieza cerrada y usa el correo con el que se entra',
    () async {
      expect(backend.sesionActiva, isFalse);
      await backend.iniciarSesion(email: 'yo@demo.bo', password: 'x');
      expect(backend.usuario?.email, 'yo@demo.bo');
      expect(backend.usuario?.iniciales, 'AC');
      await backend.cerrarSesion();
      expect(backend.sesionActiva, isFalse);
    },
  );
}
