import express from 'express'
import cors from 'cors'
import bodyParser from 'body-parser';

import userRouter from './src/routes/user.js'
import solicitudRouter from './src/routes/solicitud.js';
import logAccesosRouter from './src/routes/logAccesos.js';
import logsRouter from './src/routes/logAccesos.js';
import { ensureSchema } from './src/config/schema.js';

const app = express();
app.use(bodyParser.json())
app.use(cors())
app.use(async (req, res, next) => {
    try {
        await ensureSchema();
        next();
    } catch (error) {
        console.error('No se pudo preparar la base de datos:', error.original?.message || error.message);
        res.status(503).json({ message: 'El servicio se está preparando. Vuelve a intentarlo.' });
    }
});

app.get('/', (req, resp) => {
    return resp.json({
        mensaje: "Hola mundo",
        code: 200
    })
})

app.use('/user', userRouter);
app.use('/solicitud', solicitudRouter);
app.use('/accesos', logAccesosRouter);
app.use('/logs', logsRouter);
export default app;
