import 'package:intl/intl.dart';

/// Estados de `incidents.estado` en el backend.
enum IncidentStatus {
  open('open', 'Reportado'),
  searching('searching', 'Buscando hospital'),
  assigned('assigned', 'Ambulancia asignada'),
  onSite('on_site', 'Ambulancia en el lugar'),
  completed('completed', 'Atención completada'),
  cancelled('cancelled', 'Reporte cerrado');

  const IncidentStatus(this.code, this.etiqueta);

  factory IncidentStatus.fromCode(String code) =>
      values.firstWhere((estado) => estado.code == code);

  final String code;
  final String etiqueta;

  /// El camino normal de un reporte; `cancelled` queda fuera.
  static const flujo = [open, searching, assigned, onSite, completed];

  bool get activo => this != completed && this != cancelled;

  /// Todavía ningún hospital confirmó la atención.
  bool get buscando => this == open || this == searching;
}

class Hospital {
  const Hospital({required this.nombre, this.direccion, this.telefono});

  final String nombre;
  final String? direccion;
  final String? telefono;
}

class Ambulancia {
  const Ambulancia({this.codigo, this.placa, this.tipo});

  final String? codigo;
  final String? placa;
  final String? tipo;

  String get descripcion => [?codigo, ?placa].join(' · ');
}

class Incident {
  const Incident({
    required this.id,
    required this.fecha,
    required this.estado,
    this.ubicacion,
    this.latitud,
    this.longitud,
    this.fotoUrl,
    this.fotoLocal,
    this.hospital,
    this.ambulancia,
    this.hospitalesAvisados,
  });

  final String id;
  final DateTime fecha;
  final IncidentStatus estado;

  /// Dirección escrita, solo en los datos simulados: el backend guarda el punto.
  final String? ubicacion;
  final double? latitud;
  final double? longitud;

  /// URL de red: la de los datos simulados o una firmada de Storage.
  final String? fotoUrl;

  /// La foto recién tomada, mientras siga en el teléfono.
  final String? fotoLocal;
  final Hospital? hospital;
  final Ambulancia? ambulancia;

  /// Hospitales a los que `dispatch` ofreció el caso.
  final int? hospitalesAvisados;

  String get titulo => ubicacion ?? 'Reporte de emergencia';

  String? get coordenadas => latitud == null || longitud == null
      ? null
      : '${latitud!.toStringAsFixed(5)}, ${longitud!.toStringAsFixed(5)}';

  String get fechaTexto => DateFormat('dd/MM/yyyy HH:mm').format(fecha);

  /// Los 8 primeros caracteres del UUID, para leerlo por teléfono.
  String get codigo => id.length > 8 ? id.substring(0, 8) : id;

  Incident copyWith({
    IncidentStatus? estado,
    double? latitud,
    double? longitud,
    String? fotoUrl,
    Hospital? hospital,
    Ambulancia? ambulancia,
    int? hospitalesAvisados,
  }) => Incident(
    id: id,
    fecha: fecha,
    estado: estado ?? this.estado,
    ubicacion: ubicacion,
    latitud: latitud ?? this.latitud,
    longitud: longitud ?? this.longitud,
    fotoUrl: fotoUrl ?? this.fotoUrl,
    fotoLocal: fotoLocal,
    hospital: hospital ?? this.hospital,
    ambulancia: ambulancia ?? this.ambulancia,
    hospitalesAvisados: hospitalesAvisados ?? this.hospitalesAvisados,
  );
}
