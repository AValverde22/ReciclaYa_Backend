import initModels from '../models/init-models.js'
import sequelize from '../config/database.js'
import { Op } from 'sequelize'

const models = initModels(sequelize);
const model = models.user;
const profileChangeModel = models.profileChange;

const repository = {
    async getScore(id) {
        const user = await model.findByPk(id, {attributes:['score'], raw:true});
        return user ? {score:Number(user.score)} : null;
    },
    async getID(email) {
        try {
            const object = await model.findOne({ 
                attributes: ['id'],
                where: { email: email }
            });

            return object;
        } catch (error) {
            console.log(error);
            return null;
        }
    },
    async validate(email) {
        try {
            const object = await model.findOne({
                where: { email: email }
            });
            
            return object;
        } catch (error) { return null; }
    },
    async register(entity) {
        try { return await model.create(entity);
        } catch (error) { return null; }
    },
    async login(email) {
        try {
            const object = await model.findOne({
                attributes: ['id', 'full_name', 'email', 'password', 'role', 'profile_photo_url', 'score', 'two_factor_enabled'],
                where: { email: email }
            });

            return object;
        } catch (error) { return null; }
    },
    async reset(email, password) {
        try {
            await model.update(
                { password: password },
                { where: { email: email } }
            );

            const object = await model.findOne({
                attributes: ['id', 'full_name', 'email', 'role', 'profile_photo_url', 'score'],
                where: { email: email }
            });

            return object;
        } catch (error) { return null; }
    },
    async getSecurity(id) {
        return await model.findByPk(id, {
            attributes: ['id', 'email', 'password', 'two_factor_enabled']
        });
    },
    async updateTwoFactor(id, enabled) {
        const [filas] = await model.update(
            { two_factor_enabled: enabled },
            { where: { id: id } }
        );
        return filas > 0;
    },
    async getSessionUser(id) {
        return await model.findByPk(id, {
            attributes: ['id', 'full_name', 'email', 'role', 'profile_photo_url', 'score', 'two_factor_enabled'],
            raw: true
        });
    },
    async actualizarScore(userId, nuevoScore){
        return await model.update(
            { score: nuevoScore },
            { where: { id: userId }}
        );
    },
    async getProfile(id) {
        const object = await model.findByPk(id, {
            attributes: ['id', 'full_name', 'email', 'role', 'profile_photo_url', 'score'],
            include: [{
                model: profileChangeModel,
                as: 'profile_change',
                required: false,
                attributes: ['status', 'sensitive_fields', 'updated_at']
            }]
        });
        return object ? object.get({ plain: true }) : null;
    },
    async updateProfile(id, data, sensitiveFields) {
        return sequelize.transaction(async transaction => {
            await sequelize.query('SELECT pg_advisory_xact_lock(72651, 3)', { transaction });
            const current = await model.findByPk(id, { transaction, lock: transaction.LOCK.UPDATE });
            if (!current) return { type: 'not_found' };

            const duplicate = await model.findOne({
                where: {
                    [Op.and]: [
                        sequelize.where(sequelize.fn('lower', sequelize.col('email')), data.email.toLowerCase()),
                        { id: { [Op.ne]: id } }
                    ]
                },
                transaction
            });
            if (duplicate) return { type: 'duplicate_email' };

            await current.update(data, { transaction });
            const status = sensitiveFields.length ? 'Pendiente de validación' : 'Validado';
            const statusData = {
                status,
                sensitive_fields: sensitiveFields.length ? sensitiveFields.join(',') : null,
                updated_at: new Date()
            };
            const existingStatus = await profileChangeModel.findOne({ where: { user_id: id }, transaction });
            if (existingStatus) await existingStatus.update(statusData, { transaction });
            else await profileChangeModel.create({ user_id: id, ...statusData }, { transaction });

            return {
                type: 'updated',
                profile: {
                    id: current.id,
                    full_name: current.full_name,
                    email: current.email,
                    role: current.role,
                    profile_photo_url: current.profile_photo_url,
                    score: Number(current.score),
                    validation_status: status,
                    sensitive_fields: sensitiveFields
                }
            };
        });
    }
}

export default repository;
