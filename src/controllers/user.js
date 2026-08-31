import userService from '../services/user.js'

const controller = {
    async validate(req, res) {
        try {
            const object = req.body;
            const response = await userService.validate(object);

            return sendResults(response.success, 200, 400, response.existe, res);
        } catch (error) { return sendError(res) }
    },
    async register(req, res) {
        try {
            const object = req.body;
            const response = await userService.register(object);

            return sendResults(response.success, 201, 400, response.id, res);
        } catch (error) { return sendError(res) }  
    },
    async login(req, res) {
        try {
            const object = req.body;
            const response = await userService.login(object);

            return sendResults(response.success, 200, 400, response.user, res);
        } catch (error) { return sendError(res) }
    }
}

const sendResults = (success, codOK, codError, result, res) => { return res.status(success ? codOK : codError).json(result); }
const sendError = (res) => { return res.status(500).json({ message: "Error interno en el servidor." }) }

export default controller;