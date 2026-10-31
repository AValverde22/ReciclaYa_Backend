import repository from '../repositories/logAccesos.js';

const services = {

    async registrar(userId, datos = {}) {
        try {
            if (!Number.isInteger(Number(userId)) || Number(userId) <= 0) {
                throw new Error('El ID del usuario no es válido');
            }

            const latitud = datos.latitud;
            const longitud = datos.longitud;

            if (
                latitud != null &&
                (!Number.isFinite(Number(latitud)) ||
                    Number(latitud) < -90 ||
                    Number(latitud) > 90)
            ) {
                throw new Error('La latitud no es válida');
            }

            if (
                longitud != null &&
                (!Number.isFinite(Number(longitud)) ||
                    Number(longitud) < -180 ||
                    Number(longitud) > 180)
            ) {
                throw new Error('La longitud no es válida');
            }

            const registro = {
                user_id: Number(userId),
                direccion_ip: datos.direccion_ip ?? null,
                app_version: datos.app_version ?? null,
                ciudad: datos.ciudad ?? null,
                pais: datos.pais ?? null,
                latitud: latitud == null ? null : Number(latitud),
                longitud: longitud == null ? null : Number(longitud),
                estado: datos.estado ?? 'Autorizado',
                tipo_actividad: datos.tipo_actividad ?? 'Inicio de sesión',
                dispositivo: datos.dispositivo ?? null
            };

            return await repository.registrar(registro);

        } catch (error) {
            throw error;
        }
    },

    async obtenerHistorial(userId, tipo = null) {
        try {
            const id = Number(userId);

            if (!Number.isInteger(id) || id <= 0) {
                throw new Error('El ID del usuario no es válido');
            }

            return await repository.obtenerHistorial(id, 20, tipo);

        } catch (error) {
            throw error;
        }
    },

    async obtenerDetalle(registroId, userId) {
        try {
            const id = Number(registroId);
            const usuarioId = Number(userId);

            if (!Number.isInteger(id) || id <= 0) {
                throw new Error('El ID del acceso no es válido');
            }

            if (!Number.isInteger(usuarioId) || usuarioId <= 0) {
                throw new Error('El ID del usuario no es válido');
            }

            const registro = await repository.obtenerPorId(
                id,
                usuarioId
            );

            if (!registro) {
                return null;
            }

            return registro;

        } catch (error) {
            throw error;
        }
    }
};

export default services;