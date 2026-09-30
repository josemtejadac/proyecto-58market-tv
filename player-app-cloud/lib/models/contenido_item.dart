import '../config/supabase_config.dart';

class ContenidoItem {
  final String id;
  final String nombre;
  final String tipo; // 'imagen' | 'video'
  final String storagePath;
  final int duracionSegundos;

  ContenidoItem({
    required this.id,
    required this.nombre,
    required this.tipo,
    required this.storagePath,
    required this.duracionSegundos,
  });

  String get url => SupabaseConfig.publicUrl(storagePath);

  factory ContenidoItem.fromJson(Map<String, dynamic> json) {
    return ContenidoItem(
      id: json['id'] as String,
      nombre: json['nombre'] as String? ?? '',
      tipo: json['tipo'] as String? ?? 'imagen',
      storagePath: json['storage_path'] as String,
      duracionSegundos: (json['duracion_segundos'] as num?)?.toInt() ?? 10,
    );
  }
}

class ContenidoActual {
  final Map<String, dynamic>? programacion;
  final List<ContenidoItem> items;

  ContenidoActual({required this.programacion, required this.items});

  factory ContenidoActual.vacio() => ContenidoActual(programacion: null, items: []);
}
