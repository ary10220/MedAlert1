import 'package:flutter/foundation.dart';

import '../models/incident.dart';
import '../models/usuario.dart';
import 'mock_data.dart';

/// Estado en memoria con los datos de prueba. Al conectar Supabase, las
/// pantallas siguen llamando a estos mismos métodos.
class MockStore extends ChangeNotifier {
  MockStore() {
    reiniciar();
  }

  late List<Incident> _reportes;
  Usuario? _usuario;
  int _siguienteId = 4;

  Usuario? get usuario => _usuario;
  bool get sesionActiva => _usuario != null;

  /// Del más reciente al más antiguo.
  List<Incident> get reportes => List.unmodifiable(_reportes);

  Incident? get reporteActivo {
    for (final reporte in _reportes) {
      if (reporte.estado.activo) return reporte;
    }
    return null;
  }

  Incident? buscarReporte(String id) {
    for (final reporte in _reportes) {
      if (reporte.id == id) return reporte;
    }
    return null;
  }

  void reiniciar() {
    _usuario = null;
    _siguienteId = 4;
    _reportes = mockReportes.map(Incident.fromMap).toList()
      ..sort((a, b) => b.fecha.compareTo(a.fecha));
    notifyListeners();
  }

  void iniciarSesion() {
    _usuario = Usuario.fromMap(mockUsuario);
    notifyListeners();
  }

  void registrar(Usuario usuario) {
    _usuario = usuario;
    notifyListeners();
  }

  void cerrarSesion() {
    _usuario = null;
    notifyListeners();
  }

  Incident crearReporte({required String ubicacion, String? fotoLocal}) {
    final reporte = Incident(
      id: 'inc-${_siguienteId.toString().padLeft(3, '0')}',
      fecha: DateTime.now(),
      estado: IncidentStatus.reported,
      ubicacion: ubicacion,
      fotoLocal: fotoLocal,
    );
    _siguienteId++;
    _reportes.insert(0, reporte);
    notifyListeners();
    return reporte;
  }

  void cancelarReporte(String id) {
    _reportes.removeWhere((reporte) => reporte.id == id);
    notifyListeners();
  }

  /// Simula el avance del despacho al siguiente estado de [estadosFlujo].
  void avanzarEstado(String id) {
    final indice = _reportes.indexWhere((reporte) => reporte.id == id);
    if (indice == -1) return;
    final actual = _reportes[indice];
    if (!actual.estado.activo) return;

    final siguiente = IncidentStatus.values[actual.estado.index + 1];
    _reportes[indice] = siguiente == IncidentStatus.assigned
        ? actual.copyWith(
            estado: siguiente,
            hospitalAsignado: actual.hospitalAsignado ?? 'Clínica Foianini',
            etaMin: actual.etaMin ?? 5,
            prioridad: actual.prioridad ?? 'P1',
          )
        : actual.copyWith(estado: siguiente);
    notifyListeners();
  }
}

final mockStore = MockStore();
