import initModels from '../models/init-models.js'
import sequelize from '../config/database.js'
import cron from 'node-cron'
import { Op } from 'sequelize'

const model = initModels(sequelize).solicitud;

const expirationTask = cron.createTask('*/1 * * * *', async () => {
    try {
        await sequelize.query(`UPDATE public.solicitud SET status = 'Cancelada', closed_at = CURRENT_TIMESTAMP
            WHERE status = 'Disponible'
            AND (day + time) <= (CURRENT_TIMESTAMP AT TIME ZONE 'America/Lima')`);
    } catch (error) { console.log(error.message); }
});

export const startExpirationTask = () => expirationTask.start();
export const stopExpirationTask = () => expirationTask.destroy();

const repository = {
    async create(entity) {
        try { return await model.create(entity); 
        } catch (error) { return null; }
    },
    async getByCreator(id) {
        try { 
            return await model.findAll({
                attributes: ['id', 'type', 'size', 'day', 'time', 'address', 'latitude', 'longitude', 'status', 'closed_at'],
                where: 
                { 
                    created_by: id,
                    status: ['Disponible', 'Pendiente', 'Cancelada', 'Finalizada']
                },
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
    async getByAccepter(id) {
        try { 
            return await model.findAll({
                attributes: ['id', 'type', 'size', 'day', 'time', 'address', 'latitude', 'longitude', 'status', 'closed_at'],
                where: 
                { 
                    accepted_by: id,
                    status: ['Pendiente', 'Cancelada', 'Finalizada']
                },
                include: [
                    {
                        model: initModels(sequelize).user,
                        required: false, 
                        attributes: ['id', 'full_name', 'profile_photo_url', 'score'],
                        as: 'created_by_user'
                    }
                ],
                order: [
                    sequelize.literal(`
                        CASE 
                            WHEN status = 'Finalizada' THEN 1
                            WHEN status = 'Cancelada' THEN 2
                            ELSE 3
                        END ASC
                    `),
                    ['day', 'ASC'],
                    ['time', 'ASC']
                ]
            });
        } catch (error) { return null; }
    },
    async getDisponibles(solicitudQuery, userQuery) {
         try {
            return await model.findAll(
                {
                    attributes: ['id', 'type', 'size', 'day', 'time', 'address', 'latitude', 'longitude', 'status'],
                    where: solicitudQuery,
                    include: [
                        {
                            model: initModels(sequelize).user,
                            required: true,
                            attributes: ['full_name', 'profile_photo_url', 'score'],
                            where: userQuery,
                            as: 'created_by_user'
                        }
                    ]
                }
            )
        } catch (error) { console.log(error); return null; }
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
                { status: 'Cancelada', closed_at: new Date() },
                { where: { id: id } }
            );

            return true;
        } catch (error) { return null; }
    },
    async verificarEstado(solicitudID) {
        try {
            return await model.findOne(
                {
                    attributes: ['status'],
                    where: { id: solicitudID }
                } 
            )   
        } catch (error) { return null; }        
    },
    async accept(solicitudID, recicladorID) {
        try {
            await model.update(
                {
                    accepted_by: recicladorID,
                    status: 'Pendiente'
                },
                { 
                    where: { id: solicitudID },
                    returning: true
                }
            )

            return true;
        } catch (error) { return null; }
    },
    async buscarSolicitudPendienteExistente(recicladorID){
        return await model.findOne(
            {
                attributes : ['id','status'],
                where: { accepted_by: recicladorID, status : 'Pendiente' } 
            }
        )
    },
    async encontrarPorId(id) {
    return await model.findByPk(id);
    },
}

export default repository;
