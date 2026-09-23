const express = require('express');
const controller = require('../controllers/programacionesController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/', requireAuth, controller.listar);
router.get('/:id', requireAuth, controller.obtener);
router.post('/', requireAuth, controller.crear);
router.put('/:id', requireAuth, controller.actualizar);
router.delete('/:id', requireAuth, controller.eliminar);

module.exports = router;
