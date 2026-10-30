import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:medalert/data/location_service.dart';
import 'package:medalert/data/mock_store.dart';
import 'package:medalert/data/photo_service.dart';
import 'package:medalert/models/incident.dart';
import 'package:medalert/screens/reportar_screen.dart';
import 'package:medalert/theme/app_theme.dart';

const _gpsOk = LocationResult.ok(-17.78333, -63.18211);

class _FakeUbicacion extends LocationService {
  _FakeUbicacion(this.resultados);

  final List<FutureOr<LocationResult>> resultados;
  var abrioAjustes = false;

  @override
  Future<LocationResult> obtener() async => resultados.length > 1
      ? await resultados.removeAt(0)
      : await resultados.first;

  @override
  Future<void> abrirAjustes(LocationFailure fallo) async => abrioAjustes = true;
}

class _FakeFotos extends PhotoService {
  _FakeFotos(this.resultados);

  final List<Object?> resultados;
  var aperturas = 0;

  @override
  Future<String?> tomarFoto() async {
    aperturas++;
    final resultado = resultados.length > 1
        ? resultados.removeAt(0)
        : resultados.first;
    if (resultado is Exception) throw resultado;
    return resultado as String?;
  }
}

Future<void> _abrir(
  WidgetTester tester, {
  required LocationService ubicacion,
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
            builder: (context, state) =>
                ReportarScreen(ubicacion: ubicacion, fotos: fotos),
          ),
          GoRoute(
            path: 'buscando/:id',
            builder: (context, state) =>
                Text('BUSCANDO ${state.pathParameters['id']}'),
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

void main() {
  setUp(mockStore.reiniciar);

  testWidgets('con foto y GPS se envía solo, sin más toques', (tester) async {
    final fotos = _FakeFotos(['foto.jpg']);
    await _abrir(tester, ubicacion: _FakeUbicacion([_gpsOk]), fotos: fotos);

    expect(fotos.aperturas, 1, reason: 'abre la cámara al entrar');
    expect(find.text('ENVIAR AHORA (5)'), findsOneWidget);
    expect(find.text('-17.78333, -63.18211'), findsOneWidget);

    await tester.pump(const Duration(seconds: 1));
    expect(find.text('ENVIAR AHORA (4)'), findsOneWidget);

    await tester.pump(const Duration(seconds: 4));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 400));

    final creado = mockStore.reportes.first;
    expect(creado.id, 'inc-004');
    expect(creado.estado, IncidentStatus.reported);
    expect(creado.ubicacion, '-17.78333, -63.18211');
    expect(creado.fotoLocal, 'foto.jpg');
    expect(find.text('BUSCANDO inc-004'), findsOneWidget);
  });

  testWidgets('ENVIAR AHORA no espera la cuenta y no duplica', (tester) async {
    await _abrir(
      tester,
      ubicacion: _FakeUbicacion([_gpsOk]),
      fotos: _FakeFotos(['foto.jpg']),
    );

    await tester.tap(find.text('ENVIAR AHORA (5)'));
    await tester.pump();
    await tester.pump(const Duration(seconds: 8));

    expect(mockStore.reportes, hasLength(4));
    expect(find.text('BUSCANDO inc-004'), findsOneWidget);
  });

  testWidgets('Cancelar detiene la cuenta y no crea el reporte', (
    tester,
  ) async {
    await _abrir(
      tester,
      ubicacion: _FakeUbicacion([_gpsOk]),
      fotos: _FakeFotos(['foto.jpg']),
    );

    await tester.tap(find.text('Cancelar'));
    await tester.pump();
    await tester.pump(const Duration(seconds: 8));

    expect(mockStore.reportes, hasLength(3));
    expect(find.text('HOME'), findsOneWidget);
  });

  testWidgets('si cierra la cámara puede reintentar o seguir sin foto', (
    tester,
  ) async {
    final fotos = _FakeFotos([null, 'foto.jpg']);
    await _abrir(tester, ubicacion: _FakeUbicacion([_gpsOk]), fotos: fotos);

    expect(find.text('Falta la foto'), findsOneWidget);
    await tester.pump(const Duration(seconds: 8));
    expect(mockStore.reportes, hasLength(3), reason: 'no envía sin decidir');

    await tester.tap(find.text('Tomar foto'));
    await tester.pump();
    await tester.pump();
    expect(fotos.aperturas, 2);
    expect(find.text('ENVIAR AHORA (5)'), findsOneWidget);
    await tester.pumpWidget(const SizedBox());
  });

  testWidgets('sin foto también se puede reportar', (tester) async {
    await _abrir(
      tester,
      ubicacion: _FakeUbicacion([_gpsOk]),
      fotos: _FakeFotos([null]),
    );

    await tester.tap(find.text('Continuar sin foto'));
    await tester.pump();
    await tester.pump(const Duration(seconds: 5));
    await tester.pump();

    expect(mockStore.reportes.first.fotoLocal, isNull);
    expect(find.text('BUSCANDO inc-004'), findsOneWidget);
  });

  testWidgets('un error de la cámara no bloquea el reporte', (tester) async {
    await _abrir(
      tester,
      ubicacion: _FakeUbicacion([_gpsOk]),
      fotos: _FakeFotos([PlatformException(code: 'no_available_camera')]),
    );

    expect(find.text('No se pudo abrir la cámara'), findsOneWidget);
    expect(find.text('Continuar sin foto'), findsOneWidget);
    await tester.pumpWidget(const SizedBox());
  });

  testWidgets('espera al GPS antes de empezar la cuenta', (tester) async {
    final gps = Completer<LocationResult>();
    await _abrir(
      tester,
      ubicacion: _FakeUbicacion([gps.future]),
      fotos: _FakeFotos(['foto.jpg']),
    );

    expect(find.text('Esperando GPS…'), findsOneWidget);
    await tester.pump(const Duration(seconds: 8));
    expect(mockStore.reportes, hasLength(3));

    gps.complete(_gpsOk);
    await tester.pump();
    await tester.pump();
    expect(find.text('ENVIAR AHORA (5)'), findsOneWidget);
    await tester.pumpWidget(const SizedBox());
  });

  testWidgets('sin GPS pide la dirección y la valida', (tester) async {
    await _abrir(
      tester,
      ubicacion: _FakeUbicacion([
        const LocationResult.fallo(LocationFailure.permisoDenegado),
      ]),
      fotos: _FakeFotos(['foto.jpg']),
    );

    expect(find.text('Sin permiso de ubicación'), findsOneWidget);
    await tester.pump(const Duration(seconds: 8));
    expect(mockStore.reportes, hasLength(3), reason: 'no se envía solo');

    await tester.tap(find.text('ENVIAR'));
    await tester.pump();
    expect(find.text('Escribe dónde es'), findsOneWidget);
    expect(mockStore.reportes, hasLength(3));

    await tester.enterText(find.byType(TextFormField), 'Av. Banzer km 3');
    await tester.tap(find.text('ENVIAR'));
    await tester.pump();
    await tester.pump();

    expect(mockStore.reportes.first.ubicacion, 'Av. Banzer km 3');
    expect(find.text('BUSCANDO inc-004'), findsOneWidget);
  });

  testWidgets('sin GPS permite reintentar y abrir ajustes', (tester) async {
    final ubicacion = _FakeUbicacion([
      const LocationResult.fallo(LocationFailure.servicioApagado),
      _gpsOk,
    ]);
    await _abrir(tester, ubicacion: ubicacion, fotos: _FakeFotos(['foto.jpg']));

    expect(find.text('El GPS está apagado'), findsOneWidget);
    await tester.tap(find.text('Abrir ajustes'));
    await tester.pump();
    expect(ubicacion.abrioAjustes, isTrue);

    await tester.tap(find.text('Reintentar'));
    await tester.pump();
    await tester.pump();
    expect(find.text('ENVIAR AHORA (5)'), findsOneWidget);
    await tester.pumpWidget(const SizedBox());
  });

  testWidgets('sin señal sigue buscando y arranca la cuenta si la encuentra', (
    tester,
  ) async {
    final ubicacion = _FakeUbicacion([
      const LocationResult.fallo(LocationFailure.sinSenal),
      const LocationResult.fallo(LocationFailure.sinSenal),
      _gpsOk,
    ]);
    await _abrir(tester, ubicacion: ubicacion, fotos: _FakeFotos(['foto.jpg']));

    expect(find.text('Sin señal de GPS, seguimos buscando'), findsOneWidget);
    await tester.enterText(find.byType(TextFormField), 'Av. Ban');

    await tester.pump(const Duration(seconds: 1));
    await tester.pump();
    expect(
      tester.widget<TextFormField>(find.byType(TextFormField)).controller?.text,
      'Av. Ban',
      reason: 'reintentar no borra lo que escribe',
    );

    await tester.pump(const Duration(seconds: 1));
    await tester.pump();
    expect(find.text('-17.78333, -63.18211'), findsOneWidget);
    expect(find.text('ENVIAR AHORA (5)'), findsOneWidget);
    await tester.pumpWidget(const SizedBox());
  });

  testWidgets('al enviar con dirección deja de buscar señal', (tester) async {
    final ubicacion = _FakeUbicacion([
      const LocationResult.fallo(LocationFailure.sinSenal),
    ]);
    await _abrir(tester, ubicacion: ubicacion, fotos: _FakeFotos(['foto.jpg']));

    await tester.enterText(find.byType(TextFormField), 'Av. Banzer km 3');
    await tester.tap(find.text('ENVIAR'));
    await tester.pump();
    await tester.pump(const Duration(seconds: 5));

    expect(mockStore.reportes, hasLength(4));
    expect(mockStore.reportes.first.ubicacion, 'Av. Banzer km 3');
    expect(find.text('BUSCANDO inc-004'), findsOneWidget);
  });

  group('sin desbordes en un celular chico con letra grande', () {
    final casos = <String, (LocationResult, String?)>{
      'con foto y GPS': (_gpsOk, 'foto.jpg'),
      'sin foto': (_gpsOk, null),
      'sin GPS': (
        const LocationResult.fallo(LocationFailure.servicioApagado),
        'foto.jpg',
      ),
    };

    for (final MapEntry(key: nombre, value: (gps, foto)) in casos.entries) {
      testWidgets(nombre, (tester) async {
        tester.platformDispatcher.textScaleFactorTestValue = 1.5;
        addTearDown(tester.platformDispatcher.clearAllTestValues);

        await _abrir(
          tester,
          ubicacion: _FakeUbicacion([gps]),
          fotos: _FakeFotos([foto]),
          tamano: const Size(320, 568),
        );

        expect(tester.takeException(), isNull);
        await tester.pumpWidget(const SizedBox());
      });
    }
  });
}
