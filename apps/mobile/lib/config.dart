/// Se completa con `flutter run --dart-define-from-file=env.json`.
/// Sin estos valores la app corre en modo demo, con datos simulados.
abstract final class AppConfig {
  static const supabaseUrl = String.fromEnvironment('SUPABASE_URL');
  static const supabaseAnonKey = String.fromEnvironment('SUPABASE_ANON_KEY');

  static bool get conBackend =>
      supabaseUrl.isNotEmpty && supabaseAnonKey.isNotEmpty;
}
