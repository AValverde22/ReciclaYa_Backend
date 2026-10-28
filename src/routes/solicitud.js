import express from 'express'
import controller from '../controllers/solicitud.js'
import calificacionController from '../controllers/calificacion.js';

import recojo from '../controllers/recojo.js';
const router = express.Router();
router.get('/activa', recojo.active);
router.patch('/:id/ubicacion', recojo.location);
router.post('/:id/confirmar', recojo.confirm);
router.post('/:id/cancelar-recojo', recojo.cancelActive);
router.get('/:id/ruta', recojo.route);

router.post('/', recojo.create);
router.get('/', controller.get);
router.get('/reciclador', controller.getAceptadas);
router.get('/disponibles', controller.getDisponibles);
router.patch('/:id', recojo.edit);
router.patch('/:id/cancel', recojo.cancel)
router.patch('/:id/accept', recojo.accept)
router.get('/:id/calificacion', calificacionController.getBySolicitud);
router.post('/:id/calificacion', recojo.rate);

export default router;
