import 'dart:async';

import '../models/incident.dart';
import '../models/usuario.dart';
import 'backend.dart';
import 'mock_data.dart';

/// Backend en memoria para el modo demo: simula el despacho con timers.
class MockBackend extends Backend {
  MockBackend({
    this.demoraRed = const Duration(milliseconds: 600),
    this.pasoSimulacion = const Duration(seconds: 4),
  }) {
    _reportes = _iniciales();
  }

  final Duration demoraRed;
  final Duration pasoSimulacion;

  late List<Incident> _reportes;
  Usuario? _usuario;
  var _siguienteId = 4;
  final _simulaciones = <String, Timer>{};

  @override
  bool get modoDemo => true;

  @override
  Usuario? get usuario => _usuario;

  @override
  List<Incident> get reportes => List.unmodifiable(_reportes);

  static List<Incident> _iniciales() => mockReportes.map((map) {
    final nombre = map['hospital_asignado'];
    return Incident(
      id: map['id']!,
      fecha: DateTime.parse(map['fecha']!),
      estado: IncidentStatus.fromCode(map['estado']!),
      ubicacion: map['ubicacion'],
      fotoUrl: map['foto_url'],
      hospital: nombre == null ? null : _hospital(nombre),
      ambulancia: nombre == null
          ? null
          : const Ambulancia(codigo: 'UTI-01', placa: '1234-SCZ'),
    );
  }).toList()..sort((a, b) => b.fecha.compareTo(a.fecha));

  static Hospital _hospital(String nombre) => Hospital(
    nombre: nombre,
    direccion: mockHospitales[nombre]?['direccion'],
    telefono: mockHospitales[nombre]?['telefono'],
  );

  /// Vuelve al estado inicial; lo usan los tests.
  void reiniciar() {
    for (final timer in _simulaciones.values) {
      timer.cancel();
    }
    _simulaciones.clear();
    _usuario = null;
    _siguienteId = 4;
    _reportes = _iniciales();
    notifyListeners();
  }

  @override
  Future<void> restaurarSesion() async {}

  @override
  Future<void> iniciarSesion({
    required String email,
    required String password,
  }) async {
    await Future<void>.delayed(demoraRed);
    _usuario = Usuario.fromMap({...mockUsuario, 'email': email});
    notifyListeners();
  }

  @override
  Future<void> registrar({
    required Usuario usuario,
    required String password,
  }) async {
    await Future<void>.delayed(demoraRed);
    _usuario = usuario;
    notifyListeners();
  }

  @override
  Future<void> cerrarSesion() async {
    _usuario = null;
    notifyListeners();
  }

  @override
  Future<void> cargarReportes() async {}

  @override
  Future<Incident> enviarReporte(
    EnvioReporte envio, {
    void Function(PasoEnvio paso)? alAvanzar,
  }) async {
    for (final paso in PasoEnvio.values) {
      alAvanzar?.call(paso);
      await Future<void>.delayed(demoraRed);
    }
    final reporte = Incident(
      id: 'inc-${_siguienteId.toString().padLeft(3, '0')}',
      fecha: DateTime.now(),
      estado: IncidentStatus.searching,
      latitud: envio.latitud,
      longitud: envio.longitud,
      fotoLocal: envio.fotoLocal,
      hospitalesAvisados: mockHospitales.length,
    );
    _siguienteId++;
    envio.incidentId = reporte.id;
    _reportes.insert(0, reporte);
    notifyListeners();
    return reporte;
  }

  @override
  void seguir(String id) {
    _simulaciones[id] ??= Timer.periodic(pasoSimulacion, (timer) {
      if (!_avanzar(id)) {
        timer.cancel();
        _simulaciones.remove(id);
      }
    });
  }

  @override
  void dejarDeSeguir(String id) => _simulaciones.remove(id)?.cancel();

  @override
  Future<Incident?> cargarDetalle(String id) async => buscarReporte(id);

  /// Pasa el reporte al siguiente estado del flujo; false si ya terminó.
  bool _avanzar(String id) {
    final indice = _reportes.indexWhere((reporte) => reporte.id == id);
    if (indice == -1) return false;
    final actual = _reportes[indice];
    if (!actual.estado.activo) return false;

    final flujo = IncidentStatus.flujo;
    final siguiente = flujo[flujo.indexOf(actual.estado) + 1];
    _reportes[indice] = siguiente == IncidentStatus.assigned
        ? actual.copyWith(
            estado: siguiente,
            hospital: actual.hospital ?? _hospital('Clínica Foianini'),
            ambulancia:
                actual.ambulancia ??
                const Ambulancia(codigo: 'UTI-01', placa: '1234-SCZ'),
          )
        : actual.copyWith(estado: siguiente);
    notifyListeners();
    return siguiente.activo;
  }

  @override
  void dispose() {
    for (final timer in _simulaciones.values) {
      timer.cancel();
    }
    super.dispose();
  }
}
