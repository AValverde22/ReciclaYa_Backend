import express from 'express'
import controller from '../controllers/solicitud.js'

const router = express.Router();

router.post('/', controller.create);

export default router;