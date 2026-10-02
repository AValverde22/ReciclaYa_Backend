import initModels from '../models/init-models.js'
import sequelize from '../config/database.js'

const model = initModels(sequelize).solicitud;

const repository = {
    async create(entity) {
        try { return await model.create(entity); 
        } catch (error) { return null; }
    },
    async get(id) {
        try { 
            return await model.findAll(
                {
                    attributes: ['id', 'type', 'size', 'day', 'time', 'address', 'latitude', 'longitude', 'status'],
                    where: { 'created_by' : id },
                    include: [
                        {
                            model: initModels(sequelize).user,
                            required: true,
                            attributes: ['full_name', 'profile_photo_url', 'score'],
                            as: 'created_by_user'
                        }
                    ]
                }
            )
        }
        catch (error) { return null; }
    }
}

export default repository;