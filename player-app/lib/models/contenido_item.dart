class ContenidoItem {
  final String id;
  final String nombre;
  final String tipo; // 'imagen' | 'video'
  final String urlArchivo;
  final int duracionSegundos;

  ContenidoItem({
    required this.id,
    required this.nombre,
    required this.tipo,
    required this.urlArchivo,
    required this.duracionSegundos,
  });

  factory ContenidoItem.fromJson(Map<String, dynamic> json) {
    return ContenidoItem(
      id: json['id'] as String,
      nombre: json['nombre'] as String? ?? '',
      tipo: json['tipo'] as String? ?? 'imagen',
      urlArchivo: json['url_archivo'] as String,
      duracionSegundos: (json['duracion_segundos'] as num?)?.toInt() ?? 10,
    );
  }
}

class ContenidoActual {
  final Map<String, dynamic>? programacion;
  final List<ContenidoItem> items;

  ContenidoActual({required this.programacion, required this.items});

  factory ContenidoActual.fromJson(Map<String, dynamic> json) {
    final itemsJson = (json['items'] as List?) ?? [];
    return ContenidoActual(
      programacion: json['programacion'] as Map<String, dynamic>?,
      items: itemsJson
          .map((e) => ContenidoItem.fromJson(e as Map<String, dynamic>))
          .toList(),
    );
  }

  factory ContenidoActual.vacio() => ContenidoActual(programacion: null, items: []);
}
