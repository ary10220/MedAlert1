import 'dart:async';

import 'package:medalert/data/location_service.dart';
import 'package:medalert/data/photo_service.dart';

const gpsOk = LocationResult.ok(-17.78333, -63.18211);

/// Devuelve los resultados en orden; el último se repite.
class FakeUbicacion extends LocationService {
  FakeUbicacion(this.resultados);

  final List<FutureOr<LocationResult>> resultados;
  var llamadas = 0;
  var abrioAjustes = false;

  @override
  Future<LocationResult> obtener() async {
    llamadas++;
    return resultados.length > 1
        ? await resultados.removeAt(0)
        : await resultados.first;
  }

  @override
  Future<void> abrirAjustes(LocationFailure fallo) async => abrioAjustes = true;
}

/// Cada resultado es una ruta, null (cerró la cámara) o una excepción.
class FakeFotos extends PhotoService {
  FakeFotos(this.camara, {this.galeria = const ['galeria.jpg']});

  final List<Object?> camara;
  final List<Object?> galeria;
  var aperturasCamara = 0;
  var aperturasGaleria = 0;

  @override
  Future<String?> tomarFoto() async {
    aperturasCamara++;
    return _siguiente(camara);
  }

  @override
  Future<String?> elegirDeGaleria() async {
    aperturasGaleria++;
    return _siguiente(galeria);
  }

  static String? _siguiente(List<Object?> lista) {
    final resultado = lista.length > 1 ? lista.removeAt(0) : lista.first;
    if (resultado is Exception) throw resultado;
    return resultado as String?;
  }
}
