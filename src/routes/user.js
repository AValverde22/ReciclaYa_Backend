import express from 'express'
import controller from '../controllers/user.js'

const router = express.Router();

router.post('/login', controller.login);
router.post('/validate', controller.validate);
router.post('/register', controller.register);

export default router;