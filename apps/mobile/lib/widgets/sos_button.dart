import 'package:flutter/material.dart';

import '../theme/app_theme.dart';
import '../theme/colors.dart';
import 'pulse_rings.dart';

class SosButton extends StatelessWidget {
  const SosButton({super.key, required this.size, required this.onPressed});

  final double size;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    final diametro = size * 0.72;
    final texto = Theme.of(context).textTheme;
    return PulseRings(
      color: AppColors.pulse,
      size: size,
      child: SizedBox.square(
        dimension: diametro,
        child: Material(
          color: AppColors.pulse,
          shape: const CircleBorder(),
          clipBehavior: Clip.antiAlias,
          elevation: 6,
          child: InkWell(
            onTap: onPressed,
            child: Padding(
              padding: EdgeInsets.all(diametro * 0.12),
              child: FittedBox(
                fit: BoxFit.scaleDown,
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      Icons.photo_camera_outlined,
                      color: Colors.white,
                      size: diametro * 0.2,
                    ),
                    const SizedBox(height: 10),
                    Text(
                      'Reportar\nemergencia',
                      textAlign: TextAlign.center,
                      style: texto.titleLarge
                          ?.conPeso(FontWeight.w800)
                          .copyWith(color: Colors.white, height: 1.15),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      'Tomar o cargar foto',
                      style: texto.labelLarge
                          ?.conPeso(FontWeight.w600)
                          .copyWith(color: Colors.white.withValues(alpha: 0.9)),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
