import logAccesosService from '../services/logAccesos.js';

const controller = {
    async obtenerHistorial(req, res) {
        try {
            const { userId } = req.params;
            const { tipo } = req.query;

            const response =
                await logAccesosService.obtenerHistorial(userId, tipo);

            return sendResults(true, 200, 400, response, res);
        } catch (error) {
            console.error('Error al obtener el historial:', error);
            return sendError(res);
        }
    },

    async obtenerDetalle(req, res) {
        try {
            const { userId, id } = req.params;

            const response =
                await logAccesosService.obtenerDetalle(id, userId);

            if (!response) {
                return sendResults(false, 200, 404, null, res);
            }

            return sendResults(true, 200, 400, response, res);
        } catch (error) {
            console.error('Error al obtener el detalle del acceso:', error);
            return sendError(res);
        }
    }
};

const sendResults = (success, codOK, codError, result, res) => {
    return res.status(success ? codOK : codError).json(result);
};

const sendError = (res) => {
    return res.status(500).json({
        message: 'Error interno en el servidor.'
    });
};

export default controller;