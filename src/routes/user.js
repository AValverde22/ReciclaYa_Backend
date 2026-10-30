import express from 'express'
import controller from '../controllers/user.js'

const router = express.Router();
router.get('/:id/score', controller.getScore);
router.get('/:id/two-factor', controller.getTwoFactor);
router.patch('/:id/two-factor', controller.setTwoFactor);

router.post('/validate', controller.validate);
router.post('/register', controller.register);
router.post('/login', controller.login);
router.post('/login/verify', controller.verifyLogin);
router.post('/login/resend', controller.resendLoginCode);
router.post('/recover', controller.recover);
router.post('/compare', controller.compare);
router.patch('/reset', controller.reset);

export default router;
