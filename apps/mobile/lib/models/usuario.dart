class Usuario {
  const Usuario({
    required this.nombre,
    required this.ci,
    required this.telefono,
    required this.email,
  });

  factory Usuario.fromMap(Map<String, String> map) => Usuario(
    nombre: map['nombre']!,
    ci: map['ci']!,
    telefono: map['telefono']!,
    email: map['email']!,
  );

  final String nombre;
  final String ci;
  final String telefono;
  final String email;

  String get iniciales => nombre
      .trim()
      .split(RegExp(r'\s+'))
      .take(2)
      .map((parte) => parte[0].toUpperCase())
      .join();
}
