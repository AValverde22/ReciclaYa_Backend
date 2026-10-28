import app from './app.js'
import sequelize from './src/config/database.js'
import { startExpirationTask, stopExpirationTask } from './src/repositories/solicitud.js'

async function main() {
    try {
        const init = process.argv[2];

        if (init) await sequelize.sync({ force: true });
        else await sequelize.sync({ force: false });
        await startExpirationTask();

        console.log('Base de datos sincronizada.');
        
        const port = process.env.PORT || 3005;
        app.listen(port, () => {console.log('El servidor está corriendo en el puerto: ' + port)});

    } catch (error) {
        console.error('No se pudo iniciar el backend:', error.original?.message || error.message);
        if (error.original?.detail) console.error(error.original.detail);
        process.exitCode = 1;
        await stopExpirationTask();
        await sequelize.close();
    }
}

main();
