import 'package:image_picker/image_picker.dart';

/// Foto local, sin subirla a Storage.
class PhotoService {
  const PhotoService();

  /// Devuelve la ruta de la foto, o null si el testigo cerró la cámara.
  Future<String?> tomarFoto() async {
    final foto = await ImagePicker().pickImage(
      source: ImageSource.camera,
      imageQuality: 70,
      maxWidth: 1600,
    );
    return foto?.path;
  }
}
