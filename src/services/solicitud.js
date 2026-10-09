import repository from "../repositories/solicitud.js";
import { Op } from 'sequelize'

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
    async getByCreator(id) {
        try {
            const repoResponse = await repository.getByCreator(id);
            if(repoResponse !== null) {
                const rawSolicitudes = JSON.parse(JSON.stringify(repoResponse, null, 2));
                const solicitudes = rawSolicitudes.map(solicitud => {
                    const day = solicitud.day.split("-");
                    var brandNewDay = day[2] + "/" + day[1] + "/" + day[0];
                
                    return {
                        ... solicitud,
                        day: brandNewDay,
                        user: solicitud.accepted_by_user,
                        accepted_by_user: undefined
                    };
                });   
                
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
    },
    async getAceptadas(id) {
        try {
            const repoResponse = await repository.getByAccepter(id);
            if(repoResponse !== null) {
                const rawSolicitudes = JSON.parse(JSON.stringify(repoResponse, null, 2));
                const solicitudes = rawSolicitudes.map(solicitud => {
                    const day = solicitud.day.split("-");
                    var brandNewDay = day[2] + "/" + day[1] + "/" + day[0];
                
                    return {
                        ... solicitud,
                        day: brandNewDay,
                        user: solicitud.created_by_user,
                        created_by_user: undefined
                    };
                });   
                
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
        } catch(error) { 
            return {
                success: false,
                solicitudes: null,
                message: error.message
            }
        }
    },
    async getDisponibles(query) {
        try {
            var solicitudQuery = { status: 'Disponible' };
            if(query.type) solicitudQuery.type = query.type;
            if(query.day) {
                const splitDay = query.day.split("/");
                const brandNewDay = splitDay[1] + "/" + splitDay[0] + "/" + splitDay[2];

                solicitudQuery.day = { [Op.gte]: brandNewDay }
            }
            if(query.time) solicitudQuery.time = { [Op.gte]: query.time }

            var userQuery = {}
            if(query.score) userQuery.score = { [Op.gte]: parseFloat(query.score) }

            const soliResponse = await repository.getDisponibles(solicitudQuery, userQuery);
            var rawSolicitudes =  JSON.parse(JSON.stringify(soliResponse, null, 2));
            const solicitudes = rawSolicitudes.map(solicitud => {
                const day = solicitud.day.split("-");
                    var brandNewDay = day[2] + "/" + day[1] + "/" + day[0];
                
                    return {
                        ... solicitud,
                        day: brandNewDay,
                        user: solicitud.created_by_user,
                        created_by_user: undefined
                    };
            })
            return {
                success: true,
                solicitudes: solicitudes,
                message: "Solicitudes encontradas.",
            }
            
        } catch(error) { 
            console.log(error);
            return {
                success: false,
                solicitudes: null,
                message: error.message,
            }
        }   
    },
    async update(id, objSolicitud) {
        try {
            const { id: _, ...cleanObject } = objSolicitud;

            const splitDay = cleanObject.day.split("/");
            cleanObject.day = splitDay[1] + "/" + splitDay[0] + "/" + splitDay[2];
            const repoResponse = await repository.update(id, cleanObject);

            if(repoResponse) 
                return {
                    success: true,
                    message: "Solicitud actualizada"
                }

            return {
                success: false,
                message: "No se pudo actualizar la solicitud"
            }
            
        } catch (error) {
            return {
                success: false,
                message: error.message
            }
        }
    }, 
    async cancel(id) {
        try {
            const repoResponse = await repository.cancel(id);
                        console.log(repoResponse)

            if(repoResponse)
                return {
                    success: true,
                    message: "Solicitud Actualizada"
                }

            return {
                success: false,
                message: "No se puedo cancelar la solicitud"
            }

        } catch (error) {
            return {
                success: false,
                message: error.message
            }
        }
    },
    async accept(solicitudID, userID) {
        try {
            const estado = await repository.verificarEstado(solicitudID);
            if(estado.status !== 'Disponible') {
                return {
                    success: true,
                    message: "Solicitud ya aceptada.",
                    aceptado: false
                }
            }

            const soliResponse = await repository.accept(solicitudID, userID);
            if(soliResponse) {
                return {
                    success: true,
                    message: "Solicitud aceptada correctamente.",
                    aceptado: true
                }
            } 
            return {
                success: false,
                message: "Error",
                aceptado: false
            }
        } catch (error) {
            return {
                success: false,
                aceptado: false,
                message: error.message
            };
        }
    }
}

export default services;