import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import 'data/mock_store.dart';
import 'rutas.dart';
import 'screens/buscando_screen.dart';
import 'screens/detalle_reporte_screen.dart';
import 'screens/historial_screen.dart';
import 'screens/home_screen.dart';
import 'screens/login_screen.dart';
import 'screens/perfil_screen.dart';
import 'screens/registro_screen.dart';
import 'screens/reportar_screen.dart';
import 'screens/seguimiento_screen.dart';
import 'screens/splash_screen.dart';
import 'theme/app_theme.dart';

void main() {
  runApp(const MedAlertApp());
}

GoRouter crearRouter({String inicial = Rutas.splash}) => GoRouter(
  initialLocation: inicial,
  refreshListenable: mockStore,
  redirect: (context, state) {
    final ruta = state.matchedLocation;
    final publica = ruta == Rutas.splash || _esDeAcceso(ruta);
    if (!mockStore.sesionActiva && !publica) return Rutas.login;
    if (mockStore.sesionActiva && _esDeAcceso(ruta)) return Rutas.home;
    return null;
  },
  routes: [
    GoRoute(
      path: Rutas.splash,
      builder: (context, state) => const SplashScreen(),
    ),
    GoRoute(
      path: Rutas.login,
      builder: (context, state) => const LoginScreen(),
    ),
    GoRoute(
      path: Rutas.registro,
      builder: (context, state) => const RegistroScreen(),
    ),
    GoRoute(
      path: Rutas.home,
      builder: (context, state) => const HomeScreen(),
      routes: [
        GoRoute(
          path: 'reportar',
          builder: (context, state) => const ReportarScreen(),
        ),
        GoRoute(
          path: 'buscando/:id',
          builder: (context, state) =>
              BuscandoScreen(reporteId: state.pathParameters['id']!),
        ),
        GoRoute(
          path: 'seguimiento/:id',
          builder: (context, state) =>
              SeguimientoScreen(reporteId: state.pathParameters['id']!),
        ),
        GoRoute(
          path: 'historial',
          builder: (context, state) => const HistorialScreen(),
          routes: [
            GoRoute(
              path: ':id',
              builder: (context, state) =>
                  DetalleReporteScreen(reporteId: state.pathParameters['id']!),
            ),
          ],
        ),
        GoRoute(
          path: 'perfil',
          builder: (context, state) => const PerfilScreen(),
        ),
      ],
    ),
  ],
);

bool _esDeAcceso(String ruta) => ruta == Rutas.login || ruta == Rutas.registro;

class MedAlertApp extends StatefulWidget {
  const MedAlertApp({super.key, this.fuentesDeRed = true});

  /// Los tests la apagan porque no pueden descargar Google Fonts.
  final bool fuentesDeRed;

  @override
  State<MedAlertApp> createState() => _MedAlertAppState();
}

class _MedAlertAppState extends State<MedAlertApp> {
  final _router = crearRouter();

  @override
  void dispose() {
    _router.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp.router(
      title: 'MedAlert',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light(fuentesDeRed: widget.fuentesDeRed),
      darkTheme: AppTheme.dark(fuentesDeRed: widget.fuentesDeRed),
      routerConfig: _router,
    );
  }
}
