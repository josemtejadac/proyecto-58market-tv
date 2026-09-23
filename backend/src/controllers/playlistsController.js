const { query, getClient } = require('../config/db');

async function listar(req, res, next) {
  try {
    const { rows } = await query('SELECT * FROM playlists ORDER BY creado_en DESC');
    return res.json(rows);
  } catch (err) {
    return next(err);
  }
}

async function obtenerConItems(playlistId) {
  const { rows: playlistRows } = await query('SELECT * FROM playlists WHERE id = $1', [playlistId]);
  if (!playlistRows[0]) return null;

  const { rows: items } = await query(
    `SELECT pi.id AS item_id, pi.orden, c.*
     FROM playlist_items pi
     JOIN contenidos c ON c.id = pi.contenido_id
     WHERE pi.playlist_id = $1
     ORDER BY pi.orden ASC`,
    [playlistId]
  );

  return { ...playlistRows[0], items };
}

async function obtener(req, res, next) {
  try {
    const playlist = await obtenerConItems(req.params.id);
    if (!playlist) return res.status(404).json({ error: 'Playlist no encontrada' });
    return res.json(playlist);
  } catch (err) {
    return next(err);
  }
}

async function crear(req, res, next) {
  try {
    const { nombre, contenido_ids: contenidoIds } = req.body;
    if (!nombre) return res.status(400).json({ error: 'nombre es requerido' });

    const client = await getClient();
    try {
      await client.query('BEGIN');

      const { rows } = await client.query(
        'INSERT INTO playlists (nombre) VALUES ($1) RETURNING *',
        [nombre]
      );
      const playlist = rows[0];

      if (Array.isArray(contenidoIds)) {
        for (let i = 0; i < contenidoIds.length; i += 1) {
          // eslint-disable-next-line no-await-in-loop
          await client.query(
            'INSERT INTO playlist_items (playlist_id, contenido_id, orden) VALUES ($1, $2, $3)',
            [playlist.id, contenidoIds[i], i]
          );
        }
      }

      await client.query('COMMIT');
      const completa = await obtenerConItems(playlist.id);
      return res.status(201).json(completa);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    return next(err);
  }
}

/**
 * Actualiza nombre y/o reemplaza por completo el orden de contenidos de la playlist.
 * body: { nombre?, contenido_ids?: [uuid en el orden deseado] }
 */
async function actualizar(req, res, next) {
  try {
    const { nombre, contenido_ids: contenidoIds } = req.body;
    const client = await getClient();

    try {
      await client.query('BEGIN');

      const { rows } = await client.query(
        'UPDATE playlists SET nombre = COALESCE($1, nombre) WHERE id = $2 RETURNING *',
        [nombre, req.params.id]
      );
      if (!rows[0]) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Playlist no encontrada' });
      }

      if (Array.isArray(contenidoIds)) {
        await client.query('DELETE FROM playlist_items WHERE playlist_id = $1', [req.params.id]);
        for (let i = 0; i < contenidoIds.length; i += 1) {
          // eslint-disable-next-line no-await-in-loop
          await client.query(
            'INSERT INTO playlist_items (playlist_id, contenido_id, orden) VALUES ($1, $2, $3)',
            [req.params.id, contenidoIds[i], i]
          );
        }
      }

      await client.query('COMMIT');
      const completa = await obtenerConItems(req.params.id);
      return res.json(completa);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    return next(err);
  }
}

async function eliminar(req, res, next) {
  try {
    const { rows } = await query('DELETE FROM playlists WHERE id = $1 RETURNING id', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Playlist no encontrada' });
    return res.status(204).send();
  } catch (err) {
    return next(err);
  }
}

module.exports = { listar, obtener, crear, actualizar, eliminar };
