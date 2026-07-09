import repository from '../repositories/user.js'

const login = async (req, res) => {
    const object = req.body;
    const idObjectRes = await repository.login(object);

    return sendResults(idObjectRes, res, "Error al encontrar usuario.");
}

const validate = async (req, res) => {
    const object = req.body;
    const booleanObjectRes = await repository.validate(object);

    return sendResults(booleanObjectRes, res, "Error al validar correo.");
}

const register = async (req, res) => {
    const object = req.body;
    const idObjectRes = await repository.register(object);

    return sendResults(idObjectRes, res, )
}

const sendResults = (result, res, message) => {
    if (result != null) return res.status(200).json(result);
    else return res.status(500).json({ message });
}

const controller = { login, validate, register };
export default controller;
