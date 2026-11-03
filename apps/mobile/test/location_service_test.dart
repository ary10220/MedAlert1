import 'dart:async';

import 'package:flutter_test/flutter_test.dart';
import 'package:medalert/data/location_service.dart';

import 'fakes.dart';

void main() {
  final ahora = DateTime(2026, 10, 30, 14);

  test('la última posición solo sirve si tiene hasta 2 minutos', () {
    expect(LocationService.esReciente(ahora, ahora), isTrue);
    expect(
      LocationService.esReciente(
        ahora.subtract(const Duration(minutes: 2)),
        ahora,
      ),
      isTrue,
    );
    expect(
      LocationService.esReciente(
        ahora.subtract(const Duration(minutes: 2, seconds: 1)),
        ahora,
      ),
      isFalse,
    );
    expect(
      LocationService.esReciente(
        ahora.subtract(const Duration(hours: 3)),
        ahora,
      ),
      isFalse,
    );
  });

  test('el texto de la ubicación usa 5 decimales', () {
    expect(
      const LocationResult.ok(-17.783334, -63.18).texto,
      '-17.78333, -63.18000',
    );
  });

  group('UbicacionActual', () {
    test('dos pedidos simultáneos comparten una sola búsqueda', () async {
      final gps = Completer<LocationResult>();
      final servicio = FakeUbicacion([gps.future]);
      final ubicacion = UbicacionActual(servicio);

      final a = ubicacion.actualizar();
      final b = ubicacion.actualizar();
      expect(ubicacion.buscando, isTrue);
      gps.complete(gpsOk);

      expect(await a, same(await b));
      expect(servicio.llamadas, 1);
      expect(ubicacion.buscando, isFalse);
    });

    test('recuerda la última posición válida', () async {
      final ubicacion = UbicacionActual(FakeUbicacion([gpsOk]));
      expect(ubicacion.reciente, isNull);
      await ubicacion.actualizar();
      expect(ubicacion.reciente, same(gpsOk));
    });

    test('un fallo no cuenta como posición reciente', () async {
      final ubicacion = UbicacionActual(
        FakeUbicacion([const LocationResult.fallo(LocationFailure.sinSenal)]),
      );
      await ubicacion.actualizar();
      expect(ubicacion.ultima?.ok, isFalse);
      expect(ubicacion.reciente, isNull);
    });
  });
}
