abstract final class Validators {
  static final _nombre = RegExp(r"^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ' ]{3,60}$");
  static final _ci = RegExp(r'^\d{5,10}(-?[0-9A-Za-z]{1,2})?$');
  static final _telefono = RegExp(r'^[67]\d{7}$');
  static final _email = RegExp(r'^[^@\s]+@[^@\s]+\.[^@\s]{2,}$');
  static const minPassword = 8;

  static String? nombre(String? valor) {
    final texto = valor?.trim() ?? '';
    if (texto.isEmpty) return 'Escribí tu nombre';
    if (!_nombre.hasMatch(texto)) return 'Usá solo letras (mínimo 3)';
    return null;
  }

  static String? ci(String? valor) {
    final texto = valor?.trim() ?? '';
    if (texto.isEmpty) return 'Escribí tu CI';
    if (!_ci.hasMatch(texto)) return 'CI no válido';
    return null;
  }

  static String? telefono(String? valor) {
    final texto = valor?.trim() ?? '';
    if (texto.isEmpty) return 'Escribí tu teléfono';
    if (!_telefono.hasMatch(texto)) {
      return '8 dígitos, empieza con 6 o 7';
    }
    return null;
  }

  static String? email(String? valor) {
    final texto = valor?.trim() ?? '';
    if (texto.isEmpty) return 'Escribí tu correo';
    if (!_email.hasMatch(texto)) return 'Correo no válido';
    return null;
  }

  /// Para crear la cuenta.
  static String? password(String? valor) {
    if (valor == null || valor.isEmpty) return 'Escribí una contraseña';
    if (valor.length < minPassword) return 'Mínimo $minPassword caracteres';
    return null;
  }

  /// Para entrar: la cuenta pudo crearse con otra regla, así que no se exige largo.
  static String? passwordIngreso(String? valor) =>
      valor == null || valor.isEmpty ? 'Escribí tu contraseña' : null;
}
