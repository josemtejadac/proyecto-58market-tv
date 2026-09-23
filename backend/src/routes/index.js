const express = require('express');
const authRoutes = require('./authRoutes');
const pantallasRoutes = require('./pantallasRoutes');
const contenidosRoutes = require('./contenidosRoutes');
const playlistsRoutes = require('./playlistsRoutes');
const programacionesRoutes = require('./programacionesRoutes');

const router = express.Router();

router.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

router.use('/auth', authRoutes);
router.use('/pantallas', pantallasRoutes);
router.use('/contenidos', contenidosRoutes);
router.use('/playlists', playlistsRoutes);
router.use('/programaciones', programacionesRoutes);

module.exports = router;
