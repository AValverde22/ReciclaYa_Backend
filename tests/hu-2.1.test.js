import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { coordinates } from '../src/services/recojo-rules.js';
import { api, models, recojoService, solicitud, solicitudes } from './apoyo-hu.js';

describe('Caja negra | Publicación de solicitud', () => {
    test('HU-2.1 publica la solicitud y luego permite consultarla', async () => {
        assert.equal((await api('POST', '/solicitud', solicitud)).status, 200);
        const listado = await api('GET', '/solicitud?user_id=1');
        assert.equal(listado.status, 200);
        assert.equal(listado.data.length, 1);
        assert.equal(listado.data[0].type, solicitud.type);
        assert.equal(listado.data[0].address, solicitud.address);
        assert.equal(listado.data[0].day, solicitud.day);
    });

    test('HU-2.1 la solicitud nueva queda en estado Pendiente', { todo: 'La API la registra como Disponible' }, async () => {
        assert.equal((await api('POST', '/solicitud', solicitud)).status, 200);
        const listado = await api('GET', '/solicitud?user_id=1');
        assert.equal(listado.status, 200);
        assert.equal(listado.data[0].status, 'Pendiente');
    });

    test('HU-2.1 rechaza la publicación sin descripción', { todo: 'La API no usa el campo descripción' }, async () => {
        const respuesta = await api('POST', '/solicitud', { ...solicitud, description: '' });
        assert.equal(respuesta.status, 400);
    });

    for (const campo of ['address', 'day', 'time', 'type']) {
        test(`HU-2.1 rechaza publicar sin ${campo}`, async () => {
            const respuesta = await api('POST', '/solicitud', { ...solicitud, [campo]: '' });
            assert.equal(respuesta.status, 400);
            assert.deepEqual((await api('GET', '/solicitud?user_id=1')).data, []);
        });
    }
});

describe('Caja blanca | Publicación de solicitud', () => {
    test('HU-2.1 un reciclador o un usuario con recojo activo no puede publicar', async (t) => {
        const guardar = t.mock.method(models.solicitud, 'create');
        await assert.rejects(() => recojoService.create({ ...solicitud, created_by: 2 }), { status: 403 });
        solicitudes.push({ created_by: 1, status: 'Pendiente' });
        await assert.rejects(() => recojoService.create(solicitud), { status: 409 });
        assert.equal(guardar.mock.callCount(), 0);
    });

    test('HU-2.1 rechaza una fecha inexistente o pasada antes de guardar', async (t) => {
        const guardar = t.mock.method(models.solicitud, 'create');
        for (const day of ['31/02/2099', '01/01/2000']) {
            await assert.rejects(() => recojoService.create({ ...solicitud, day }), { status: 400 });
        }
        assert.equal(guardar.mock.callCount(), 0);
    });
});

describe('Unitaria | Publicación de solicitud', () => {
    test('HU-2.1 coordinates acepta los límites y rechaza valores fuera de rango', () => {
        assert.doesNotThrow(() => coordinates(90, 180));
        assert.doesNotThrow(() => coordinates(-90, -180));
        assert.throws(() => coordinates(90.01, 0), { status: 400 });
        assert.throws(() => coordinates(0, -180.01), { status: 400 });
    });
});
