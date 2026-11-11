import sequelize from './database.js';

let schemaPromise;

/**
 * Initializes missing tables once per process. The PostgreSQL advisory lock also
 * serializes cold starts from different serverless instances.
 */
export function ensureSchema() {
    if (!schemaPromise) {
        schemaPromise = sequelize.transaction(async transaction => {
            await sequelize.query('SELECT pg_advisory_xact_lock(72651, 1)', { transaction });
            await sequelize.sync({ force: false, transaction });
        }).catch(error => {
            schemaPromise = null;
            throw error;
        });
    }
    return schemaPromise;
}

