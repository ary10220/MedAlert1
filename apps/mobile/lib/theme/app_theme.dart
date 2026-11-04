import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import 'colors.dart';

extension PesoDeFuente on TextStyle {
  /// GoogleFonts carga un archivo por peso: `copyWith(fontWeight:)` no lo pide
  /// y el texto se queda en peso normal.
  TextStyle conPeso(FontWeight peso) {
    final familia = fontFamily ?? '';
    if (familia.startsWith('Fraunces')) {
      return GoogleFonts.fraunces(textStyle: this, fontWeight: peso);
    }
    if (familia.startsWith('Manrope')) {
      return GoogleFonts.manrope(textStyle: this, fontWeight: peso);
    }
    return copyWith(fontWeight: peso);
  }
}

abstract final class AppTheme {
  static ThemeData light({bool fuentesDeRed = true}) => _build(
    const ColorScheme(
      brightness: Brightness.light,
      primary: AppColors.pulse,
      onPrimary: Colors.white,
      secondary: AppColors.mint,
      onSecondary: AppColors.night,
      tertiary: AppColors.amber,
      onTertiary: AppColors.night,
      error: AppColors.errorOnCanvas,
      onError: Colors.white,
      surface: AppColors.canvas,
      onSurface: AppColors.night,
      surfaceContainerLowest: Colors.white,
      surfaceContainerLow: AppColors.canvasSurface,
      surfaceContainer: AppColors.canvasSurface,
      surfaceContainerHigh: AppColors.canvasSurfaceHigh,
      surfaceContainerHighest: AppColors.canvasSurfaceHigh,
      onSurfaceVariant: Color(0xFF4A4740),
      outline: AppColors.canvasOutline,
      outlineVariant: AppColors.canvasSurfaceHigh,
    ),
    fuentesDeRed,
  );

  static ThemeData dark({bool fuentesDeRed = true}) => _build(
    const ColorScheme(
      brightness: Brightness.dark,
      primary: AppColors.pulse,
      onPrimary: Colors.white,
      secondary: AppColors.mint,
      onSecondary: AppColors.night,
      tertiary: AppColors.amber,
      onTertiary: AppColors.night,
      error: AppColors.errorOnNight,
      onError: AppColors.night,
      surface: AppColors.night,
      onSurface: AppColors.canvas,
      surfaceContainerLowest: Color(0xFF080E17),
      surfaceContainerLow: AppColors.nightSurface,
      surfaceContainer: AppColors.nightSurface,
      surfaceContainerHigh: AppColors.nightSurfaceHigh,
      surfaceContainerHighest: AppColors.nightSurfaceHigh,
      onSurfaceVariant: Color(0xFFB9C2CE),
      outline: AppColors.nightOutline,
      outlineVariant: AppColors.nightSurfaceHigh,
    ),
    fuentesDeRed,
  );

  static ThemeData _build(ColorScheme scheme, bool fuentesDeRed) {
    final base = ThemeData(useMaterial3: true, colorScheme: scheme);
    final textTheme = fuentesDeRed
        ? _conFuentes(base.textTheme)
        : base.textTheme;

    return base.copyWith(
      textTheme: textTheme,
      scaffoldBackgroundColor: scheme.surface,
      appBarTheme: AppBarTheme(
        backgroundColor: scheme.surface,
        foregroundColor: scheme.onSurface,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        titleTextStyle: textTheme.titleLarge?.copyWith(color: scheme.onSurface),
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          minimumSize: const Size.fromHeight(56),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(14),
          ),
          textStyle: textTheme.titleMedium?.conPeso(FontWeight.w800),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          minimumSize: const Size.fromHeight(56),
          foregroundColor: scheme.onSurface,
          side: BorderSide(color: scheme.outline),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(14),
          ),
          textStyle: textTheme.titleMedium?.conPeso(FontWeight.w700),
        ),
      ),
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          foregroundColor: scheme.onSurface,
          minimumSize: const Size(48, 48),
          textStyle: textTheme.titleSmall?.conPeso(FontWeight.w700),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: scheme.surfaceContainer,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: BorderSide(color: scheme.outline),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: BorderSide(color: scheme.outline),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: BorderSide(color: scheme.onSurface, width: 2),
        ),
      ),
      cardTheme: CardThemeData(
        color: scheme.surfaceContainer,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        margin: EdgeInsets.zero,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      ),
      snackBarTheme: const SnackBarThemeData(
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  // Estilo por estilo: GoogleFonts.manropeTextTheme usa el TextTheme de
  // material_ui, que no es el mismo tipo que el de flutter/material.dart.
  static TextTheme _conFuentes(TextTheme base) {
    TextStyle fraunces(TextStyle? estilo) =>
        GoogleFonts.fraunces(textStyle: estilo);
    TextStyle manrope(TextStyle? estilo) =>
        GoogleFonts.manrope(textStyle: estilo);

    return base.copyWith(
      displayLarge: fraunces(base.displayLarge),
      displayMedium: fraunces(base.displayMedium),
      displaySmall: fraunces(base.displaySmall),
      headlineLarge: fraunces(base.headlineLarge),
      headlineMedium: fraunces(base.headlineMedium),
      headlineSmall: fraunces(base.headlineSmall),
      titleLarge: manrope(base.titleLarge),
      titleMedium: manrope(base.titleMedium),
      titleSmall: manrope(base.titleSmall),
      bodyLarge: manrope(base.bodyLarge),
      bodyMedium: manrope(base.bodyMedium),
      bodySmall: manrope(base.bodySmall),
      labelLarge: manrope(base.labelLarge),
      labelMedium: manrope(base.labelMedium),
      labelSmall: manrope(base.labelSmall),
    );
  }
}
