import 'package:flutter/material.dart';

abstract final class AppColors {
  /// Emergencia, botones primarios.
  static const pulse = Color(0xFFE63946);

  /// Éxito, estado "asignado".
  static const mint = Color(0xFF4DAE91);

  /// Warning, estado "buscando".
  static const amber = Color(0xFFE8A33D);

  /// Fondo dark principal.
  static const night = Color(0xFF0C1420);

  /// Fondo light.
  static const canvas = Color(0xFFF2EDE4);

  // Derivados de la paleta: superficies y texto de error con contraste legible.
  static const nightSurface = Color(0xFF172231);
  static const nightSurfaceHigh = Color(0xFF223044);
  static const nightOutline = Color(0xFF8C98A8);
  static const canvasSurface = Color(0xFFFBF8F2);
  static const canvasSurfaceHigh = Color(0xFFE6DFD3);
  static const canvasOutline = Color(0xFF6F6A60);
  static const errorOnNight = Color(0xFFFF9AA0);
  static const errorOnCanvas = Color(0xFFB3202C);
}
