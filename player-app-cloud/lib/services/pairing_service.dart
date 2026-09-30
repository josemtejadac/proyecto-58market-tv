import 'dart:math';
import 'package:supabase_flutter/supabase_flutter.dart';

const _alfabeto = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sin 0,O,1,I

String _generarCodigo([int length = 4]) {
  final rnd = Random();
  return List.generate(length, (_) => _alfabeto[rnd.nextInt(_alfabeto.length)]).join();
}

/// Maneja el emparejamiento de la pantalla directo contra Supabase:
/// crea la fila pendiente, escucha cuando el admin la confirma desde el
/// panel, y expone el estado de la pantalla emparejada.
class PairingService {
  final SupabaseClient _client = Supabase.instance.client;

  /// Crea una pantalla pendiente de emparejamiento y devuelve su id + codigo.
  Future<(String id, String codigo)> iniciarEmparejamiento() async {
    final codigo = _generarCodigo();
    final data = await _client
        .from('market58_pantallas')
        .insert({
          'nombre': 'Pantalla sin nombre',
          'codigo_emparejamiento': codigo,
          'emparejada': false,
        })
        .select()
        .single();
    return (data['id'] as String, data['codigo_emparejamiento'] as String);
  }

  Future<Map<String, dynamic>?> obtenerPantalla(String id) async {
    return _client.from('market58_pantallas').select('*').eq('id', id).maybeSingle();
  }

  Future<void> actualizarEstado(String id, {required String estado}) async {
    await _client.from('market58_pantallas').update({
      'estado': estado,
      'ultima_conexion': DateTime.now().toUtc().toIso8601String(),
    }).eq('id', id);
  }

  /// Escucha cambios en la fila de esta pantalla (ej. cuando se empareja).
  RealtimeChannel suscribirPantalla(String id, void Function(Map<String, dynamic> nueva) onChange) {
    final channel = _client
        .channel('pantalla-$id')
        .onPostgresChanges(
          event: PostgresChangeEvent.update,
          schema: 'public',
          table: 'market58_pantallas',
          filter: PostgresChangeFilter(type: PostgresChangeFilterType.eq, column: 'id', value: id),
          callback: (payload) => onChange(payload.newRecord),
        )
        .subscribe();
    return channel;
  }

  /// Escucha cambios en las programaciones de esta pantalla (para refrescar
  /// contenido en tiempo real).
  RealtimeChannel suscribirProgramaciones(String pantallaId, void Function() onChange) {
    final channel = _client
        .channel('programaciones-$pantallaId')
        .onPostgresChanges(
          event: PostgresChangeEvent.all,
          schema: 'public',
          table: 'market58_programaciones',
          filter: PostgresChangeFilter(type: PostgresChangeFilterType.eq, column: 'pantalla_id', value: pantallaId),
          callback: (_) => onChange(),
        )
        .subscribe();
    return channel;
  }

  Future<void> cerrarCanal(RealtimeChannel channel) async {
    await _client.removeChannel(channel);
  }
}
