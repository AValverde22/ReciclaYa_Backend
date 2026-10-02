import solicitud from "../models/solicitud.js";
import repository from "../repositories/solicitud.js";

const services = {
    async create(objSolicitud) {
        try {
            const splitDay = objSolicitud.day.split("/");
            const brandNewDay = splitDay[1] + "/" + splitDay[0] + "/" + splitDay[2];

            const newSolicitud = {
                ...objSolicitud,
                day: brandNewDay
            };

            const repoResponse = await repository.create(newSolicitud);

            if(repoResponse !== null) {
                return {
                    success: true,
                    message: "Solicitud creada."
                }
            } 

            return {
                success: false,
                message: "Error al crear solicitud."
            }
        } catch (error) {
            return {
                success: false,
                message: error.message
            }
        }        
    },
    async get(id) {
        try {
            const repoResponse = await repository.get(id);

            if(repoResponse !== null) {
                return {
                    success: true,
                    solicitudes : repoResponse,
                    message: "Solicitudes obtenidas."
                }
            }

            return {
                success: false,
                solicitudes: null,
                message: "Error al obtener solicitudes."
            }
        } catch (error) {
            return {
                success: false,
                solicitudes: null,
                message: error.message
            }
        }
    }
}

export default services;