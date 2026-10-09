import initModels from '../models/init-models.js'
import sequelize from '../config/database.js'

const model = initModels(sequelize).user;

const repository = {
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
                attributes: ['id', 'full_name', 'email', 'password', 'role', 'profile_photo_url', 'score'],
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
    }
}

export default repository;