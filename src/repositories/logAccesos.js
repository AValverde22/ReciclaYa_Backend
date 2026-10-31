import initModels from '../models/init-models.js';
import sequelize from '../config/database.js';

const model = initModels(sequelize).log_solicitudes;

const repository = {
    async registrar(datos) {
        return await model.create(datos);
    },

    async obtenerHistorial(userId, visualizacion_limite = 20, tipo = null) {
        const where = { user_id: userId };

        if (tipo) {
            where.tipo_actividad = tipo;
        }

        return await model.findAll({
            where,
            attributes: [
                'id',
                'user_id',
                'direccion_ip',
                'pais',
                'fecha_login'
            ],
            order: [
                ['fecha_login', 'DESC'],
                ['id', 'DESC']
            ],
            limit: visualizacion_limite
        });
    },

    async obtenerPorId (id, userId) {
        return await model.findOne({
            where: {
                id: id,
                user_id: userId
            },
            attributes: [
                'id',
                'user_id',
                'direccion_ip',
                'app_version',
                'ciudad',
                'pais',
                'latitud',
                'longitud',
                'fecha_login'
            ]
        });
    }
};

export default repository;