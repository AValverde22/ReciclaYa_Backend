import express from 'express'
import controller from '../controllers/user.js'

const router = express.Router();

router.post('/validate', controller.validate);
router.post('/register', controller.register);
router.post('/login', controller.login);
router.post('/recover', controller.recover);
router.post('/compare', controller.compare);
router.patch('/reset', controller.reset);

export default router;