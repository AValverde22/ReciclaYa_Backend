import repository from '../repositories/calificacion.js';

const services = {
    async create(objCalificacion) {
        try {
            const { solicitud_id, evaluador_id, puntuacion, comentario } = objCalificacion;
            const scoreInt = Number(puntuacion);
            if (!Number.isInteger(scoreInt) || scoreInt < 1 || scoreInt > 5) {
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

            if (solicitud.status !== 'Finalizada' || !solicitud.user_confirmed || !solicitud.recycler_confirmed) {
                return {
                    success: false,
                    message: "Solo se pueden calificar recojos finalizados."
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
                    message: "La calificación ya fue registrada."
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

            const nuevoScore = await repository.actualizarScoreEvaluado(evaluado_id);

            return {
                success: true,
                message: "Calificación registrada correctamente.",
                data: repoResponse,
                nuevoScore
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
    },
    async getReputation(value) {
        if (!/^[1-9]\d*$/.test(String(value)) || !Number.isSafeInteger(Number(value)))
            return { success: false, status: 400, message: 'Identificador inválido.' };
        try {
            const reputation = await repository.getReputation(Number(value));
            return reputation
                ? { success: true, reputation }
                : { success: false, status: 404, message: 'Usuario no encontrado.' };
        } catch (error) {
            return { success: false, status: 500, message: error.message };
        }
    }
};

export default services;
