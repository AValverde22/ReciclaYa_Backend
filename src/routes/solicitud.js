import express from 'express'
import controller from '../controllers/solicitud.js'

const router = express.Router();

router.post('/', controller.create);
router.get('/', controller.get)
router.patch('/:id', controller.update);
router.patch('/:id/cancel', controller.cancel)

export default router;