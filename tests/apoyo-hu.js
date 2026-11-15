import { after, before, beforeEach, mock } from 'node:test';
import { once } from 'node:events';
import bcrypt from 'bcryptjs';
import { Op } from 'sequelize';

const cuenta = {
    full_name: 'Ana Pérez',
    email: 'ana@example.test',
    password: 'Recicla#2026',
    role: 'Usuario'
};
const solicitud = {
    created_by: 1, type: 'Papel', size: 'Mediana', description: 'Papel limpio',
    address: 'Av. Lima 123', day: '15/06/2099', time: '12:00', latitude: -12, longitude: -77
};
const hash = await bcrypt.hash(cuenta.password, 4);
let usuarios, codigos, solicitudes, correos, accesos;

const models = {
    user: {
        async create(datos) {
            // Restricciones de persistencia del modelo user.
            if ([datos.full_name, datos.email, datos.password, datos.role].some(valor => valor == null) ||
                !['Usuario', 'Reciclador'].includes(datos.role) ||
                usuarios.some(usuario => usuario.email === datos.email)) {
                throw new Error('Registro no permitido');
            }
            const usuario = { id: usuarios.length + 1, two_factor_enabled: false, ...datos };
            usuarios.push(usuario);
            return usuario;
        },
        async findOne({ where: { email } }) {
            const usuario = usuarios.find(fila => fila.email === email);
            return usuario ? { ...usuario, get: () => ({ ...usuario }) } : null;
        },
        async findByPk(id) {
            const usuario = usuarios.find(fila => fila.id === id);
            return usuario ? { toJSON: () => ({ ...usuario }) } : null;
        },
        async update(datos, { where: { email } }) {
            const usuario = usuarios.find(fila => fila.email === email);
            Object.assign(usuario, datos);
        }
    },
    verification_code: {
        async create(datos) { codigos.set(datos.user_id, datos); },
        async findOne({ where }) { return codigos.get(where.user_id) ?? null; },
        async destroy({ where }) { codigos.delete(where.user_id); }
    },
    logAccesos: {
        async create(datos) { accesos.push(datos); }
    },
    solicitud: {
        async findOne({ where }) {
            const fila = solicitudes.find(datos => datos.status === where.status &&
                where[Op.or].some(rol => Object.keys(rol).every(campo => datos[campo] === rol[campo])));
            return fila ? { toJSON: () => ({ ...fila }) } : null;
        },
        async create(datos) {
            const fila = { id: solicitudes.length + 1, ...datos };
            solicitudes.push(fila);
            return { toJSON: () => ({ ...fila }) };
        },
        async findAll({ where }) {
            return solicitudes.filter(fila => fila.created_by === Number(where.created_by) &&
                where.status.includes(fila.status));
        }
    }
};

mock.module('../src/config/database.js', {
    defaultExport: {
        transaction: async work => work({}),
        query: async () => {},
        literal: sql => sql
    }
});
mock.module('../src/config/schema.js', { namedExports: { ensureSchema: async () => {} } });
mock.module('../src/models/init-models.js', { defaultExport: () => models });
mock.module('../src/services/email.js', {
    defaultExport: async (to, subject, html) => {
        correos.push({ to, subject, html });
        return true;
    }
});

const { default: app } = await import('../app.js');
const { default: usuariosService } = await import('../src/services/user.js');
const { default: usuariosRepo } = await import('../src/repositories/user.js');
const { default: recojoService } = await import('../src/services/recojo.js');

let server, base;

before(async () => {
    server = app.listen(0, '127.0.0.1');
    await once(server, 'listening');
    base = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
    if (!server?.listening) return;
    await new Promise(resolve => {
        server.close(resolve);
        server.closeAllConnections();
    });
});

beforeEach(() => {
    usuarios = [
        { ...cuenta, id: 1, password: hash, two_factor_enabled: false },
        { ...cuenta, id: 2, email: 'luis@example.test', role: 'Reciclador', password: hash }
    ];
    codigos = new Map();
    solicitudes = [];
    correos = [];
    accesos = [];
});

async function api(method, path, body) {
    const response = await fetch(base + path, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });
    return { status: response.status, data: await response.json() };
}

export { accesos, api, correos, cuenta, models, recojoService, solicitud, solicitudes, usuariosRepo, usuariosService };
