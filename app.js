import express from 'express'
import cors from 'cors'
import bodyParser from 'body-parser';

import userRouter from './src/routes/user.js'
import solicitudRouter from './src/routes/solicitud.js';

const app = express();
app.use(bodyParser.json())
app.use(cors())

app.get('/', (req, resp) => {
    return resp.json({
        mensaje: "Hola mundo",
        code: 200
    })
})

app.use('/user', userRouter);
app.use('/solicitud', solicitudRouter)
export default app;