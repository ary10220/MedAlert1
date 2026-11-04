import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:medalert/data/backend.dart';
import 'package:medalert/data/location_service.dart';
import 'package:medalert/data/mock_backend.dart';
import 'package:medalert/main.dart';
import 'package:medalert/models/incident.dart';
import 'package:medalert/rutas.dart';
import 'package:medalert/screens/home_screen.dart';
import 'package:medalert/screens/login_screen.dart';
import 'package:medalert/theme/app_theme.dart';

import 'fakes.dart';

const _red = Duration(milliseconds: 100);
const _paso = Duration(seconds: 2);

late MockBackend _backend;

Future<GoRouter> _abrir(
  WidgetTester tester,
  String ruta, {
  Size tamano = const Size(412, 915),
}) async {
  tester.view.physicalSize = tamano;
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.reset);

  final router = crearRouter(inicial: ruta);
  addTearDown(router.dispose);
  await tester.pumpWidget(
    MaterialApp.router(
      theme: AppTheme.dark(fuentesDeRed: false),
      routerConfig: router,
    ),
  );
  await tester.pump();
  return router;
}

Future<void> _transicion(WidgetTester tester) async {
  await tester.pump();
  await tester.pump(const Duration(milliseconds: 500));
}

Future<void> _entrar() =>
    _backend.iniciarSesion(email: 'testigo@demo.bo', password: 'x');

void main() {
  setUp(() {
    backend = _backend = MockBackend(demoraRed: _red, pasoSimulacion: _paso);
    ubicacionActual = UbicacionActual(FakeUbicacion([gpsOk]));
  });

  testWidgets('sin sesión, el splash lleva a login', (tester) async {
    await tester.pumpWidget(const MedAlertApp(fuentesDeRed: false));
    expect(find.text('MedAlert'), findsOneWidget);
    await tester.pump(const Duration(milliseconds: 1200));
    await _transicion(tester);
    expect(find.byType(LoginScreen), findsOneWidget);
  });

  testWidgets('con sesión, el splash lleva a home', (tester) async {
    await tester.runAsync(_entrar);
    await tester.pumpWidget(const MedAlertApp(fuentesDeRed: false));
    await tester.pump(const Duration(milliseconds: 1200));
    await _transicion(tester);
    expect(find.byType(HomeScreen), findsOneWidget);
    await tester.pumpWidget(const SizedBox());
  });

  testWidgets('sin sesión no se puede entrar a pantallas protegidas', (
    tester,
  ) async {
    await _abrir(tester, Rutas.historial);
    expect(find.byType(LoginScreen), findsOneWidget);
  });

  testWidgets('login valida, muestra carga y abre la sesión', (tester) async {
    await _abrir(tester, Rutas.login);
    expect(find.text('Modo demo: entrá con cualquier correo'), findsOneWidget);

    await tester.tap(find.text('Entrar'));
    await tester.pump();
    expect(find.text('Escribí tu correo'), findsOneWidget);
    expect(find.text('Escribí tu contraseña'), findsOneWidget);

    await tester.enterText(find.byType(TextFormField).at(0), 'no-es-correo');
    await tester.pump();
    expect(find.text('Correo no válido'), findsOneWidget);

    await tester.enterText(find.byType(TextFormField).at(0), 'yo@demo.bo');
    await tester.enterText(find.byType(TextFormField).at(1), 'abc');
    await tester.tap(find.text('Entrar'));
    await tester.pump();
    expect(find.byType(CircularProgressIndicator), findsOneWidget);

    await tester.pump(_red);
    await _transicion(tester);
    expect(_backend.usuario?.email, 'yo@demo.bo');
    expect(find.byType(HomeScreen), findsOneWidget);
    await tester.pumpWidget(const SizedBox());
  });

  testWidgets('registro crea la cuenta y el perfil muestra sus datos', (
    tester,
  ) async {
    final router = await _abrir(tester, Rutas.login);

    await tester.tap(find.text('Crear cuenta'));
    await _transicion(tester);
    await tester.tap(find.widgetWithText(FilledButton, 'Crear cuenta'));
    await tester.pump();
    expect(find.text('Escribí tu nombre'), findsOneWidget);

    final campos = find.byType(TextFormField);
    await tester.enterText(campos.at(0), 'Lorgio Choque');
    await tester.enterText(campos.at(1), '7654321');
    await tester.enterText(campos.at(2), '71234567');
    await tester.enterText(campos.at(3), 'lorgio@medalert.bo');
    await tester.enterText(campos.at(4), 'clave1234');
    await tester.tap(find.widgetWithText(FilledButton, 'Crear cuenta'));
    await tester.pump(_red);
    await _transicion(tester);
    expect(find.byType(HomeScreen), findsOneWidget);

    router.push(Rutas.perfil);
    await _transicion(tester);
    expect(find.text('Lorgio Choque'), findsOneWidget);
    expect(find.text('lorgio@medalert.bo'), findsOneWidget);
    expect(find.text('LC'), findsOneWidget);
    await tester.pumpWidget(const SizedBox());
  });

  testWidgets('cerrar sesión vuelve a login', (tester) async {
    await tester.runAsync(_entrar);
    await _abrir(tester, Rutas.perfil);
    expect(find.text('Ariany Claure'), findsOneWidget);

    await tester.tap(find.text('Cerrar sesión'));
    await _transicion(tester);
    expect(_backend.sesionActiva, isFalse);
    expect(find.byType(LoginScreen), findsOneWidget);
  });

  testWidgets('home sigue el prototipo y muestra el reporte en curso', (
    tester,
  ) async {
    await tester.runAsync(_entrar);
    await _abrir(tester, Rutas.home);

    expect(find.text('¿Presenciaste una emergencia?'), findsOneWidget);
    expect(find.text('Reportar\nemergencia'), findsOneWidget);
    expect(find.text('Tomar o cargar foto'), findsOneWidget);
    expect(find.text('Solo necesitás una foto'), findsOneWidget);
    expect(find.text('Modo demo: datos simulados'), findsOneWidget);
    expect(find.text('Tu ubicación está activa'), findsOneWidget);
    expect(find.text('Caja Petrolera'), findsOneWidget);

    await tester.tap(find.text('Tu reporte en curso'));
    await _transicion(tester);
    expect(find.text('Ambulancia en camino'), findsOneWidget);
    expect(find.text('Llamar al hospital (77000003)'), findsOneWidget);
    await tester.pumpWidget(const SizedBox());
  });

  testWidgets('home avisa si no hay ubicación', (tester) async {
    ubicacionActual = UbicacionActual(
      FakeUbicacion([
        const LocationResult.fallo(LocationFailure.permisoDenegado),
      ]),
    );
    await tester.runAsync(_entrar);
    await _abrir(tester, Rutas.home);
    await tester.pump();
    expect(
      find.text('Activá la ubicación para poder reportar'),
      findsOneWidget,
    );
    await tester.pumpWidget(const SizedBox());
  });

  testWidgets('historial ordena por fecha y abre el detalle', (tester) async {
    await tester.runAsync(_entrar);
    await _abrir(tester, Rutas.historial);
    await tester.pump();

    final titulos = [
      'Av. Alemana 3er anillo',
      'Av. Cristo Redentor 4to anillo',
      'Av. Banzer km 3',
    ];
    final posiciones = titulos
        .map((texto) => tester.getTopLeft(find.text(texto)).dy)
        .toList();
    expect(posiciones, orderedEquals([...posiciones]..sort()));

    await tester.tap(find.text('Av. Banzer km 3'));
    await _transicion(tester);
    expect(find.text('Detalle del reporte'), findsOneWidget);
    expect(find.text('Hospital Japonés\nAv. Japón 3er anillo'), findsOneWidget);
    expect(find.text('25/10/2026 08:15'), findsOneWidget);
    await tester.pumpWidget(const SizedBox());
  });

  testWidgets('un reporte nuevo se sigue en vivo hasta completarse', (
    tester,
  ) async {
    await tester.runAsync(_entrar);
    late Incident reporte;
    await tester.runAsync(() async {
      reporte = await _backend.enviarReporte(
        EnvioReporte(fotoLocal: 'f.jpg', latitud: -17.78, longitud: -63.18),
      );
    });
    await _abrir(tester, Rutas.seguimiento(reporte.id));

    expect(find.text('Alerta enviada'), findsOneWidget);
    expect(find.textContaining('3 hospitales cercanos'), findsOneWidget);
    expect(find.text('En revisión'), findsOneWidget);

    await tester.pump(_paso);
    await tester.pump(const Duration(milliseconds: 400));
    expect(find.text('Ambulancia en camino'), findsOneWidget);
    expect(find.text('Clínica Foianini\nAv. Irala 468'), findsOneWidget);

    await tester.pump(_paso);
    await tester.pump(const Duration(milliseconds: 400));
    expect(find.text('La ambulancia llegó'), findsOneWidget);

    await tester.pump(_paso);
    await tester.pump(const Duration(milliseconds: 400));
    expect(find.text('Atención completada'), findsWidgets);

    await tester.scrollUntilVisible(find.text('Volver al inicio'), 200);
    await tester.tap(find.text('Volver al inicio'));
    await _transicion(tester);
    expect(find.byType(HomeScreen), findsOneWidget);
    await tester.pumpWidget(const SizedBox());
  });

  testWidgets('un reporte inexistente no rompe el detalle', (tester) async {
    await tester.runAsync(_entrar);
    await _abrir(tester, Rutas.detalle('no-existe'));
    await tester.pump();
    expect(find.text('No encontramos este reporte'), findsOneWidget);
  });

  group('sin desbordes en un celular chico con letra grande', () {
    const rutas = {
      'login': Rutas.login,
      'registro': Rutas.registro,
      'home': Rutas.home,
      'historial': Rutas.historial,
      'perfil': Rutas.perfil,
      'seguimiento': '/home/seguimiento/inc-003',
      'detalle': '/home/historial/inc-001',
    };

    for (final MapEntry(key: nombre, value: ruta) in rutas.entries) {
      testWidgets(nombre, (tester) async {
        tester.platformDispatcher.textScaleFactorTestValue = 1.5;
        addTearDown(tester.platformDispatcher.clearAllTestValues);
        if (nombre != 'login' && nombre != 'registro') {
          await tester.runAsync(_entrar);
        }
        await _abrir(tester, ruta, tamano: const Size(320, 568));
        await _transicion(tester);
        expect(tester.takeException(), isNull);
        await tester.pumpWidget(const SizedBox());
      });
    }
  });
}
