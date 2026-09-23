/**
 * Crea (o actualiza la clave de) el usuario administrador inicial.
 * Uso: npm run seed
 */
const bcrypt = require('bcryptjs');
const { query, pool } = require('../config/db');
const env = require('../config/env');

async function seed() {
  const passwordHash = await bcrypt.hash(env.adminPassword, 10);

  const { rows } = await query('SELECT id FROM usuarios WHERE usuario = $1', [env.adminUser]);

  if (rows.length > 0) {
    await query('UPDATE usuarios SET password_hash = $1 WHERE usuario = $2', [passwordHash, env.adminUser]);
    console.log(`[seed] Usuario "${env.adminUser}" ya existia, clave actualizada.`);
  } else {
    await query('INSERT INTO usuarios (usuario, password_hash) VALUES ($1, $2)', [env.adminUser, passwordHash]);
    console.log(`[seed] Usuario administrador "${env.adminUser}" creado.`);
  }

  await pool.end();
}

seed().catch((err) => {
  console.error('[seed] Error creando el usuario administrador:', err);
  process.exit(1);
});
