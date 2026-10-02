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
                var solicitudes = JSON.parse(JSON.stringify(repoResponse, null, 2));
                if(solicitudes.length > 0) {
                    for(let i = 0; i < solicitudes.length; i++){
                        var solicitud = solicitudes[i];

                        const day = solicitud.day.split("-");
                        var brandNewDay = day[2] + "/" + day[1] + "/" + day[0];
                        
                        solicitud = {
                            ... solicitud,
                            day: brandNewDay,
                            full_name: solicitud.created_by_user.full_name,
                            profile_photo_url: solicitud.created_by_user.profile_photo_url,
                            score: parseFloat(solicitud.created_by_user.score)
                        };

                        delete solicitud['created_by_user'];
                        solicitudes[i] = solicitud;
                    }              
                }

                return {
                    success: true,
                    solicitudes : solicitudes,
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