import initModels from '../models/init-models.js';
import sequelize from '../config/database.js';

const models = initModels(sequelize);
const model = models.reportesActividad;
const logAccesosModel = models.logAccesos;

const repository = {
    async registrar(entity) {
        return await model.create(entity);
    },

    async buscarPorIdUser(id, userId) {
        return await model.findOne({
            where: {
                id: id,
                user_id: userId
            },
            include: [
                {
                    model: logAccesosModel,
                    as: 'log_acceso'
                }
            ]
        });
    },

    async buscarReportesUser(userId) {
        return await model.findAll({
            where: {
                user_id: userId
            },
            include: [
                {
                    model: logAccesosModel,
                    as: 'log_acceso'
                }
            ],
            order: [['fecha_reporte', 'DESC']]
        });
    },

    //Comprobar que el registro exista y pertenezca al usuario que intenta reportar
    async verificarRegistroUsuario(logId, userId) {
        return await logAccesosModel.findOne({
            where: {
                id: logId,
                user_id: userId
            }
        });
    },

    async buscarTodos() {
        return await model.findAll({
            include: [
                {
                    model: models.user,
                    as: 'usuario',
                    attributes: ['id', 'full_name', 'email']
                },
                {
                    model: logAccesosModel,
                    as: 'log_acceso'
                }
            ],
            order: [['fecha_reporte', 'DESC']]
        });
    },

    async verificarReporte(logId, userId) {
        return await model.findOne({
            where: {
                logAccesos_id: logId,
                user_id: userId
            }
        });
    }
};

export default repository;