import 'package:intl/intl.dart';

import '../data/mock_data.dart';

/// Mismo orden que [estadosFlujo]. Solo `on_route` y `completed` aparecen en la
/// ficha; el resto de los códigos se ajusta cuando esté el schema real.
enum IncidentStatus {
  reported('reported'),
  searching('searching'),
  assigned('assigned'),
  onRoute('on_route'),
  onScene('on_scene'),
  completed('completed');

  const IncidentStatus(this.code);

  factory IncidentStatus.fromCode(String code) =>
      values.firstWhere((estado) => estado.code == code);

  final String code;

  String get etiqueta => estadosFlujo[index];

  bool get activo => this != completed;

  /// Todavía no hay ambulancia confirmada.
  bool get buscando => this == reported || this == searching;

  /// La ambulancia todavía no llegó, así que el tiempo estimado sigue vigente.
  bool get conEta => this == assigned || this == onRoute;
}

class Incident {
  const Incident({
    required this.id,
    required this.fecha,
    required this.estado,
    required this.ubicacion,
    this.hospitalAsignado,
    this.etaMin,
    this.fotoUrl,
    this.fotoLocal,
    this.prioridad,
  });

  factory Incident.fromMap(Map<String, Object> map) => Incident(
    id: map['id']! as String,
    fecha: DateTime.parse(map['fecha']! as String),
    estado: IncidentStatus.fromCode(map['estado']! as String),
    ubicacion: map['ubicacion']! as String,
    hospitalAsignado: map['hospital_asignado'] as String?,
    etaMin: map['eta_min'] as int?,
    fotoUrl: map['foto_url'] as String?,
    prioridad: map['prioridad'] as String?,
  );

  final String id;
  final DateTime fecha;
  final IncidentStatus estado;
  final String ubicacion;
  final String? hospitalAsignado;
  final int? etaMin;
  final String? fotoUrl;
  final String? fotoLocal;
  final String? prioridad;

  String get fechaTexto => DateFormat('dd/MM/yyyy HH:mm').format(fecha);

  Incident copyWith({
    IncidentStatus? estado,
    String? hospitalAsignado,
    int? etaMin,
    String? prioridad,
  }) => Incident(
    id: id,
    fecha: fecha,
    estado: estado ?? this.estado,
    ubicacion: ubicacion,
    hospitalAsignado: hospitalAsignado ?? this.hospitalAsignado,
    etaMin: etaMin ?? this.etaMin,
    fotoUrl: fotoUrl,
    fotoLocal: fotoLocal,
    prioridad: prioridad ?? this.prioridad,
  );
}
