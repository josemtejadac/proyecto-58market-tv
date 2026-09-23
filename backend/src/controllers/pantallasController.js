const { query } = require('../config/db');
const { generatePairingCode } = require('../utils/pairingCode');
const { getContenidoActual } = require('../utils/scheduleEngine');

/**
 * Llamado por la app player (TV) cuando arranca sin estar emparejada.
 * Crea (o reutiliza) un registro de pantalla "pendiente" con un codigo corto
 * que el usuario debe ingresar en el panel web.
 */
async function iniciarEmparejamiento(req, res, next) {
  try {
    let codigo;
    let intentos = 0;
    let existe = true;

    // Genera un codigo que no colisione con uno ya pendiente
    while (existe && intentos < 10) {
      codigo = generatePairingCode();
      const { rows } = await query(
        'SELECT id FROM pantallas WHERE codigo_emparejamiento = $1 AND emparejada = false',
        [codigo]
      );
      existe = rows.length > 0;
      intentos += 1;
    }

    const { rows } = await query(
      `INSERT INTO pantallas (nombre, codigo_emparejamiento, emparejada, estado, ultima_conexion)
       VALUES ('Pantalla sin nombre', $1, false, 'online', now())
       RETURNING *`,
      [codigo]
    );

    return res.status(201).json(rows[0]);
  } catch (err) {
    return next(err);
  }
}

/**
 * Llamado desde el panel web para vincular una pantalla usando el codigo
 * que se muestra en la TV.
 */
async function confirmarEmparejamiento(req, res, next) {
  try {
    const { codigo, nombre, ubicacion } = req.body;
    if (!codigo) {
      return res.status(400).json({ error: 'codigo es requerido' });
    }

    const { rows } = await query(
      'SELECT * FROM pantallas WHERE codigo_emparejamiento = $1 AND emparejada = false',
      [codigo.toUpperCase()]
    );
    const pantalla = rows[0];

    if (!pantalla) {
      return res.status(404).json({ error: 'Codigo invalido o ya utilizado' });
    }

    const { rows: updated } = await query(
      `UPDATE pantallas
       SET nombre = COALESCE($1, nombre), ubicacion = $2, emparejada = true
       WHERE id = $3
       RETURNING *`,
      [nombre, ubicacion || null, pantalla.id]
    );

    const io = req.app.get('io');
    io.to(`pantalla-pendiente:${pantalla.codigo_emparejamiento}`).emit('pantalla:emparejada', updated[0]);
    io.to('admin').emit('pantalla:actualizada', updated[0]);

    return res.json(updated[0]);
  } catch (err) {
    return next(err);
  }
}

async function listar(req, res, next) {
  try {
    const { rows } = await query('SELECT * FROM pantallas ORDER BY creado_en DESC');
    return res.json(rows);
  } catch (err) {
    return next(err);
  }
}

async function obtener(req, res, next) {
  try {
    const { rows } = await query('SELECT * FROM pantallas WHERE id = $1', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Pantalla no encontrada' });
    return res.json(rows[0]);
  } catch (err) {
    return next(err);
  }
}

async function actualizar(req, res, next) {
  try {
    const { nombre, ubicacion } = req.body;
    const { rows } = await query(
      `UPDATE pantallas SET nombre = COALESCE($1, nombre), ubicacion = COALESCE($2, ubicacion)
       WHERE id = $3 RETURNING *`,
      [nombre, ubicacion, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Pantalla no encontrada' });

    req.app.get('io').to('admin').emit('pantalla:actualizada', rows[0]);
    return res.json(rows[0]);
  } catch (err) {
    return next(err);
  }
}

async function eliminar(req, res, next) {
  try {
    const { rows } = await query('DELETE FROM pantallas WHERE id = $1 RETURNING id', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Pantalla no encontrada' });

    req.app.get('io').to('admin').emit('pantalla:eliminada', { id: req.params.id });
    return res.status(204).send();
  } catch (err) {
    return next(err);
  }
}

async function contenidoActual(req, res, next) {
  try {
    const { rows } = await query('SELECT id FROM pantallas WHERE id = $1', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Pantalla no encontrada' });

    const resultado = await getContenidoActual(req.params.id);
    if (!resultado) {
      return res.json({ programacion: null, items: [] });
    }
    return res.json(resultado);
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  iniciarEmparejamiento,
  confirmarEmparejamiento,
  listar,
  obtener,
  actualizar,
  eliminar,
  contenidoActual,
};
