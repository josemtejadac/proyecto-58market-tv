const { query } = require('../config/db');

/**
 * Calcula que debe mostrar una pantalla EN ESTE MOMENTO, segun sus
 * programaciones activas (rango de fechas, dias de la semana y horario).
 *
 * Regla de seleccion: entre todas las programaciones vigentes ahora mismo,
 * gana la de mayor `prioridad`; en empate, la creada mas recientemente.
 *
 * @param {string} pantallaId
 * @returns {Promise<object|null>} objeto con la programacion activa y sus items, o null si no hay nada programado ahora
 */
async function getContenidoActual(pantallaId) {
  const now = new Date();
  const hoyISO = now.toISOString().slice(0, 10); // YYYY-MM-DD
  const horaActual = now.toTimeString().slice(0, 8); // HH:MM:SS
  const diaSemana = now.getDay(); // 0=domingo ... 6=sabado

  const { rows: programaciones } = await query(
    `SELECT *
     FROM programaciones
     WHERE pantalla_id = $1
       AND activo = true
       AND (fecha_inicio IS NULL OR fecha_inicio <= $2)
       AND (fecha_fin IS NULL OR fecha_fin >= $2)
       AND (hora_inicio IS NULL OR hora_inicio <= $3::time)
       AND (hora_fin IS NULL OR hora_fin >= $3::time)
       AND ($4 = ANY(dias_semana))
     ORDER BY prioridad DESC, creado_en DESC
     LIMIT 1`,
    [pantallaId, hoyISO, horaActual, diaSemana]
  );

  const programacion = programaciones[0];
  if (!programacion) {
    return null;
  }

  let items = [];

  if (programacion.contenido_id) {
    const { rows } = await query('SELECT * FROM contenidos WHERE id = $1', [programacion.contenido_id]);
    items = rows;
  } else if (programacion.playlist_id) {
    const { rows } = await query(
      `SELECT c.*, pi.orden
       FROM playlist_items pi
       JOIN contenidos c ON c.id = pi.contenido_id
       WHERE pi.playlist_id = $1
       ORDER BY pi.orden ASC`,
      [programacion.playlist_id]
    );
    items = rows;
  }

  return {
    programacion,
    items,
  };
}

module.exports = { getContenidoActual };
