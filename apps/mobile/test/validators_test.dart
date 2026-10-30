import 'package:flutter_test/flutter_test.dart';
import 'package:medalert/data/mock_data.dart';
import 'package:medalert/data/validators.dart';

void main() {
  test('el usuario de la ficha pasa todas las validaciones', () {
    expect(Validators.nombre(mockUsuario['nombre']), isNull);
    expect(Validators.ci(mockUsuario['ci']), isNull);
    expect(Validators.telefono(mockUsuario['telefono']), isNull);
    expect(Validators.email(mockUsuario['email']), isNull);
  });

  test('teléfono: 8 dígitos que empiezan con 6 o 7', () {
    expect(Validators.telefono('75684006'), isNull);
    expect(Validators.telefono('60000000'), isNull);
    expect(Validators.telefono(''), isNotNull);
    expect(Validators.telefono('7568400'), isNotNull);
    expect(Validators.telefono('756840061'), isNotNull);
    expect(Validators.telefono('35684006'), isNotNull);
  });

  test('CI: admite complemento', () {
    expect(Validators.ci('1234567'), isNull);
    expect(Validators.ci('1234567-1E'), isNull);
    expect(Validators.ci('1234'), isNotNull);
    expect(Validators.ci('abcdefg'), isNotNull);
  });

  test('nombre: acepta acentos y rechaza números', () {
    expect(Validators.nombre('José Ñuflo'), isNull);
    expect(Validators.nombre('Al'), isNotNull);
    expect(Validators.nombre('Juan 23'), isNotNull);
  });

  test('correo y contraseña', () {
    expect(Validators.email('a@b.bo'), isNull);
    expect(Validators.email('a@b'), isNotNull);
    expect(Validators.email('a b@c.bo'), isNotNull);
    expect(Validators.password('12345678'), isNull);
    expect(Validators.password('1234567'), isNotNull);
  });

  test('dirección escrita a mano', () {
    expect(Validators.direccion('Av. Banzer km 3'), isNull);
    expect(Validators.direccion('  ab '), isNotNull);
  });
}
