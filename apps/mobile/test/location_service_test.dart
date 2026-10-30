import 'package:flutter_test/flutter_test.dart';
import 'package:medalert/data/location_service.dart';

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
}
