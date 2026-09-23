const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../config/db');
const env = require('../config/env');

async function login(req, res, next) {
  try {
    const { usuario, password } = req.body;

    if (!usuario || !password) {
      return res.status(400).json({ error: 'usuario y password son requeridos' });
    }

    const { rows } = await query('SELECT * FROM usuarios WHERE usuario = $1', [usuario]);
    const user = rows[0];

    if (!user) {
      return res.status(401).json({ error: 'Credenciales invalidas' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Credenciales invalidas' });
    }

    const token = jwt.sign({ sub: user.id, usuario: user.usuario }, env.jwtSecret, {
      expiresIn: env.jwtExpiresIn,
    });

    return res.json({ token, usuario: { id: user.id, usuario: user.usuario } });
  } catch (err) {
    return next(err);
  }
}

async function me(req, res) {
  res.json({ usuario: req.user });
}

module.exports = { login, me };
