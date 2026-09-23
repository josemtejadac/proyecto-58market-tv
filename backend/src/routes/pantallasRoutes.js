const express = require('express');
const controller = require('../controllers/pantallasController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// Usados por la app player (TV) en la red local, sin autenticacion de admin
router.post('/emparejar/iniciar', controller.iniciarEmparejamiento);
router.get('/:id/contenido-actual', controller.contenidoActual);
router.get('/:id', controller.obtener);

// Usados por el panel de administracion
router.post('/emparejar/confirmar', requireAuth, controller.confirmarEmparejamiento);
router.get('/', requireAuth, controller.listar);
router.put('/:id', requireAuth, controller.actualizar);
router.delete('/:id', requireAuth, controller.eliminar);

module.exports = router;
