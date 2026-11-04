import 'package:flutter/foundation.dart';
import 'package:geolocator/geolocator.dart';

enum LocationFailure { servicioApagado, permisoDenegado, sinSenal }

class LocationResult {
  const LocationResult.ok(this.latitud, this.longitud) : fallo = null;
  const LocationResult.fallo(LocationFailure this.fallo)
    : latitud = null,
      longitud = null;

  final double? latitud;
  final double? longitud;
  final LocationFailure? fallo;

  bool get ok => fallo == null;

  String get texto =>
      '${latitud!.toStringAsFixed(5)}, ${longitud!.toStringAsFixed(5)}';
}

/// GPS local, sin enviar nada al backend.
class LocationService {
  const LocationService();

  static const _limite = Duration(seconds: 10);
  static const _antiguedadMaxima = Duration(minutes: 2);

  Future<LocationResult> obtener() async {
    if (!await Geolocator.isLocationServiceEnabled()) {
      return const LocationResult.fallo(LocationFailure.servicioApagado);
    }

    var permiso = await Geolocator.checkPermission();
    if (permiso == LocationPermission.denied) {
      permiso = await Geolocator.requestPermission();
    }
    if (permiso == LocationPermission.denied ||
        permiso == LocationPermission.deniedForever) {
      return const LocationResult.fallo(LocationFailure.permisoDenegado);
    }

    try {
      final posicion = await Geolocator.getCurrentPosition(
        locationSettings: _ajustes,
      );
      return LocationResult.ok(posicion.latitude, posicion.longitude);
    } on Exception {
      final ultima = await Geolocator.getLastKnownPosition(
        forceAndroidLocationManager: true,
      );
      if (ultima != null && esReciente(ultima.timestamp, DateTime.now())) {
        return LocationResult.ok(ultima.latitude, ultima.longitude);
      }
      return const LocationResult.fallo(LocationFailure.sinSenal);
    }
  }

  /// Una posición vieja mandaría la ambulancia a otro lugar.
  static bool esReciente(DateTime momento, DateTime ahora) =>
      ahora.difference(momento) <= _antiguedadMaxima;

  // En Android evita el cliente de Google Play: su diálogo de "precisión de
  // ubicación" detiene el reporte hasta que el testigo lo responda.
  LocationSettings get _ajustes =>
      defaultTargetPlatform == TargetPlatform.android
      ? AndroidSettings(
          accuracy: LocationAccuracy.high,
          timeLimit: _limite,
          forceLocationManager: true,
        )
      : const LocationSettings(
          accuracy: LocationAccuracy.high,
          timeLimit: _limite,
        );

  Future<void> abrirAjustes(LocationFailure fallo) async {
    if (fallo == LocationFailure.permisoDenegado) {
      await Geolocator.openAppSettings();
    } else {
      await Geolocator.openLocationSettings();
    }
  }
}

/// La última ubicación conocida. Home la pide al abrirse, así el reporte no
/// espera la primera señal del GPS.
class UbicacionActual extends ChangeNotifier {
  UbicacionActual([this.servicio = const LocationService()]);

  final LocationService servicio;
  LocationResult? _ultima;
  DateTime? _momento;
  Future<LocationResult>? _enCurso;

  LocationResult? get ultima => _ultima;
  bool get buscando => _enCurso != null;

  /// La última posición válida, si todavía es reciente.
  LocationResult? get reciente {
    final ultima = _ultima;
    final momento = _momento;
    if (ultima == null || !ultima.ok || momento == null) return null;
    return LocationService.esReciente(momento, DateTime.now()) ? ultima : null;
  }

  Future<LocationResult> actualizar() {
    final enCurso = _enCurso;
    if (enCurso != null) return enCurso;
    final busqueda = _buscar();
    _enCurso = busqueda;
    notifyListeners();
    return busqueda;
  }

  Future<LocationResult> _buscar() async {
    try {
      final resultado = await servicio.obtener();
      _ultima = resultado;
      _momento = DateTime.now();
      return resultado;
    } finally {
      _enCurso = null;
      notifyListeners();
    }
  }

  Future<void> abrirAjustes(LocationFailure fallo) =>
      servicio.abrirAjustes(fallo);
}

UbicacionActual ubicacionActual = UbicacionActual();
