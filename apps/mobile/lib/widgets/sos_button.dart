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
              padding: const EdgeInsets.all(12),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(
                    Icons.emergency,
                    color: Colors.white,
                    size: diametro * 0.3,
                  ),
                  const SizedBox(height: 8),
                  FittedBox(
                    fit: BoxFit.scaleDown,
                    child: Text(
                      'REPORTAR',
                      style: Theme.of(context).textTheme.titleLarge
                          ?.conPeso(FontWeight.w800)
                          .copyWith(color: Colors.white, letterSpacing: 1),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
