import sequelize from '../config/database.js';
import initModels from '../models/init-models.js';
import { Op } from 'sequelize';

const models = initModels(sequelize);
const plain = row => row ? row.toJSON() : null;

// A scoped repository keeps every read and write in the same transaction.
function scoped(transaction) {
    const options = transaction ? {transaction} : {};
    return {
        async findUser(id) {
            return plain(await models.user.findByPk(id, options));
        },
        async findCounterpart(id) {
            return plain(await models.user.findByPk(id, {...options, attributes:['id','full_name','score']}));
        },
        async findRequest(id) {
            return plain(await models.solicitud.findByPk(id, {
                ...options, ...(transaction ? {lock:transaction.LOCK.UPDATE} : {})
            }));
        },
        async findActive(userId) {
            return plain(await models.solicitud.findOne({
                ...options, where:{status:'Pendiente', [Op.or]:[{created_by:userId}, {accepted_by:userId}]},
                order:[['id','ASC']]
            }));
        },
        async findAcceptanceConflict(recyclerId, creatorId) {
            return plain(await models.solicitud.findOne({
                ...options, where:{status:'Pendiente', [Op.or]:[{accepted_by:recyclerId}, {created_by:creatorId}]}
            }));
        },
        async createRequest(data) {
            return plain(await models.solicitud.create(data, options));
        },
        async updateRequest(id, data) {
            const row = await models.solicitud.findByPk(id, options);
            await row.update(data, options);
            return plain(row);
        },
        async findRating(requestId, evaluatorId) {
            return plain(await models.calificacion.findOne({
                ...options, where:{solicitud_id:requestId, evaluador_id:evaluatorId}
            }));
        },
        countRatings(requestId) {
            return models.calificacion.count({...options, where:{solicitud_id:requestId}});
        },
        createRating(data) {
            return models.calificacion.create(data, options).then(plain);
        },
        async averageRating(userId) {
            const result = await models.calificacion.findOne({
                ...options, attributes:[[sequelize.fn('AVG', sequelize.col('puntuacion')), 'average']],
                where:{evaluado_id:userId}, raw:true
            });
            return Number(result.average);
        },
        async updateScore(userId, score) {
            await models.user.update({score}, {...options, where:{id:userId}});
        }
    };
}

export default {
    ...scoped(),
    async atomic(work) {
        return sequelize.transaction(async transaction => {
            // Shared across Node processes: checking availability and changing it are indivisible.
            await sequelize.query('SELECT pg_advisory_xact_lock(72651, 2)', {transaction});
            return work(scoped(transaction));
        });
    }
};
