import 'package:flutter/foundation.dart';

import '../models/incident.dart';
import '../models/usuario.dart';
import 'mock_backend.dart';

enum PasoEnvio {
  subiendoFoto('Subiendo la foto…'),
  creandoReporte('Creando el reporte…'),
  avisandoHospitales('Avisando a hospitales cercanos…');

  const PasoEnvio(this.texto);

  final String texto;
}

/// Un envío que puede reintentarse sin repetir los pasos que ya funcionaron.
class EnvioReporte {
  EnvioReporte({
    required this.fotoLocal,
    required this.latitud,
    required this.longitud,
  });

  final String fotoLocal;
  final double latitud;
  final double longitud;

  /// Ruta en el bucket, una vez subida.
  String? fotoRemota;

  /// Id del incidente, una vez creado: desde ahí ya no se puede cambiar la foto.
  String? incidentId;
}

/// Error con un mensaje listo para mostrar al testigo.
class BackendException implements Exception {
  const BackendException(this.mensaje);

  final String mensaje;

  @override
  String toString() => mensaje;
}

/// La cuenta existe pero el backend todavía no le creó el perfil de testigo.
class PerfilPendienteException extends BackendException {
  const PerfilPendienteException()
    : super(
        'Tu cuenta existe, pero todavía no tiene perfil de testigo. '
        'Pedile al equipo de MedAlert que lo habilite.',
      );
}

abstract class Backend extends ChangeNotifier {
  bool get modoDemo;

  Usuario? get usuario;
  bool get sesionActiva => usuario != null;

  /// Del más reciente al más antiguo.
  List<Incident> get reportes;

  Incident? get reporteActivo {
    for (final reporte in reportes) {
      if (reporte.estado.activo) return reporte;
    }
    return null;
  }

  Incident? buscarReporte(String id) {
    for (final reporte in reportes) {
      if (reporte.id == id) return reporte;
    }
    return null;
  }

  Future<void> restaurarSesion();

  Future<void> iniciarSesion({required String email, required String password});

  Future<void> registrar({required Usuario usuario, required String password});

  Future<void> cerrarSesion();

  Future<void> cargarReportes();

  Future<Incident> enviarReporte(
    EnvioReporte envio, {
    void Function(PasoEnvio paso)? alAvanzar,
  });

  /// Mantiene el reporte al día mientras una pantalla lo muestra.
  void seguir(String id);

  void dejarDeSeguir(String id);

  /// Trae hospital, ambulancia y foto del reporte.
  Future<Incident?> cargarDetalle(String id);
}

/// `main` lo cambia por el de Supabase cuando hay configuración.
Backend backend = MockBackend();
