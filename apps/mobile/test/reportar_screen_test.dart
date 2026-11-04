import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:medalert/data/backend.dart';
import 'package:medalert/data/location_service.dart';
import 'package:medalert/data/mock_backend.dart';
import 'package:medalert/data/photo_service.dart';
import 'package:medalert/models/incident.dart';
import 'package:medalert/screens/reportar_screen.dart';
import 'package:medalert/theme/app_theme.dart';

import 'fakes.dart';

/// Falla el primer envío después de crear el incidente, como un `dispatch`
/// que no responde.
class _BackendQueFallaUnaVez extends MockBackend {
  _BackendQueFallaUnaVez() : super(demoraRed: Duration.zero);

  final envios = <EnvioReporte>[];

  @override
  Future<Incident> enviarReporte(
    EnvioReporte envio, {
    void Function(PasoEnvio paso)? alAvanzar,
  }) async {
    envios.add(envio);
    if (envios.length == 1) {
      envio.incidentId = 'creado-antes-del-fallo';
      throw const BackendException('Sin conexión. Revisá tu internet.');
    }
    return super.enviarReporte(envio, alAvanzar: alAvanzar);
  }
}

Future<void> _abrir(
  WidgetTester tester, {
  required PhotoService fotos,
  Size tamano = const Size(412, 915),
}) async {
  tester.view.physicalSize = tamano;
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.reset);

  final router = GoRouter(
    initialLocation: '/home/reportar',
    routes: [
      GoRoute(
        path: '/home',
        builder: (context, state) => const Text('HOME'),
        routes: [
          GoRoute(
            path: 'reportar',
            builder: (context, state) => ReportarScreen(fotos: fotos),
          ),
          GoRoute(
            path: 'seguimiento/:id',
            builder: (context, state) =>
                Text('SEGUIMIENTO ${state.pathParameters['id']}'),
          ),
        ],
      ),
    ],
  );
  addTearDown(router.dispose);
  await tester.pumpWidget(
    MaterialApp.router(
      theme: AppTheme.dark(fuentesDeRed: false),
      routerConfig: router,
    ),
  );
  await tester.pump();
  await tester.pump();
}

FilledButton _boton(WidgetTester tester) =>
    tester.widget<FilledButton>(find.byType(FilledButton));

void main() {
  setUp(() {
    backend = MockBackend(demoraRed: const Duration(milliseconds: 100));
    ubicacionActual = UbicacionActual(FakeUbicacion([gpsOk]));
  });

  testWidgets('abre la cámara y envía solo cuando el testigo confirma', (
    tester,
  ) async {
    final fotos = FakeFotos(['foto.jpg']);
    await _abrir(tester, fotos: fotos);

    expect(fotos.aperturasCamara, 1, reason: 'entra directo a la cámara');
    expect(find.text('Ubicación lista'), findsOneWidget);
    expect(find.text('-17.78333, -63.18211'), findsOneWidget);
    expect(find.text('Cambiar foto'), findsOneWidget);

    await tester.pump(const Duration(seconds: 10));
    expect(backend.reportes, hasLength(3), reason: 'no se envía solo');

    await tester.tap(find.text('Enviar alerta'));
    await tester.pump();
    expect(find.text('Subiendo la foto…'), findsOneWidget);
    await tester.pump(const Duration(milliseconds: 100));
    expect(find.text('Creando el reporte…'), findsOneWidget);
    await tester.pump(const Duration(milliseconds: 100));
    expect(find.text('Avisando a hospitales cercanos…'), findsOneWidget);
    await tester.pump(const Duration(milliseconds: 100));
    await tester.pump();

    final creado = backend.reportes.first;
    expect(creado.id, 'inc-004');
    expect(creado.fotoLocal, 'foto.jpg');
    expect(creado.coordenadas, '-17.78333, -63.18211');
    expect(find.text('SEGUIMIENTO inc-004'), findsOneWidget);
  });

  testWidgets('sin foto no se puede enviar; la galería sirve igual', (
    tester,
  ) async {
    final fotos = FakeFotos([null]);
    await _abrir(tester, fotos: fotos);

    expect(find.text('La foto aparecerá aquí'), findsOneWidget);
    expect(find.text('Tomar foto'), findsOneWidget);
    expect(_boton(tester).onPressed, isNull);

    await tester.tap(find.text('Elegir de la galería'));
    await tester.pump();
    await tester.pump();
    expect(fotos.aperturasGaleria, 1);
    expect(find.text('Cambiar foto'), findsOneWidget);
    expect(_boton(tester).onPressed, isNotNull);
  });

  testWidgets('un error de la cámara avisa y deja elegir otra vez', (
    tester,
  ) async {
    await _abrir(
      tester,
      fotos: FakeFotos([PlatformException(code: 'no_available_camera')]),
    );
    expect(find.text('No se pudo abrir la cámara'), findsOneWidget);
    expect(find.text('Tomar foto'), findsOneWidget);
  });

  testWidgets('usa al instante la ubicación que home ya obtuvo', (
    tester,
  ) async {
    final gps = Completer<LocationResult>();
    ubicacionActual = UbicacionActual(FakeUbicacion([gpsOk, gps.future]));
    await ubicacionActual.actualizar();

    await _abrir(tester, fotos: FakeFotos(['foto.jpg']));
    expect(find.text('Ubicación lista'), findsOneWidget);
    expect(_boton(tester).onPressed, isNotNull);
    gps.complete(gpsOk);
  });

  testWidgets('espera al GPS antes de habilitar el envío', (tester) async {
    final gps = Completer<LocationResult>();
    ubicacionActual = UbicacionActual(FakeUbicacion([gps.future]));
    await _abrir(tester, fotos: FakeFotos(['foto.jpg']));

    expect(find.text('Buscando tu ubicación…'), findsOneWidget);
    expect(_boton(tester).onPressed, isNull);

    gps.complete(gpsOk);
    await tester.pump();
    await tester.pump();
    expect(_boton(tester).onPressed, isNotNull);
  });

  testWidgets('sin permiso de GPS explica y ofrece ajustes', (tester) async {
    final servicio = FakeUbicacion([
      const LocationResult.fallo(LocationFailure.permisoDenegado),
    ]);
    ubicacionActual = UbicacionActual(servicio);
    await _abrir(tester, fotos: FakeFotos(['foto.jpg']));

    expect(find.textContaining('Sin permiso de ubicación'), findsOneWidget);
    expect(_boton(tester).onPressed, isNull);
    await tester.tap(find.text('Abrir ajustes'));
    await tester.pump();
    expect(servicio.abrioAjustes, isTrue);
  });

  testWidgets('sin señal sigue buscando hasta encontrarla', (tester) async {
    ubicacionActual = UbicacionActual(
      FakeUbicacion([
        const LocationResult.fallo(LocationFailure.sinSenal),
        const LocationResult.fallo(LocationFailure.sinSenal),
        gpsOk,
      ]),
    );
    await _abrir(tester, fotos: FakeFotos(['foto.jpg']));
    expect(find.textContaining('seguimos buscando'), findsOneWidget);

    await tester.pump(const Duration(seconds: 1));
    await tester.pump();
    await tester.pump(const Duration(seconds: 1));
    await tester.pump();
    expect(find.text('Ubicación lista'), findsOneWidget);
    expect(_boton(tester).onPressed, isNotNull);
  });

  testWidgets('si el envío falla, reintenta el mismo reporte', (tester) async {
    final falla = _BackendQueFallaUnaVez();
    backend = falla;
    await _abrir(tester, fotos: FakeFotos(['foto.jpg']));

    await tester.tap(find.text('Enviar alerta'));
    await tester.pump();
    await tester.pump();
    expect(find.text('Sin conexión. Revisá tu internet.'), findsOneWidget);
    expect(find.text('Reintentar envío'), findsOneWidget);
    expect(
      find.text('Cambiar foto'),
      findsNothing,
      reason: 'el incidente ya existe: la foto queda fija',
    );

    await tester.tap(find.text('Reintentar envío'));
    for (var i = 0; i < 6; i++) {
      // Sin duración, pump no avanza el reloj y la demora simulada no termina.
      await tester.pump(const Duration(milliseconds: 10));
    }

    expect(falla.envios, hasLength(2));
    expect(falla.envios[1], same(falla.envios[0]));
    expect(find.textContaining('SEGUIMIENTO'), findsOneWidget);
  });

  testWidgets('sin desbordes en un celular chico con letra grande', (
    tester,
  ) async {
    tester.platformDispatcher.textScaleFactorTestValue = 1.5;
    addTearDown(tester.platformDispatcher.clearAllTestValues);
    ubicacionActual = UbicacionActual(
      FakeUbicacion([
        const LocationResult.fallo(LocationFailure.servicioApagado),
      ]),
    );
    await _abrir(
      tester,
      fotos: FakeFotos(['foto.jpg']),
      tamano: const Size(320, 568),
    );
    expect(tester.takeException(), isNull);
  });
}
