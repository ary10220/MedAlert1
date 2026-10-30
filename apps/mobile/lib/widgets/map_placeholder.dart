import 'package:flutter/material.dart';

import '../theme/colors.dart';

/// Reemplaza al mapa de Mapbox hasta tener el token.
class MapPlaceholder extends StatelessWidget {
  const MapPlaceholder({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    return ClipRRect(
      borderRadius: BorderRadius.circular(16),
      child: ColoredBox(
        color: scheme.surfaceContainer,
        child: Stack(
          children: [
            Positioned.fill(
              child: CustomPaint(
                painter: _CallesPainter(calle: scheme.surfaceContainerHigh),
              ),
            ),
            const Align(
              alignment: Alignment(0.62, -0.42),
              child: Icon(Icons.location_on, color: AppColors.pulse, size: 34),
            ),
            const Align(
              alignment: Alignment(-0.7, 0.55),
              child: Icon(
                Icons.airport_shuttle,
                color: AppColors.mint,
                size: 30,
              ),
            ),
            Positioned(
              left: 10,
              bottom: 10,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: scheme.surface,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  'Mapa de prueba',
                  style: theme.textTheme.labelSmall,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _CallesPainter extends CustomPainter {
  const _CallesPainter({required this.calle});

  final Color calle;

  @override
  void paint(Canvas canvas, Size size) {
    final trazo = Paint()
      ..color = calle
      ..strokeWidth = 8;
    for (var x = size.width * 0.14; x < size.width; x += size.width * 0.24) {
      canvas.drawLine(Offset(x, 0), Offset(x, size.height), trazo);
    }
    for (var y = size.height * 0.2; y < size.height; y += size.height * 0.3) {
      canvas.drawLine(Offset(0, y), Offset(size.width, y), trazo);
    }

    final desde = Offset(size.width * 0.15, size.height * 0.775);
    final hasta = Offset(size.width * 0.81, size.height * 0.33);
    final ruta = Path()
      ..moveTo(desde.dx, desde.dy)
      ..lineTo(size.width * 0.5, desde.dy)
      ..lineTo(size.width * 0.5, hasta.dy)
      ..lineTo(hasta.dx, hasta.dy);
    canvas.drawPath(
      ruta,
      Paint()
        ..color = AppColors.mint
        ..style = PaintingStyle.stroke
        ..strokeJoin = StrokeJoin.round
        ..strokeWidth = 4,
    );
  }

  @override
  bool shouldRepaint(_CallesPainter oldDelegate) => oldDelegate.calle != calle;
}
