import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'config.dart';
import 'data/backend.dart';
import 'data/supabase_backend.dart';
import 'rutas.dart';
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

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  if (AppConfig.conBackend) {
    await Supabase.initialize(
      url: AppConfig.supabaseUrl,
      // Sirve tanto la anon key (JWT) como la publishable key nueva.
      publishableKey: AppConfig.supabaseAnonKey,
    );
    backend = SupabaseBackend(Supabase.instance.client);
  }
  runApp(const MedAlertApp());
}

GoRouter crearRouter({String inicial = Rutas.splash}) => GoRouter(
  initialLocation: inicial,
  refreshListenable: backend,
  redirect: (context, state) {
    final ruta = state.matchedLocation;
    final publica = ruta == Rutas.splash || _esDeAcceso(ruta);
    if (!backend.sesionActiva && !publica) return Rutas.login;
    if (backend.sesionActiva && _esDeAcceso(ruta)) return Rutas.home;
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
