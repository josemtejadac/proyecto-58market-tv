import 'package:supabase_flutter/supabase_flutter.dart';
import '../models/contenido_item.dart';

/// Calcula que debe mostrar una pantalla EN ESTE MOMENTO, evaluando sus
/// programaciones directamente contra Supabase (sin backend intermedio).
/// Misma logica que el motor original: entre las programaciones vigentes
/// ahora, gana la de mayor prioridad (y en empate, la mas reciente).
class ScheduleService {
  final SupabaseClient _client = Supabase.instance.client;

  String _pad(int n) => n.toString().padLeft(2, '0');

  Future<ContenidoActual> obtenerContenidoActual(String pantallaId) async {
    final now = DateTime.now();
    final hoyISO = '${now.year}-${_pad(now.month)}-${_pad(now.day)}';
    final horaActual = '${_pad(now.hour)}:${_pad(now.minute)}:${_pad(now.second)}';
    // DateTime.weekday: 1=lunes..7=domingo. Lo convertimos a 0=domingo..6=sabado.
    final diaSemana = now.weekday % 7;

    final programaciones = await _client
        .from('market58_programaciones')
        .select('*')
        .eq('pantalla_id', pantallaId)
        .eq('activo', true)
        .order('prioridad', ascending: false)
        .order('creado_en', ascending: false);

    Map<String, dynamic>? vigente;
    for (final p in programaciones) {
      final fechaInicio = p['fecha_inicio'] as String?;
      final fechaFin = p['fecha_fin'] as String?;
      final horaInicio = p['hora_inicio'] as String?;
      final horaFin = p['hora_fin'] as String?;
      final diasSemana = (p['dias_semana'] as List).cast<int>();

      if (fechaInicio != null && fechaInicio.compareTo(hoyISO) > 0) continue;
      if (fechaFin != null && fechaFin.compareTo(hoyISO) < 0) continue;
      if (horaInicio != null && horaInicio.compareTo(horaActual) > 0) continue;
      if (horaFin != null && horaFin.compareTo(horaActual) < 0) continue;
      if (!diasSemana.contains(diaSemana)) continue;

      vigente = p;
      break;
    }

    if (vigente == null) return ContenidoActual.vacio();

    List<ContenidoItem> items = [];

    if (vigente['contenido_id'] != null) {
      final data = await _client
          .from('market58_contenidos')
          .select('*')
          .eq('id', vigente['contenido_id'])
          .maybeSingle();
      if (data != null) items = [ContenidoItem.fromJson(data)];
    } else if (vigente['playlist_id'] != null) {
      final data = await _client
          .from('market58_playlist_items')
          .select('orden, contenido:market58_contenidos(*)')
          .eq('playlist_id', vigente['playlist_id'])
          .order('orden', ascending: true);
      items = (data as List)
          .where((row) => row['contenido'] != null)
          .map((row) => ContenidoItem.fromJson(row['contenido'] as Map<String, dynamic>))
          .toList();
    }

    return ContenidoActual(programacion: vigente, items: items);
  }
}
