abstract final class Validators {
  static final _nombre = RegExp(r"^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ' ]{3,60}$");
  static final _ci = RegExp(r'^\d{5,10}(-?[0-9A-Za-z]{1,2})?$');
  static final _telefono = RegExp(r'^[67]\d{7}$');
  static final _email = RegExp(r'^[^@\s]+@[^@\s]+\.[^@\s]{2,}$');
  static const minPassword = 8;

  static String? nombre(String? valor) {
    final texto = valor?.trim() ?? '';
    if (texto.isEmpty) return 'Escribe tu nombre';
    if (!_nombre.hasMatch(texto)) return 'Usa solo letras (mínimo 3)';
    return null;
  }

  static String? ci(String? valor) {
    final texto = valor?.trim() ?? '';
    if (texto.isEmpty) return 'Escribe tu CI';
    if (!_ci.hasMatch(texto)) return 'CI no válido';
    return null;
  }

  static String? telefono(String? valor) {
    final texto = valor?.trim() ?? '';
    if (texto.isEmpty) return 'Escribe tu teléfono';
    if (!_telefono.hasMatch(texto)) {
      return '8 dígitos, empieza con 6 o 7';
    }
    return null;
  }

  static String? email(String? valor) {
    final texto = valor?.trim() ?? '';
    if (texto.isEmpty) return 'Escribe tu correo';
    if (!_email.hasMatch(texto)) return 'Correo no válido';
    return null;
  }

  static String? password(String? valor) {
    if (valor == null || valor.isEmpty) return 'Escribe tu contraseña';
    if (valor.length < minPassword) return 'Mínimo $minPassword caracteres';
    return null;
  }

  static String? direccion(String? valor) {
    if ((valor?.trim().length ?? 0) < 5) return 'Escribe dónde es';
    return null;
  }
}
