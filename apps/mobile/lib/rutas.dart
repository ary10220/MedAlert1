import 'models/incident.dart';

abstract final class Rutas {
  static const splash = '/';
  static const login = '/login';
  static const registro = '/registro';
  static const home = '/home';
  static const reportar = '/home/reportar';
  static const historial = '/home/historial';
  static const perfil = '/home/perfil';

  static String buscando(String id) => '/home/buscando/$id';
  static String seguimiento(String id) => '/home/seguimiento/$id';
  static String detalle(String id) => '/home/historial/$id';

  /// Pantalla que corresponde a un reporte según su estado.
  static String paraReporte(Incident reporte) {
    if (reporte.estado.buscando) return buscando(reporte.id);
    if (reporte.estado.activo) return seguimiento(reporte.id);
    return detalle(reporte.id);
  }
}
