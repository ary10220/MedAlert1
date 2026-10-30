import 'dart:async';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../data/mock_store.dart';
import '../rutas.dart';
import '../theme/app_theme.dart';
import '../theme/colors.dart';

class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> {
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _timer = Timer(const Duration(milliseconds: 1400), () {
      if (!mounted) return;
      context.go(mockStore.sesionActiva ? Rutas.home : Rutas.login);
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.night,
      body: Center(
        child: TweenAnimationBuilder<double>(
          tween: Tween(begin: 0.8, end: 1),
          duration: const Duration(milliseconds: 700),
          curve: Curves.easeOutBack,
          builder: (context, escala, child) =>
              Transform.scale(scale: escala, child: child),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.emergency, color: AppColors.pulse, size: 72),
              const SizedBox(height: 16),
              Text(
                'MedAlert',
                style: Theme.of(context).textTheme.displaySmall
                    ?.conPeso(FontWeight.w600)
                    .copyWith(color: AppColors.canvas),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
