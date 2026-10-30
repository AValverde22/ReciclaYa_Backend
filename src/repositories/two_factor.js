import _sequelize from 'sequelize';
import initModels from '../models/init-models.js'
import sequelize from '../config/database.js'

const { Op } = _sequelize;
const model = initModels(sequelize).two_factor_challenge;

const repository = {
    // Un solo reto activo por usuario: un nuevo inicio de sesión reemplaza al anterior.
    async replace(entity) {
        await model.destroy({ where: { user_id: entity.user_id } });
        return await model.create(entity);
    },
    async findByUser(userID) {
        return await model.findOne({ where: { user_id: userID }, raw: true });
    },
    // Reserva un intento de forma atómica; devuelve false si ya no quedan intentos.
    async reserveAttempt(id, maxAttempts) {
        const [filas] = await model.update(
            { attempts: _sequelize.literal('attempts + 1') },
            { where: { id: id, attempts: { [Op.lt]: maxAttempts } } }
        );
        return filas > 0;
    },
    // Consume el reto (uso único); solo una petición concurrente puede consumirlo.
    async consume(id) {
        return (await model.destroy({ where: { id: id } })) > 0;
    },
    // Reemplaza el código solo si ya pasó el tiempo de espera desde el último envío.
    async refreshCode(id, codeHash, expiresAt, sentAt, sentBefore) {
        const [filas] = await model.update(
            { code_hash: codeHash, expires_at: expiresAt, sent_at: sentAt, attempts: 0 },
            { where: { id: id, sent_at: { [Op.lte]: sentBefore } } }
        );
        return filas > 0;
    },
    async deleteByUser(userID) {
        await model.destroy({ where: { user_id: userID } });
    }
}

export default repository;
