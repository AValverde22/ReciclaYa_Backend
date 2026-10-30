import userService from '../services/user.js'
import twoFactorService from '../services/two_factor.js'

const controller = {
    async getScore(req, res) {
        try {
            const result = await userService.getScore(req.params.id);
            return res.status(result.success ? 200 : result.status).json(
                result.success ? result.score : {message:result.message}
            );
        } catch (error) { return sendError(res); }
    },
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
    },
    async recover (req, res) {
        try {
            const object = req.body;
            const response = await userService.recover(object);
            
            return sendResults(response.success, 200, 400, null, res);
        } catch (error) { return sendError(res) }
    },
    async compare (req, res) {
        try {
            const object = req.body;
            const response = await userService.compare(object);

            return sendResults(response.success, 200, 400, response.correcto, res);
        } catch (error) { return sendError(res) }
    },
    async reset (req, res) {
        try {
            const object = req.body;
            const response = await userService.reset(object);

            return sendResults(response.success, 200, 400, response.user, res);
        } catch (error) { return sendError(res) }
    },
    async getTwoFactor(req, res) {
        try {
            const result = await twoFactorService.getStatus(req.params.id);
            return res.status(result.success ? 200 : result.status).json(
                result.success ? { enabled: result.enabled } : { message: result.message }
            );
        } catch (error) { return sendError(res); }
    },
    async setTwoFactor(req, res) {
        try {
            const result = await twoFactorService.setStatus(req.params.id, req.body ?? {});
            return res.status(result.success ? 200 : result.status).json(
                result.success ? { result: result.result, enabled: result.enabled } : { message: result.message }
            );
        } catch (error) { return sendError(res); }
    },
    async verifyLogin(req, res) {
        try {
            const response = await twoFactorService.verify(req.body ?? {});
            return res.status(200).json(response);
        } catch (error) { return sendError(res); }
    },
    async resendLoginCode(req, res) {
        try {
            const response = await twoFactorService.resend(req.body ?? {});
            return res.status(200).json(response);
        } catch (error) { return sendError(res); }
    }
}

const sendResults = (success, codOK, codError, result, res) => { return res.status(success ? codOK : codError).json(result); }
const sendError = (res) => { return res.status(500).json({ message: "Error interno en el servidor." }) }

export default controller;
