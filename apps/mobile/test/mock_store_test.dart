import 'package:flutter_test/flutter_test.dart';
import 'package:medalert/data/mock_data.dart';
import 'package:medalert/data/mock_store.dart';
import 'package:medalert/models/incident.dart';

void main() {
  late MockStore store;

  setUp(() => store = MockStore());

  test('carga los reportes de la ficha, del más reciente al más antiguo', () {
    expect(store.reportes.map((r) => r.id), ['inc-003', 'inc-001', 'inc-002']);
    expect(store.reporteActivo?.id, 'inc-003');
  });

  test('cada estado usa su etiqueta de estadosFlujo', () {
    expect(
      IncidentStatus.values.map((estado) => estado.etiqueta),
      estadosFlujo,
    );
  });

  test('un reporte nuevo recorre el flujo completo y asigna hospital', () {
    final reporte = store.crearReporte(ubicacion: '-17.78, -63.18');
    expect(reporte.id, 'inc-004');
    expect(store.reporteActivo?.id, 'inc-004');
    expect(reporte.hospitalAsignado, isNull);

    final vistos = <IncidentStatus>[];
    for (var i = 0; i < 5; i++) {
      store.avanzarEstado(reporte.id);
      vistos.add(store.buscarReporte(reporte.id)!.estado);
    }

    expect(vistos, IncidentStatus.values.skip(1));
    final final_ = store.buscarReporte(reporte.id)!;
    expect(final_.hospitalAsignado, isNotNull);
    expect(final_.etaMin, isNotNull);

    store.avanzarEstado(reporte.id);
    expect(store.buscarReporte(reporte.id)!.estado, IncidentStatus.completed);
  });

  test('cancelar quita el reporte y deja de ser el activo', () {
    final reporte = store.crearReporte(ubicacion: 'Av. Banzer');
    store.cancelarReporte(reporte.id);
    expect(store.buscarReporte(reporte.id), isNull);
    expect(store.reporteActivo?.id, 'inc-003');
  });

  test('avanzar un id inexistente no falla', () {
    store.avanzarEstado('no-existe');
    expect(store.reportes, hasLength(3));
  });

  test('la sesión empieza cerrada y se abre con el usuario de la ficha', () {
    expect(store.sesionActiva, isFalse);
    store.iniciarSesion();
    expect(store.usuario?.nombre, 'Ariany Claure');
    expect(store.usuario?.iniciales, 'AC');
    store.cerrarSesion();
    expect(store.sesionActiva, isFalse);
  });
}
