import service from '../services/puntos.js';

async function send(work, res, successStatus = 200) {
  try {
    const result = await work();
    if (!result.success) return res.status(result.status).json({ message: result.message });
    return res.status(successStatus).json(result);
  } catch (error) {
    return res.status(500).json({ message: 'Error interno en el servidor.' });
  }
}

export default {
  account: (req, res) => send(() => service.account(req.params.id), res),
  benefits: (req, res) => send(() => service.benefits(req.params.id), res),
  redeem: (req, res) => send(() => service.redeem(req.params.id, req.params.benefitId), res, 201)
};
