import initModels from '../models/init-models.js'
import sequelize from '../config/database.js'
import cron from 'node-cron'
import { Op } from 'sequelize'

const model = initModels(sequelize).solicitud;

cron.schedule('*/1 * * * *', async () => {
    try {
        const date = new Date().toLocaleString('en-CA', {
            timeZone: 'America/Lima',
            hour12: false
        });

        await model.update(
            { status: 'Cancelada' },
            { where:  
                {
                    [Op.or]: [
                        {
                            day: { [Op.lt]: date.slice(0, 10) }
                        },
                        {
                            day : { [Op.e]: date.slice(0, 10) },
                            time: { [Op.lte]: date.slice(12, 20) }
                        }
                    ]
                }
            }
        );
    } catch (error) { console.log(error.message); }
});

const repository = {
    async create(entity) {
        try { return await model.create(entity); 
        } catch (error) { return null; }
    },
    async getByCreator(id) {
        try { 
            return await model.findAll({
                attributes: ['id', 'type', 'size', 'day', 'time', 'address', 'latitude', 'longitude', 'status'],
                where: { created_by: id },
                include: [
                    {
                        model: initModels(sequelize).user,
                        required: false, 
                        attributes: ['id', 'full_name', 'profile_photo_url', 'score'],
                        as: 'accepted_by_user'
                    }
                ],
                order: [
                    sequelize.literal(`
                        CASE 
                            WHEN status = 'Disponible' THEN 1
                            WHEN status = 'Cancelada' THEN 2
                            WHEN status = 'Finalizada' THEN 3
                            ELSE 4
                        END ASC
                    `),
                    ['day', 'ASC'],
                    ['time', 'ASC']
                ]
            });

        } catch (error) { return null; }
    },
    async update(id, entity) {
        try {
            await model.update(
                entity ,
                { where: { id: id} }
            );

            return true;
        } catch (error) { return null; }
    },
    async cancel(id) {
        try {
            await model.update(
                { status: 'Cancelada' },
                { where: { id: id } }
            );

            return true;
        } catch (error) { return null; }
    }
}

export default repository;