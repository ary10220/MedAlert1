import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:medalert/data/mock_store.dart';
import 'package:medalert/main.dart';
import 'package:medalert/models/incident.dart';
import 'package:medalert/rutas.dart';
import 'package:medalert/screens/home_screen.dart';
import 'package:medalert/screens/login_screen.dart';
import 'package:medalert/theme/app_theme.dart';

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

void main() {
  setUp(mockStore.reiniciar);

  // La app completa, con la pantalla de inicio y el router reales.
  testWidgets('sin sesión, el splash lleva a login', (tester) async {
    await tester.pumpWidget(const MedAlertApp(fuentesDeRed: false));
    expect(find.text('MedAlert'), findsOneWidget);
    await tester.pump(const Duration(milliseconds: 1400));
    await _transicion(tester);
    expect(find.byType(LoginScreen), findsOneWidget);
  });

  testWidgets('con sesión, el splash lleva a home', (tester) async {
    mockStore.iniciarSesion();
    await tester.pumpWidget(const MedAlertApp(fuentesDeRed: false));
    await tester.pump(const Duration(milliseconds: 1400));
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

  testWidgets('login valida los campos y abre la sesión', (tester) async {
    await _abrir(tester, Rutas.login);

    await tester.tap(find.text('Entrar'));
    await tester.pump();
    expect(find.text('Escribe tu teléfono'), findsOneWidget);
    expect(find.text('Escribe tu contraseña'), findsOneWidget);
    expect(mockStore.sesionActiva, isFalse);

    await tester.enterText(find.byType(TextFormField).at(0), '12345678');
    await tester.enterText(find.byType(TextFormField).at(1), 'corta');
    await tester.pump();
    expect(find.text('8 dígitos, empieza con 6 o 7'), findsOneWidget);
    expect(find.text('Mínimo 8 caracteres'), findsOneWidget);

    await tester.enterText(find.byType(TextFormField).at(0), '75684006');
    await tester.enterText(find.byType(TextFormField).at(1), 'clave1234');
    await tester.tap(find.text('Entrar'));
    await _transicion(tester);

    expect(mockStore.sesionActiva, isTrue);
    expect(find.byType(HomeScreen), findsOneWidget);
    await tester.pumpWidget(const SizedBox());
  });

  testWidgets('el teléfono solo acepta 8 dígitos', (tester) async {
    await _abrir(tester, Rutas.login);
    await tester.enterText(find.byType(TextFormField).at(0), '7a56b84006123');
    expect(find.text('75684006'), findsOneWidget);
  });

  testWidgets('registro crea la cuenta y el perfil muestra sus datos', (
    tester,
  ) async {
    final router = await _abrir(tester, Rutas.login);

    await tester.tap(find.text('Crear cuenta'));
    await _transicion(tester);
    await tester.tap(find.widgetWithText(FilledButton, 'Crear cuenta'));
    await tester.pump();
    expect(find.text('Escribe tu nombre'), findsOneWidget);
    expect(mockStore.sesionActiva, isFalse);

    final campos = find.byType(TextFormField);
    await tester.enterText(campos.at(0), 'Lorgio Choque');
    await tester.enterText(campos.at(1), '7654321');
    await tester.enterText(campos.at(2), '71234567');
    await tester.enterText(campos.at(3), 'lorgio@medalert.bo');
    await tester.enterText(campos.at(4), 'clave1234');
    await tester.tap(find.widgetWithText(FilledButton, 'Crear cuenta'));
    await _transicion(tester);
    expect(find.byType(HomeScreen), findsOneWidget);

    router.push(Rutas.perfil);
    await _transicion(tester);
    expect(find.text('Lorgio Choque'), findsOneWidget);
    expect(find.text('7654321'), findsOneWidget);
    expect(find.text('LC'), findsOneWidget);
    await tester.pumpWidget(const SizedBox());
  });

  testWidgets('cerrar sesión vuelve a login', (tester) async {
    mockStore.iniciarSesion();
    await _abrir(tester, Rutas.perfil);
    expect(find.text('Ariany Claure'), findsOneWidget);

    await tester.tap(find.text('Cerrar sesión'));
    await _transicion(tester);

    expect(mockStore.sesionActiva, isFalse);
    expect(find.byType(LoginScreen), findsOneWidget);
  });

  testWidgets('home muestra el reporte activo y lleva a seguimiento', (
    tester,
  ) async {
    mockStore.iniciarSesion();
    await _abrir(tester, Rutas.home);
    expect(find.text('REPORTAR'), findsOneWidget);
    expect(find.text('En camino'), findsOneWidget);
    expect(find.text('4 min · Caja Petrolera'), findsOneWidget);

    await tester.tap(find.text('En camino'));
    await _transicion(tester);
    expect(find.text('Seguimiento'), findsOneWidget);
    expect(find.text('4 min'), findsOneWidget);
    await tester.pumpWidget(const SizedBox());
  });

  testWidgets('historial ordena por fecha y abre el detalle', (tester) async {
    mockStore.iniciarSesion();
    await _abrir(tester, Rutas.historial);

    final direcciones = [
      'Av. Alemana 3er anillo',
      'Av. Cristo Redentor 4to anillo',
      'Av. Banzer km 3',
    ];
    final posiciones = direcciones
        .map((texto) => tester.getTopLeft(find.text(texto)).dy)
        .toList();
    expect(posiciones, orderedEquals([...posiciones]..sort()));

    await tester.tap(find.text('Av. Banzer km 3'));
    await _transicion(tester);

    expect(find.text('Detalle del reporte'), findsOneWidget);
    expect(find.text('Hospital Japonés'), findsOneWidget);
    expect(find.text('Prioridad P2'), findsOneWidget);
    expect(find.text('25/10/2026 08:15'), findsOneWidget);
    await tester.pumpWidget(const SizedBox());
  });

  testWidgets('historial sin reportes lo indica', (tester) async {
    mockStore.iniciarSesion();
    for (final reporte in mockStore.reportes.toList()) {
      mockStore.cancelarReporte(reporte.id);
    }
    await _abrir(tester, Rutas.historial);
    expect(find.text('Todavía no tienes reportes'), findsOneWidget);
    await tester.pumpWidget(const SizedBox());
  });

  testWidgets('buscando avanza solo hasta seguimiento y hasta completar', (
    tester,
  ) async {
    mockStore.iniciarSesion();
    final reporte = mockStore.crearReporte(ubicacion: 'Av. Banzer km 3');
    await _abrir(tester, Rutas.buscando(reporte.id));
    expect(find.text('Reportado'), findsOneWidget);

    await tester.pump(const Duration(seconds: 3));
    await tester.pump(const Duration(milliseconds: 400));
    expect(find.text('Buscando ambulancia'), findsOneWidget);

    await tester.pump(const Duration(seconds: 3));
    await _transicion(tester);
    expect(find.text('Seguimiento'), findsOneWidget);
    expect(find.text('5 min'), findsOneWidget);
    expect(find.text('Clínica Foianini'), findsOneWidget);

    await tester.pump(const Duration(seconds: 6));
    expect(mockStore.buscarReporte(reporte.id)!.estado, IncidentStatus.onRoute);
    await tester.pump(const Duration(seconds: 6));
    await tester.pump(const Duration(milliseconds: 400));
    expect(find.text('La ambulancia llegó'), findsOneWidget);
    await tester.pump(const Duration(seconds: 6));
    await tester.pump(const Duration(milliseconds: 400));
    expect(find.text('Atención completada'), findsOneWidget);

    await tester.pump(const Duration(seconds: 30));
    await tester.tap(find.text('Volver al inicio'));
    await _transicion(tester);
    expect(find.byType(HomeScreen), findsOneWidget);
    await tester.pumpWidget(const SizedBox());
  });

  testWidgets('cancelar en buscando pide confirmación y borra el reporte', (
    tester,
  ) async {
    mockStore.iniciarSesion();
    final reporte = mockStore.crearReporte(ubicacion: 'Av. Banzer km 3');
    await _abrir(tester, Rutas.buscando(reporte.id));

    await tester.tap(find.text('Cancelar reporte'));
    await _transicion(tester);
    await tester.pump(const Duration(seconds: 7));
    expect(
      mockStore.buscarReporte(reporte.id)!.estado,
      IncidentStatus.reported,
      reason: 'la simulación se pausa con el diálogo abierto',
    );

    await tester.tap(find.text('Seguir buscando'));
    await _transicion(tester);
    await tester.pump(const Duration(seconds: 3));
    expect(
      mockStore.buscarReporte(reporte.id)!.estado,
      IncidentStatus.searching,
    );

    await tester.tap(find.text('Cancelar reporte'));
    await _transicion(tester);
    await tester.tap(find.text('Sí, cancelar'));
    await _transicion(tester);

    expect(mockStore.buscarReporte(reporte.id), isNull);
    expect(find.byType(HomeScreen), findsOneWidget);
    await tester.pumpWidget(const SizedBox());
  });

  testWidgets('un reporte inexistente no rompe las pantallas', (tester) async {
    mockStore.iniciarSesion();
    await _abrir(tester, Rutas.detalle('no-existe'));
    expect(find.text('Este reporte ya no existe'), findsOneWidget);
    await tester.pumpWidget(const SizedBox());

    await _abrir(tester, Rutas.seguimiento('no-existe'));
    expect(find.text('Este reporte ya no existe'), findsOneWidget);
    await tester.pumpWidget(const SizedBox());
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
      'buscando': '/home/buscando/inc-003',
    };

    for (final MapEntry(key: nombre, value: ruta) in rutas.entries) {
      testWidgets(nombre, (tester) async {
        tester.platformDispatcher.textScaleFactorTestValue = 1.5;
        addTearDown(tester.platformDispatcher.clearAllTestValues);

        if (nombre != 'login' && nombre != 'registro') {
          mockStore.iniciarSesion();
        }
        await _abrir(tester, ruta, tamano: const Size(320, 568));
        await _transicion(tester);

        expect(tester.takeException(), isNull);
        await tester.pumpWidget(const SizedBox());
      });
    }
  });
}
