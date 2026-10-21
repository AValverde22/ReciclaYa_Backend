import express from 'express'
import controller from '../controllers/solicitud.js'
import calificacionController from '../controllers/calificacion.js';

const router = express.Router();

router.post('/', controller.create);
router.get('/', controller.get);
router.get('/reciclador', controller.getAceptadas);
router.get('/disponibles', controller.getDisponibles);
router.patch('/:id', controller.update);
router.patch('/:id/cancel', controller.cancel)
router.patch('/:id/accept', controller.accept)
router.get('/:id/calificacion', calificacionController.getBySolicitud);
router.post('/:id/calificacion', calificacionController.create);

export default router;