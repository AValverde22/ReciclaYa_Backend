import initModels from '../models/init-models.js';
import sequelize from '../config/database.js';

const models = initModels(sequelize);
const model = models.calificacion;

const repository = {
  encontrarSolicitudEvaluador(solicitudId, evaluadorId) {
    return model.findOne({ where: { solicitud_id: solicitudId, evaluador_id: evaluadorId } });
  },
  buscarInformacionSolicitud(solicitudId) {
    return models.solicitud.findByPk(solicitudId, {
      attributes: ['id', 'status', 'created_by', 'accepted_by', 'user_confirmed', 'recycler_confirmed']
    });
  },
  create(data) {
    return model.create(data);
  },
  async actualizarScoreEvaluado(evaluadoId) {
    const result = await model.findOne({
      attributes: [[sequelize.fn('AVG', sequelize.col('puntuacion')), 'average']],
      where: { evaluado_id: evaluadoId },
      raw: true
    });
    const score = Math.round(Number(result?.average || 5) * 10) / 10;
    await models.user.update({ score }, { where: { id: evaluadoId } });
    return score;
  },
  async getReputation(userId) {
    const user = await models.user.findByPk(userId, {
      attributes: ['id', 'full_name', 'profile_photo_url', 'score'],
      raw: true
    });
    if (!user) return null;
    const rows = await model.findAll({
      where: { evaluado_id: userId },
      attributes: ['id', 'solicitud_id', 'puntuacion', 'comentario', 'created_at'],
      include: [{
        model: models.user,
        as: 'evaluador',
        required: true,
        attributes: ['id', 'full_name', 'profile_photo_url']
      }],
      order: [['created_at', 'DESC'], ['id', 'DESC']]
    });
    const reviews = rows.map(row => row.get({ plain: true }));
    return {
      user,
      average_rating: Number(user.score),
      total_ratings: reviews.length,
      reviews
    };
  }
};

export default repository;
