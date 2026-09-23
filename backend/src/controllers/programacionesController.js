const { query } = require('../config/db');
const { getContenidoActual } = require('../utils/scheduleEngine');

async function notificarPantalla(req, pantallaId) {
  const resultado = await getContenidoActual(pantallaId);
  const io = req.app.get('io');
  io.to(`pantalla:${pantallaId}`).emit('contenido:actualizado', resultado || { programacion: null, items: [] });
  io.to('admin').emit('preview:actualizado', { pantallaId, ...(resultado || { programacion: null, items: [] }) });
}

async function listar(req, res, next) {
  try {
    const { pantalla_id: pantallaId } = req.query;
    const { rows } = pantallaId
      ? await query('SELECT * FROM programaciones WHERE pantalla_id = $1 ORDER BY prioridad DESC, creado_en DESC', [pantallaId])
      : await query('SELECT * FROM programaciones ORDER BY creado_en DESC');
    return res.json(rows);
  } catch (err) {
    return next(err);
  }
}

async function obtener(req, res, next) {
  try {
    const { rows } = await query('SELECT * FROM programaciones WHERE id = $1', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Programacion no encontrada' });
    return res.json(rows[0]);
  } catch (err) {
    return next(err);
  }
}

async function crear(req, res, next) {
  try {
    const {
      pantalla_id: pantallaId,
      playlist_id: playlistId,
      contenido_id: contenidoId,
      nombre,
      fecha_inicio: fechaInicio,
      fecha_fin: fechaFin,
      hora_inicio: horaInicio,
      hora_fin: horaFin,
      dias_semana: diasSemana,
      prioridad,
      activo,
    } = req.body;

    if (!pantallaId) return res.status(400).json({ error: 'pantalla_id es requerido' });
    if (!playlistId && !contenidoId) {
      return res.status(400).json({ error: 'Debes indicar playlist_id o contenido_id' });
    }
    if (playlistId && contenidoId) {
      return res.status(400).json({ error: 'Indica solo playlist_id o solo contenido_id, no ambos' });
    }

    const { rows } = await query(
      `INSERT INTO programaciones
        (pantalla_id, playlist_id, contenido_id, nombre, fecha_inicio, fecha_fin, hora_inicio, hora_fin, dias_semana, prioridad, activo)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8, COALESCE($9, '{0,1,2,3,4,5,6}'), COALESCE($10, 0), COALESCE($11, true))
       RETURNING *`,
      [
        pantallaId,
        playlistId || null,
        contenidoId || null,
        nombre || null,
        fechaInicio || null,
        fechaFin || null,
        horaInicio || null,
        horaFin || null,
        diasSemana || null,
        prioridad,
        activo,
      ]
    );

    await notificarPantalla(req, pantallaId);
    return res.status(201).json(rows[0]);
  } catch (err) {
    return next(err);
  }
}

async function actualizar(req, res, next) {
  try {
    const campos = [
      'playlist_id',
      'contenido_id',
      'nombre',
      'fecha_inicio',
      'fecha_fin',
      'hora_inicio',
      'hora_fin',
      'dias_semana',
      'prioridad',
      'activo',
    ];

    const sets = [];
    const values = [];
    let idx = 1;

    campos.forEach((campo) => {
      if (req.body[campo] !== undefined) {
        sets.push(`${campo} = $${idx}`);
        values.push(req.body[campo]);
        idx += 1;
      }
    });

    if (sets.length === 0) {
      return res.status(400).json({ error: 'Nada para actualizar' });
    }

    values.push(req.params.id);
    const { rows } = await query(
      `UPDATE programaciones SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );

    if (!rows[0]) return res.status(404).json({ error: 'Programacion no encontrada' });

    await notificarPantalla(req, rows[0].pantalla_id);
    return res.json(rows[0]);
  } catch (err) {
    return next(err);
  }
}

async function eliminar(req, res, next) {
  try {
    const { rows } = await query('DELETE FROM programaciones WHERE id = $1 RETURNING *', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Programacion no encontrada' });

    await notificarPantalla(req, rows[0].pantalla_id);
    return res.status(204).send();
  } catch (err) {
    return next(err);
  }
}

module.exports = { listar, obtener, crear, actualizar, eliminar };
