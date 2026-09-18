import initModels from '../models/init-models.js'
import sequelize from '../config/database.js'

const model = initModels(sequelize).verification_code;

const repository = {
    async insert(entity) {
        await this.delete(entity.user_id);
        await model.create(entity)
    },
    async delete(user_id) {
        await model.destroy({
            where: { user_id: user_id }
        })
    },
    async getCode(user_id) {
        try {
            return await model.findOne({
                attributes: ['code'],
                where: { user_id: user_id }
            })
        } catch (error) { return null; }
    }
}

export default repository;