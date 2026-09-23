const { query } = require('../config/db');

/**
 * Eventos del socket:
 *
 * Desde la app player (TV):
 *  - "pantalla:suscribir-pendiente" { codigo }   -> se une a la sala de espera de emparejamiento
 *  - "pantalla:conectar" { pantallaId }          -> ya emparejada, se identifica y pasa a estar "online"
 *
 * Desde el panel admin:
 *  - "admin:suscribir"                            -> se une a la sala "admin" para recibir estados/preview
 *
 * Emitidos por el servidor:
 *  - "pantalla:emparejada" (a la sala pendiente)
 *  - "contenido:actualizado" (a la sala de una pantalla especifica)
 *  - "pantalla:actualizada" / "pantalla:eliminada" (a la sala admin)
 *  - "preview:actualizado" (a la sala admin)
 */
function registerSocketHandlers(io) {
  io.on('connection', (socket) => {
    socket.data.pantallaId = null;

    socket.on('pantalla:suscribir-pendiente', ({ codigo }) => {
      if (!codigo) return;
      socket.join(`pantalla-pendiente:${codigo.toUpperCase()}`);
    });

    socket.on('pantalla:conectar', async ({ pantallaId }) => {
      if (!pantallaId) return;
      try {
        const { rows } = await query(
          `UPDATE pantallas SET estado = 'online', ultima_conexion = now(), socket_id = $1
           WHERE id = $2 RETURNING *`,
          [socket.id, pantallaId]
        );
        if (!rows[0]) return;

        socket.data.pantallaId = pantallaId;
        socket.join(`pantalla:${pantallaId}`);
        io.to('admin').emit('pantalla:actualizada', rows[0]);
      } catch (err) {
        console.error('[socket] error en pantalla:conectar', err);
      }
    });

    socket.on('admin:suscribir', () => {
      socket.join('admin');
    });

    socket.on('disconnect', async () => {
      const { pantallaId } = socket.data;
      if (!pantallaId) return;
      try {
        const { rows } = await query(
          `UPDATE pantallas SET estado = 'offline', socket_id = NULL
           WHERE id = $1 AND socket_id = $2 RETURNING *`,
          [pantallaId, socket.id]
        );
        if (rows[0]) {
          io.to('admin').emit('pantalla:actualizada', rows[0]);
        }
      } catch (err) {
        console.error('[socket] error en disconnect', err);
      }
    });
  });
}

module.exports = { registerSocketHandlers };
