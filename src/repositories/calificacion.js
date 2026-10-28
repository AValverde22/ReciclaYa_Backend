import initModels from '../models/init-models.js';
import sequelize from '../config/database.js';

const model = initModels(sequelize).calificacion;
const modelS = initModels(sequelize).solicitud;

const repository = {
  async encontrarSolicitudEvaluador(solicitudId, evaluadorId) {
    try{ return await model.findOne({
        where: {
            solicitud_id: solicitudId,
            evaluador_id: evaluadorId
        }
    });
    } catch (error) {
        return null;
    };
  },

  async buscarInformacionSolicitud(solicitudId) {
    try {
        return await modelS.findByPk(solicitudId, {
            attributes: ['id', 'status', 'created_by', 'accepted_by']
        });
    } catch (error) { return null; }
  },

  async create(data) {
    try { return await model.create(data);
    } catch (error) {return null}
    ;
  },

  async obtenerPromedioEvaluadoYActualizar(evaluadoId) {
    try{
        const result = await model.findOne({
            attributes: [
                [sequelize.fn('AVG', sequelize.col('puntuacion')), 'promedio']
            ],
            where: { evaluado_id: evaluadoId },
            raw: true
        });
        
        const promedio = result && result.promedio ? parseFloat(result.promedio) : 5.0;
        const newScore = Math.round(promedio * 10) / 10;
        
        await modelS.update(
            { score: newScore },
            { where: { id: evaluadoId }}
        );

        return { nuevoScore: newScore };
    } catch (error){ return null; }
  },

  async actualizarScoreEvaluado(){
    const scoreData = await repository. obtenerPromedioEvaluado(evaluado_id);
    const nuevoScore = Math.round((scoreData.promedio || 5.0) * 10) / 10;

            await repository.update(
                { score: nuevoScore },
                { where: { id: evaluado_id }, transaction }
            );

            await transaction.commit();

  }
};

export default repository;