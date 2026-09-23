const express = require('express');
const controller = require('../controllers/contenidosController');
const { requireAuth } = require('../middleware/auth');
const { upload } = require('../middleware/upload');

const router = express.Router();

router.get('/', requireAuth, controller.listar);
router.get('/:id', requireAuth, controller.obtener);
router.post('/', requireAuth, upload.single('archivo'), controller.subir);
router.put('/:id', requireAuth, controller.actualizar);
router.delete('/:id', requireAuth, controller.eliminar);

module.exports = router;
