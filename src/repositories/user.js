import initModels from '../models/init-models.js'
import sequelize from '../config/database.js'

const model = initModels(sequelize).user;

const repository = {
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
                where: { email: email }
            });

            return object;
        } catch (error) { return null; }
    }
}

export default repository;