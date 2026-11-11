import sequelize from '../config/database.js';
import initModels from '../models/init-models.js';

const models = initModels(sequelize);
const defaults = [
  {
    code: 'MUNI-ECOBOLSA',
    name: 'Kit de bolsas reutilizables',
    description: 'Kit para separar y transportar residuos reciclables.',
    provider: 'Municipalidad afiliada',
    points_required: 300,
    conditions: 'Un canje por usuario mientras exista stock.',
    stock: 100
  },
  {
    code: 'ECO-DESCUENTO-10',
    name: '10% de descuento en comercio aliado',
    description: 'Cupón de descuento para productos reutilizables.',
    provider: 'Comercio afiliado',
    points_required: 500,
    conditions: 'Válido para una compra y sujeto a condiciones del comercio.',
    stock: null
  },
  {
    code: 'MUNI-COMPOST',
    name: 'Taller municipal de compostaje',
    description: 'Cupo para un taller práctico de compostaje domiciliario.',
    provider: 'Municipalidad afiliada',
    points_required: 800,
    conditions: 'Sujeto a disponibilidad de fechas y vacantes.',
    stock: 50
  }
];

async function ensureBenefits(transaction) {
  for (const item of defaults)
    await models.beneficio.findOrCreate({ where: { code: item.code }, defaults: item, transaction });
}

async function balance(userId, transaction) {
  const value = await models.puntosMovimiento.sum('points', { where: { user_id: userId }, transaction });
  return Number(value || 0);
}

function fail(message, status = 409) {
  throw Object.assign(new Error(message), { status });
}

export default {
  async getAccount(userId) {
    const user = await models.user.findByPk(userId, { attributes: ['id'] });
    if (!user) return null;
    const [points, history] = await Promise.all([
      balance(userId),
      models.puntosMovimiento.findAll({
        where: { user_id: userId },
        attributes: ['id', 'type', 'points', 'description', 'created_at', 'solicitud_id', 'canje_id'],
        order: [['created_at', 'DESC'], ['id', 'DESC']],
        raw: true
      })
    ]);
    return { balance: points, history };
  },
  async getBenefits(userId) {
    const user = await models.user.findByPk(userId, { attributes: ['id'] });
    if (!user) return null;
    await ensureBenefits();
    const [points, benefits] = await Promise.all([
      balance(userId),
      models.beneficio.findAll({
        where: { active: true },
        attributes: ['id', 'name', 'description', 'provider', 'points_required', 'conditions', 'stock'],
        order: [['points_required', 'ASC'], ['id', 'ASC']],
        raw: true
      })
    ]);
    return { balance: points, benefits };
  },
  async redeem(userId, benefitId) {
    return sequelize.transaction(async transaction => {
      await sequelize.query('SELECT pg_advisory_xact_lock(72651, 4)', { transaction });
      await ensureBenefits(transaction);
      const user = await models.user.findByPk(userId, { transaction, lock: transaction.LOCK.UPDATE });
      if (!user) fail('Usuario no encontrado.', 404);
      const benefit = await models.beneficio.findByPk(benefitId, { transaction, lock: transaction.LOCK.UPDATE });
      if (!benefit || !benefit.active || benefit.stock === 0) fail('El beneficio no se encuentra disponible.', 404);
      const current = await balance(userId, transaction);
      const required = Number(benefit.points_required);
      if (current < required) fail('No cuenta con puntos suficientes para realizar este canje.');

      const redemption = await models.canje.create({
        user_id: userId,
        beneficio_id: benefit.id,
        points_spent: required,
        status: 'Confirmado'
      }, { transaction });
      await models.puntosMovimiento.create({
        user_id: userId,
        canje_id: redemption.id,
        type: 'Canjeado',
        points: -required,
        description: `Canje: ${benefit.name}`
      }, { transaction });
      if (benefit.stock != null) await benefit.update({ stock: benefit.stock - 1 }, { transaction });
      return {
        redemption_id: redemption.id,
        benefit_id: benefit.id,
        benefit_name: benefit.name,
        points_spent: required,
        balance: current - required
      };
    });
  }
};
