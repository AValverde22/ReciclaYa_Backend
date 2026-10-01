import initModels from '../models/init-models.js'
import sequelize from '../config/database.js'

const model = initModels(sequelize).solicitud;

const repository = {
    async create(entity) {
        try { return await model.create(entity); 
        } catch (error) { return null; }
    }
}

export default repository;