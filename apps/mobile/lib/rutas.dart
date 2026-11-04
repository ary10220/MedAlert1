import 'models/incident.dart';

abstract final class Rutas {
  static const splash = '/';
  static const login = '/login';
  static const registro = '/registro';
  static const home = '/home';
  static const reportar = '/home/reportar';
  static const historial = '/home/historial';
  static const perfil = '/home/perfil';

  static String seguimiento(String id) => '/home/seguimiento/$id';
  static String detalle(String id) => '/home/historial/$id';

  /// Un reporte en curso se sigue en vivo; uno cerrado se ve en el detalle.
  static String paraReporte(Incident reporte) =>
      reporte.estado.activo ? seguimiento(reporte.id) : detalle(reporte.id);
}
