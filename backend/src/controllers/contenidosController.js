const fs = require('fs');
const path = require('path');
const { query } = require('../config/db');
const { uploadPath, ALLOWED_MIME } = require('../middleware/upload');

async function listar(req, res, next) {
  try {
    const { rows } = await query('SELECT * FROM contenidos ORDER BY creado_en DESC');
    return res.json(rows);
  } catch (err) {
    return next(err);
  }
}

async function obtener(req, res, next) {
  try {
    const { rows } = await query('SELECT * FROM contenidos WHERE id = $1', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Contenido no encontrado' });
    return res.json(rows[0]);
  } catch (err) {
    return next(err);
  }
}

async function subir(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Archivo requerido (campo "archivo")' });
    }

    const tipo = ALLOWED_MIME[req.file.mimetype];
    const nombre = req.body.nombre || req.file.originalname;
    const duracion = tipo === 'imagen' ? parseInt(req.body.duracion_segundos || '10', 10) : null;
    const urlArchivo = `/uploads/${req.file.filename}`;

    const { rows } = await query(
      `INSERT INTO contenidos (nombre, tipo, url_archivo, nombre_archivo, duracion_segundos, tamano_bytes, mime_type)
       VALUES ($1, $2, $3, $4, COALESCE($5, 10), $6, $7)
       RETURNING *`,
      [nombre, tipo, urlArchivo, req.file.filename, duracion, req.file.size, req.file.mimetype]
    );

    return res.status(201).json(rows[0]);
  } catch (err) {
    return next(err);
  }
}

async function actualizar(req, res, next) {
  try {
    const { nombre, duracion_segundos: duracionSegundos } = req.body;
    const { rows } = await query(
      `UPDATE contenidos SET nombre = COALESCE($1, nombre), duracion_segundos = COALESCE($2, duracion_segundos)
       WHERE id = $3 RETURNING *`,
      [nombre, duracionSegundos, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Contenido no encontrado' });
    return res.json(rows[0]);
  } catch (err) {
    return next(err);
  }
}

async function eliminar(req, res, next) {
  try {
    const { rows } = await query('DELETE FROM contenidos WHERE id = $1 RETURNING *', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Contenido no encontrado' });

    const filePath = path.join(uploadPath, rows[0].nombre_archivo);
    fs.unlink(filePath, (err) => {
      if (err && err.code !== 'ENOENT') console.error('[contenidos] no se pudo borrar archivo', err);
    });

    return res.status(204).send();
  } catch (err) {
    return next(err);
  }
}

module.exports = { listar, obtener, subir, actualizar, eliminar };
