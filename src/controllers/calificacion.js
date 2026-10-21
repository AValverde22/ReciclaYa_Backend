import calificacionService from "../services/calificacion.js";

const controller = {
    async create(req, res) {
        try {
            const { solicitud_id, puntuacion, comentario } = req.body;
            const evaluador_id = req.user?.id || req.body.evaluador_id;

            const response = await calificacionService.create({
                solicitud_id,
                evaluador_id,
                puntuacion,
                comentario
            });

            if (response.success) {
                return res.status(201).json(response);
            }
            return res.status(400).json(response);
        } catch (error) {
            return res.status(500).json({
                success: false,
                message: error.message
            });
        }
    },

    async getBySolicitud(req, res) {
        try {
            const { solicitud_id } = req.params;
            const evaluador_id = req.user?.id || req.query.evaluador_id;

            const response = await calificacionService.getBySolicitud(solicitud_id, evaluador_id);
            return res.status(200).json(response);
        } catch (error) {
            return res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
};

const sendResults = (success, codOK, codError, result, res) => { return res.status(success ? codOK : codError).json(result); }
const sendError = (res) => { return res.status(500).json({ message: "Error interno en el servidor." }) }

export default controller;