/// Credenciales publicas de Supabase (seguras de incluir en el cliente: el
/// acceso real esta controlado por las politicas de RLS en la base de datos).
class SupabaseConfig {
  static const url = 'https://wiuuzsiiaagqldtxfouj.supabase.co';
  static const publishableKey = 'sb_publishable_BtphNzcv_YrDNwRul86J0g_DiCGznE1';
  static const bucket = 'market58-contenidos';

  static String publicUrl(String storagePath) {
    return '$url/storage/v1/object/public/$bucket/$storagePath';
  }
}
