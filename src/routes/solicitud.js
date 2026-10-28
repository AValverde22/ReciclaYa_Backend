import express from 'express'
import controller from '../controllers/solicitud.js'
<<<<<<< HEAD
=======
import calificacionController from '../controllers/calificacion.js';
>>>>>>> 6adfab74a2cf075f93d455c40a6f2856cd73334c

const router = express.Router();

router.post('/', controller.create);
router.get('/', controller.get);
router.get('/reciclador', controller.getAceptadas);
router.get('/disponibles', controller.getDisponibles);
router.patch('/:id', controller.update);
router.patch('/:id/cancel', controller.cancel)
router.patch('/:id/accept', controller.accept)
<<<<<<< HEAD
=======
router.get('/:id/calificacion', calificacionController.getBySolicitud);
router.post('/:id/calificacion', calificacionController.create);
>>>>>>> 6adfab74a2cf075f93d455c40a6f2856cd73334c

export default router;