import repository from '../repositories/reportesActividad.js';

const service = {
    // Registrar un reporte de actividad sospechosa.
    async registrar(userId, datos = {}) {
        const usuarioId = Number(userId);
        const logId = Number(datos.logAccesos_id);

        if (!Number.isInteger(usuarioId) || usuarioId <= 0) {
            throw new Error('El ID del usuario no es válido');
        }

        if (!Number.isInteger(logId) || logId <= 0) {
            throw new Error('El ID del registro de acceso no es válido');
        }

        const acceso = await repository.verificarUsuario(logId, usuarioId);

        if (!acceso) {
            throw new Error('El registro de acceso no existe o no pertenece al usuario');
        }

        // Comprobar que no exista un reporte previo de ese log
        const reporteExistente = await repository.verificarReporte(logId, usuarioId);
        if (reporteExistente) {
            throw new Error('Ya has reportado este registro de acceso');
        }

        const descripcion = datos.descripcion?.trim() || null;

        if (descripcion && descripcion.length > 2000) {
            throw new Error('La descripción no puede superar los 2000 caracteres');
        }

        return await repository.registrar({
            logAccesos_id: logId,
            user_id: usuarioId,
            descripcion,
            estado: 'Registrado'
        });
    },

    async obtenerPorUsuario(userId) {
        const usuarioId = Number(userId);

        if (!Number.isInteger(usuarioId) || usuarioId <= 0) {
            throw new Error('El ID del usuario no es válido');
        }

        return await repository.buscarReportesUser(usuarioId);
    },

    async obtenerDetalle(id, userId) {
        const reporteId = Number(id);
        const usuarioId = Number(userId);

        if (!Number.isInteger(reporteId) || reporteId <= 0) {
            throw new Error('El ID del reporte no es válido');
        }

        if (!Number.isInteger(usuarioId) || usuarioId <= 0) {
            throw new Error('El ID del usuario no es válido');
        }

        const reporte = await repository.buscarPorIdUser(reporteId,usuarioId);

        if (!reporte) {
            throw new Error('No se encontró el reporte solicitado');
        }

        return reporte;
    },

    async buscarTodos() {
        return await repository.buscarTodos();
    }
};

export default service;