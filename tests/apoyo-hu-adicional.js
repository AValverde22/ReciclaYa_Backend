import { after, before, beforeEach, mock } from 'node:test';
import { once } from 'node:events';
import bcrypt from 'bcryptjs';
import { Op } from 'sequelize';

export const password = 'Recicla#2026';
export const email = 'ana@example.test';
export const correos = [];
const hash = await bcrypt.hash(password, 4);

function coincide(fila, filtro) {
    return Reflect.ownKeys(filtro).every(campo => {
        const valor = filtro[campo];
        const actual = fila[campo];
        if (campo === Op.or) return valor.some(opcion => coincide(fila, opcion));
        if (campo === Op.and) return valor.every(opcion => coincide(fila, opcion));
        if (campo === 'emailNormalizado') return fila.email.toLowerCase() === valor;
        if (Array.isArray(valor)) return valor.includes(actual);
        if (valor && typeof valor === 'object') {
            if (Op.ne in valor) return actual !== valor[Op.ne];
            if (Op.lt in valor) return actual < valor[Op.lt];
            if (Op.lte in valor) return actual <= valor[Op.lte];
            if (Op.gte in valor) {
                const limite = typeof valor[Op.gte] === 'string' && campo === 'day'
                    ? new Date(valor[Op.gte]).toISOString().slice(0, 10)
                    : valor[Op.gte];
                return actual >= limite;
            }
            throw new Error('Filtro no implementado en la prueba');
        }
        // PostgreSQL compara los parámetros numéricos de las rutas con columnas enteras.
        if (['id', 'created_by', 'accepted_by', 'user_id', 'solicitud_id', 'evaluador_id'].includes(campo)
            && typeof actual === 'number' && typeof valor === 'string' && /^\d+$/.test(valor)) {
            return actual === Number(valor);
        }
        return actual === valor;
    });
}

function tabla(valoresIniciales = () => []) {
    let filas = [];
    let secuencia = 0;

    function proyectar(fila, opciones) {
        const datos = opciones.attributes
            ? Object.fromEntries(opciones.attributes.map(campo => [campo, fila[campo]]))
            : { ...fila };
        for (const relacion of opciones.include ?? []) {
            const incluida = relacion.model.relacionada(relacion.as, fila);
            if (relacion.required && (!incluida || !coincide(incluida, relacion.where ?? {}))) return null;
            datos[relacion.as] = incluida ? relacion.model.proyectar(incluida, relacion) : null;
        }
        if (opciones.raw) return datos;
        return {
            ...datos,
            toJSON: () => datos,
            get: () => datos,
            async update(cambios) {
                Object.assign(fila, cambios);
                Object.assign(datos, cambios);
                Object.assign(this, cambios);
            }
        };
    }

    function filtrar({ where = {}, order = [] }) {
        return filas.filter(fila => coincide(fila, where)).sort((a, b) => {
            for (const [campo, sentido] of order.filter(item => Array.isArray(item))) {
                if (a[campo] > b[campo]) return sentido === 'DESC' ? -1 : 1;
                if (a[campo] < b[campo]) return sentido === 'DESC' ? 1 : -1;
            }
            return 0;
        });
    }

    return {
        proyectar,
        reset() {
            filas = valoresIniciales();
            secuencia = Math.max(0, ...filas.map(fila => fila.id ?? 0));
        },
        relacionada(alias, fila) {
            if (alias === 'profile_change') return filas.find(item => item.user_id === fila.id);
            const claves = { created_by_user: 'created_by', accepted_by_user: 'accepted_by',
                evaluador: 'evaluador_id', log_acceso: 'logAccesos_id' };
            const clave = claves[alias];
            return filas.find(item => item.id === fila[clave]);
        },
        async findAll(opciones = {}) {
            return filtrar(opciones).map(fila => proyectar(fila, opciones)).filter(Boolean).slice(0, opciones.limit ?? Infinity);
        },
        async findOne(opciones = {}) {
            const campo = opciones.attributes?.[0];
            if (Array.isArray(campo) && campo[1] === 'average') {
                const datos = filtrar(opciones);
                return { average: datos.reduce((total, fila) => total + fila.puntuacion, 0) / datos.length };
            }
            return (await this.findAll({ ...opciones, limit: 1 }))[0] ?? null;
        },
        async findByPk(id, opciones = {}) { return this.findOne({ ...opciones, where: { id: Number(id) } }); },
        async findOrCreate({ where, defaults }) {
            const encontrado = await this.findOne({ where });
            return encontrado ? [encontrado, false] : [await this.create(defaults), true];
        },
        async create(datos) {
            const fila = { id: ++secuencia, active: true, created_at: new Date(), ...datos };
            filas.push(fila);
            return proyectar(fila, {});
        },
        async update(cambios, opciones) {
            const encontrados = filtrar(opciones);
            for (const fila of encontrados) {
                const datos = { ...cambios };
                // El repositorio 2FA usa Sequelize.literal para incrementar el contador.
                if (datos.attempts?.val === 'attempts + 1') datos.attempts = fila.attempts + 1;
                Object.assign(fila, datos);
            }
            return [encontrados.length];
        },
        async destroy(opciones) {
            const encontrados = new Set(filtrar(opciones));
            filas = filas.filter(fila => !encontrados.has(fila));
            return encontrados.size;
        },
        async sum(campo, opciones) { return filtrar(opciones).reduce((total, fila) => total + fila[campo], 0); },
        async count(opciones) { return filtrar(opciones).length; }
    };
}

export const modelos = {
    user: tabla(() => [
        { id: 1, full_name: 'Ana Pérez', email, password: hash, role: 'Usuario', score: 5, two_factor_enabled: false },
        { id: 2, full_name: 'Luis Ramos', email: 'luis@example.test', password: hash, role: 'Reciclador', score: 5 },
        { id: 3, full_name: 'Eva Luna', email: 'eva@example.test', password: hash, role: 'Reciclador', score: 5 },
        { id: 4, full_name: 'Mario Díaz', email: 'mario@example.test', password: hash, role: 'Usuario', score: 5 }
    ]),
    solicitud: tabla(),
    logAccesos: tabla(),
    reportesActividad: tabla(),
    profileChange: tabla(),
    verification_code: tabla(),
    two_factor_challenge: tabla(),
    calificacion: tabla(),
    puntosMovimiento: tabla(),
    beneficio: tabla(),
    canje: tabla()
};

mock.module('../src/config/database.js', { defaultExport: {
    transaction: async trabajo => trabajo({ LOCK: { UPDATE: 'UPDATE' } }),
    query: async () => {},
    literal: sql => sql,
    col: nombre => nombre,
    fn: (nombre, campo) => ({ nombre, campo }),
    where: (expresion, valor) => {
        if (expresion.nombre !== 'lower' || expresion.campo !== 'email') throw new Error('Expresión no implementada');
        return { emailNormalizado: valor };
    }
} });
mock.module('../src/config/schema.js', { namedExports: { ensureSchema: async () => {} } });
mock.module('../src/models/init-models.js', { defaultExport: () => modelos });
mock.module('../src/services/email.js', { defaultExport: async (to, subject, html) => {
    correos.push({ to, subject, html });
    return true;
} });

const { default: app } = await import('../app.js');
let servidor;

before(async () => {
    servidor = app.listen(0, '127.0.0.1');
    await once(servidor, 'listening');
});

after(async () => {
    if (servidor?.listening) {
        await new Promise(resolve => {
            servidor.close(resolve);
            servidor.closeAllConnections();
        });
    }
});

beforeEach(() => {
    for (const modelo of Object.values(modelos)) modelo.reset();
    correos.length = 0;
});

export async function api(method, path, body) {
    const respuesta = await fetch('http://127.0.0.1:' + servidor.address().port + path, {
        method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
    });
    return { status: respuesta.status, data: await respuesta.json() };
}

export const camposSolicitud = {
    type: 'Papel', size: 'Mediana', day: '15/06/2099', time: '12:00',
    address: 'Av. Lima 123', latitude: -12, longitude: -77
};

export function sembrarSolicitud(cambios = {}) {
    return modelos.solicitud.create({
        ...camposSolicitud, day: '2099-06-15', created_by: 1, accepted_by: null,
        status: 'Disponible', user_confirmed: false, recycler_confirmed: false, ...cambios
    });
}

export async function iniciarReto() {
    const respuesta = await api('POST', '/user/login', { email, password });
    return respuesta.data.challenge;
}

export function ultimoCodigo() {
    return correos.at(-1)?.html.match(/<b>(\d{6})<\/b>/)?.[1];
}