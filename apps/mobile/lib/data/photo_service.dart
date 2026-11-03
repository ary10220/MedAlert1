import 'package:image_picker/image_picker.dart';

/// Foto local; la sube el backend al enviar el reporte.
class PhotoService {
  const PhotoService();

  /// Devuelve la ruta de la foto, o null si el testigo cerró la cámara.
  Future<String?> tomarFoto() => _elegir(ImageSource.camera);

  Future<String?> elegirDeGaleria() => _elegir(ImageSource.gallery);

  // Calidad 70 y 1600 px dejan la foto por debajo del límite de 5 MB del bucket.
  Future<String?> _elegir(ImageSource origen) async {
    final foto = await ImagePicker().pickImage(
      source: origen,
      imageQuality: 70,
      maxWidth: 1600,
    );
    return foto?.path;
  }
}
