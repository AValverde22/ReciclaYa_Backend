import solicitudService from "../services/solicitud.js";

const controller = {
    async create(req, res) {
        try {
            const object = req.body;
            const response = await solicitudService.create(object);

            return sendResults(response.success, 200, 400, null, res);
        } catch (error) { return sendError(res); }
    },
    async get(req, res) {
        try {
            const id = req.query.user_id;
            const response = await solicitudService.getByCreator(id ? id : -1);

            return sendResults(response.success, 200, 400, response.solicitudes, res);

        } catch (error) { return sendError(res); }
    },
    async getAceptadas(req, res) {
        try {
            const id = req.query.user_id;
            const response = await solicitudService.getAceptadas(id);

            return sendResults(response.success, 200, 400, response.solicitudes, res);
        } catch (error) { return sendError(res); }
    },
    async getDisponibles(req, res) {
        try {
            const query = req.query;
            const response = await solicitudService.getDisponibles(query);

            return sendResults(response.success, 200, 400, response.solicitudes, res);
        } catch (error) { console.log(error); return sendError(res); }
    },
    async update(req, res) {
        try {
            const id = req.params.id;
            const object = req.body;
            const response = await solicitudService.update(id, object);

            return sendResults(response.success, 200, 400, null, res);
        } catch (error) {console.log(error);  return sendError(res); }
    },
    async cancel(req, res) {
        try {
            const id = req.params.id;
            const response = await solicitudService.cancel(id);
            
            return sendResults(response.success, 200, 400, null, res);
        } catch (error) {console.log(error);  return sendError(res); }
    },
    async accept(req, res) {
        try {
            const solicitudID = req.params.id;
            const userID = req.query.user_id;
            const response = await solicitudService.accept(solicitudID, userID);
            
            return sendResults(response.success, 200, 400, response.aceptado, res);
        } catch (error) {console.log(error);  return sendError(res); }
    }
}

const sendResults = (success, codOk, codError, result, res) => { return res.status(success ? codOk : codError).json(result); }
const sendError = (res) => { return res.status(500).json({message: "Error interno en el servidor" }) }

export default controller;