import 'package:socket_io_client/socket_io_client.dart' as socket_io;

/// Envoltorio simple sobre socket.io-client para la app player.
class SocketService {
  socket_io.Socket? _socket;

  bool get conectado => _socket?.connected ?? false;

  void conectar(String baseUrl) {
    _socket?.dispose();
    _socket = socket_io.io(
      baseUrl,
      socket_io.OptionBuilder()
          .setTransports(['websocket', 'polling'])
          .enableReconnection()
          .setReconnectionDelay(2000)
          .setReconnectionDelayMax(10000)
          .build(),
    );
    _socket!.connect();
  }

  void suscribirPendiente(String codigo) {
    _socket?.emit('pantalla:suscribir-pendiente', {'codigo': codigo});
  }

  void identificarPantalla(String pantallaId) {
    _socket?.emit('pantalla:conectar', {'pantallaId': pantallaId});
  }

  void onConnect(void Function() cb) => _socket?.onConnect((_) => cb());

  void onDisconnect(void Function() cb) => _socket?.onDisconnect((_) => cb());

  void onPantallaEmparejada(void Function(dynamic data) cb) {
    _socket?.on('pantalla:emparejada', cb);
  }

  void onContenidoActualizado(void Function(dynamic data) cb) {
    _socket?.on('contenido:actualizado', cb);
  }

  void dispose() {
    _socket?.dispose();
    _socket = null;
  }
}
