import { Sequelize } from "sequelize"
import dotenv from 'dotenv'
import pg from 'pg'

dotenv.config();

const sequelize = new Sequelize(process.env.DB_STRING, {
    dialect: 'postgres',
    dialectModule: pg,
    timezone: '-05:00',
    dialectOptions: {
        ssl: {
            require: true,
            rejectUnauthorized: false
        }
    }
});

export default sequelize;