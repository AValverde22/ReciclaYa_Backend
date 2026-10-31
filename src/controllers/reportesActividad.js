import service from '../services/reportesActividad.js';

const controller = {
    async registrar(req, res) {
        try {
            const userId = req.user.id;

            const response = await service.registrar(
                userId,
                req.body ?? {}
            );

            return res.status(201).json({
                success: true,
                message: 'Reporte de actividad sospechosa registrado correctamente',
                data: response
            });

        } catch (error) {
            console.error('Error al registrar reporte:', error);

            if (error.message === 'Ya has reportado este registro de acceso') {
                return res.status(409).json({
                    success: false,
                    message: error.message
                });
            }

            if (error.name === 'SequelizeUniqueConstraintError') {
                return res.status(409).json({
                    success: false,
                    message: 'Ya existe un reporte para este registro de acceso'
                });
            }

            if (error.message.includes('no es válido') ||
                error.message.includes('no pertenece') ||
                error.message.includes('no existe') ||
                error.message.includes('no puede superar')
            ) {
                return res.status(400).json({
                    success: false,
                    message: error.message
                });
            }

            return res.status(500).json({
                success: false,
                message: 'Error interno al registrar el reporte'
            });
        }
    },

    async obtenerPorUsuario(req, res) {
        try {
            const response = await service.obtenerPorUsuario(req.user.id);

            return res.status(200).json({
                success: true,
                data: response
            });

        } catch (error) {
            console.error('Error al consultar reportes:', error);

            return res.status(500).json({
                success: false,
                message: 'Error al consultar los reportes'
            });
        }
    },

    async obtenerDetalle(req, res) {
        try {
            const response = await service.obtenerDetalle(
                req.params.id,
                req.user.id
            );

            return res.status(200).json({
                success: true,
                data: response
            });

        } catch (error) {
            console.error('Error al consultar detalle:', error);

            if (error.message === 'No se encontró el reporte solicitado') {
                return res.status(404).json({
                    success: false,
                    message: error.message
                });
            }

            return res.status(400).json({
                success: false,
                message: error.message
            });
        }
    },

    async buscarTodos(req, res) {
        try {
            const response = await service.buscarTodos();

            return res.status(200).json({
                success: true,
                data: response
            });

        } catch (error) {
            console.error('Error al consultar todos los reportes:', error);

            return res.status(500).json({
                success: false,
                message: 'Error al consultar los reportes'
            });
        }
    }
};

export default controller;