import express from 'express'
import controller from '../controllers/user.js'
import pointsController from '../controllers/puntos.js'
import ratingController from '../controllers/calificacion.js'

const router = express.Router();
router.get('/:id/profile', controller.getProfile);
router.patch('/:id/profile', controller.updateProfile);
router.get('/:id/points', pointsController.account);
router.get('/:id/benefits', pointsController.benefits);
router.post('/:id/benefits/:benefitId/redeem', pointsController.redeem);
router.get('/:id/reputation', ratingController.getReputation);
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
