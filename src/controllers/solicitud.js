import solicitudService from "../services/solicitud.js";

const controller = {
    async create(req, res) {
        try {
            const object = req.body;
            const response = await solicitudService.create(object);

            return sendResults(response.success, 200, 400, null, res);
        } catch (error) { return sendError(res); }
    }
}

const sendResults = (success, codOk, codError, result, res) => { return res.status(success ? codOk : codError).json(result); }
const sendError = (res) => { return res.status(500).json({message: "Error interno en el servidor" }) }

export default controller;