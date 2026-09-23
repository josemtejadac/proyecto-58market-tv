const http = require('http');
const { Server } = require('socket.io');
const bcrypt = require('bcryptjs');

const app = require('./app');
const env = require('./config/env');
const { query, pool } = require('./config/db');
const { registerSocketHandlers } = require('./sockets/socketManager');

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: env.corsOrigin === '*' ? true : env.corsOrigin.split(','),
  },
});

app.set('io', io);
registerSocketHandlers(io);

const MAX_DB_RETRIES = 20;

async function waitForDb() {
  for (let intento = 1; intento <= MAX_DB_RETRIES; intento += 1) {
    try {
      await pool.query('SELECT 1');
      return;
    } catch (err) {
      console.log(`[server] Esperando a PostgreSQL... intento ${intento}/${MAX_DB_RETRIES}`);
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }
  throw new Error('No se pudo conectar a PostgreSQL');
}

async function ensureAdminUser() {
  const { rows } = await query('SELECT id FROM usuarios WHERE usuario = $1', [env.adminUser]);
  if (rows.length > 0) return;

  const passwordHash = await bcrypt.hash(env.adminPassword, 10);
  await query('INSERT INTO usuarios (usuario, password_hash) VALUES ($1, $2)', [env.adminUser, passwordHash]);
  console.log(`[server] Usuario administrador "${env.adminUser}" creado automaticamente.`);
}

async function start() {
  await waitForDb();
  await ensureAdminUser();

  server.listen(env.port, () => {
    console.log(`[server] Digital Signage API escuchando en el puerto ${env.port} (${env.nodeEnv})`);
  });
}

start().catch((err) => {
  console.error('[server] Error al iniciar:', err);
  process.exit(1);
});
