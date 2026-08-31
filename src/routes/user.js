import express from 'express'
import controller from '../controllers/user.js'

const router = express.Router();

router.post('/validate', controller.validate);
router.post('/register', controller.register);
router.post('/login', controller.login);

export default router;