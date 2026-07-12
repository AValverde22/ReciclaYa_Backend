import repository from '../repositories/user.js'
import bcrypt from 'bcryptjs';

const login = async (req, res) => {
    const object = req.body;
    const objectRes = await repository.login(object);

    if(objectRes != null) {
        if(objectRes.id == 0) return res.status(200).json({"id": 0, "full_name": "", "email": "", "role": ""});
        else {
            if(bcrypt.compare(req.body.password, objectRes.password)) return res.status(200).json(
                {
                    "id": objectRes.id,
                    "full_name": objectRes.full_name,
                    "email": objectRes.email,
                    "role": objectRes.role
                }
            );
            else return res.status(200).json( {"id": 0, "full_name": "", "email": "", "role": ""});
        }
    } else return res.status(500).json({ "message": "Error al encontrar usuario." });
}

const validate = async (req, res) => {
    const object = req.body;

    const booleanObjectRes = await repository.validate(object);
    return sendResults(booleanObjectRes, res, "Error al validar correo.");
}

const register = async (req, res) => {
    const object = req.body;

    const salt = await bcrypt.genSalt(8);
    req.body.password = await bcrypt.hash(req.body.password, 8);

    const idObjectRes = await repository.register(object);
    return sendResults(idObjectRes, res, )
}

const sendResults = (result, res, message) => {
    if (result != null) return res.status(200).json(result);
    else return res.status(500).json({ message });
}

const controller = { login, validate, register };
export default controller;
