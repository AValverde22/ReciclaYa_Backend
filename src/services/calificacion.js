import repository from '../repositories/calificacion.js';

const services = {
    async create(objCalificacion) {
        try {
            const { solicitud_id, evaluador_id, puntuacion, comentario } = objCalificacion;
            const scoreInt = parseInt(puntuacion, 10);
            if (isNaN(scoreInt) || scoreInt < 1 || scoreInt > 5) {
                return {
                    success: false,
                    message: "La puntuación debe ser un número entero entre 1 y 5."
                };
            }

            const solicitud = await repository.buscarInformacionSolicitud(solicitud_id);
            if (!solicitud) {
                return {
                    success: false,
                    message: "La solicitud no existe."
                };
            }

            if (solicitud.status !== 'Finalizada') {
                return {
                    success: false,
                    message: "Solo se pueden calificar solicitudes finalizadas."
                };
            }

            let evaluado_id = null;
            const evalr_id = parseInt(evaluador_id, 10);
            if (solicitud.created_by === evalr_id) {
                evaluado_id = solicitud.accepted_by;
            } else if (solicitud.accepted_by === evalr_id) {
                evaluado_id = solicitud.created_by; 
            } else {    
                return {
                    success: false,
                    message: "El usuario no estuvo involucrado en esta solicitud."
                };
            }

            if (evalr_id === evaluado_id) {
                return {
                    success: false,
                    message: "El usuario no puede calificarse a si mismo."
                };
            }

            const existeCalificacion = await repository.encontrarSolicitudEvaluador(solicitud_id, evalr_id);
            if (existeCalificacion) {
                return {    
                    success: false,
                    message: "Ya se ha registrado una calificación para esta solicitud."
                };
            }

            const newCalificacion = {
                solicitud_id,
                evaluador_id,
                evaluado_id,
                puntuacion: scoreInt,
                comentario: comentario || null
            };

            const repoResponse = await repository.create(newCalificacion);
            if (!repoResponse) {
                return {
                    success: false,
                    message: "Error al guardar la calificación."
                };
            }

            const repo = await repository.actualizarScoreEvaluado(evaluado_id);
            if (!repo) {
                return {
                    success: false,
                    message: "Error al actualizar calificación."
                };
            }

            return {
                success: true,
                message: "Calificación registrada con éxito.",
                data: repoResponse,
                nuevoScore: nuevoScore
            };

        } catch (error) {
            return {
                success: false,
                message: error.message
            };
        }
    },

    async getBySolicitud(solicitud_id, evaluador_id) {
        try {
            const calificacion = await repository.encontrarSolicitudEvaluador(solicitud_id, evaluador_id);
            return {
                success: true,
                haCalificado: calificacion !== null,
                calificacion: calificacion || null,
                message: calificacion ? "Calificación encontrada." : "No se ha calificado aún."
            };
        } catch (error) {
            return {
                success: false,
                haCalificado: false,
                calificacion: null,
                message: error.message
            };
        }
    }
};

export default services;