import express from 'express'
import logAccesosController from '../controllers/logAccesos.js';
import reportesActividadController from '../controllers/reportesActividad.js';

const router = express.Router();

router.get('/:userId', logAccesosController.obtenerHistorial);
router.post('/:userId', logAccesosController.registrar);
router.get('/:userId/mis-reportes', reportesActividadController.obtenerPorUsuario);
router.get('/:userId/mis-reportes/:idReporte', reportesActividadController.obtenerDetalle);
router.post('/:userId/:id/reportar', reportesActividadController.registrar);
router.get('/:userId/:id', logAccesosController.obtenerDetalle);


export default router;