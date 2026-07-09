import initModels from '../models/init-models.js'
import sequelize from '../config/database.js'

const model = initModels(sequelize).users;

const repository = {
    async login(entity) {
        try {
            const object = await model.findOne({
                where: {
                    email: entity.email,
                    password: entity.password
                }
            });

            return (object === null) ? {"id": 0, "full_name": "", "email": "", "password": "", "role": "" } : object;

        } catch (error) {
            console.debug(error);
            return null;
        }
    },
    async validate(entity) {
        try {
            const object = await model.findOne({
                where: {email: entity.email}
            });
            
            console.log(!(object === null))
            return !(object === null);

        } catch (error) {
            console.log(error);
            return null;
        }
    },
    async register(entity) {
        try {
            const object = await model.create(entity);
            return object.id;

        } catch (error) {
            console.debug(error);
            return null;
        }
    }
}

export default repository;