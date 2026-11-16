import { test } from 'node:test';
import assert from 'node:assert/strict';
import { api, camposSolicitud, sembrarSolicitud } from './apoyo-hu-adicional.js';

test('HU-2.6 devuelve las solicitudes del usuario, con fecha, dirección y estado', async () => {
    const estados = ['Disponible', 'Pendiente', 'Finalizada', 'Cancelada'];
    for (const status of estados) await sembrarSolicitud({ status });
    await sembrarSolicitud({ created_by: 4 });
    const { status, data } = await api('GET', '/solicitud?user_id=1');
    assert.equal(status, 200);
    assert.deepEqual(data.map(item => item.status).sort(), estados.sort());
    for (const item of data) {
        assert.equal(item.type, camposSolicitud.type);
        assert.equal(item.day, camposSolicitud.day);
        assert.equal(item.address, camposSolicitud.address);
    }
});

test('HU-2.6 bloquea edición y cancelación en solicitudes cerradas', async () => {
    for (const status of ['Finalizada', 'Cancelada']) {
        const { id } = await sembrarSolicitud({ status });
        assert.equal((await api('PATCH', `/solicitud/${id}?user_id=1`, camposSolicitud)).status, 409);
        assert.equal((await api('PATCH', `/solicitud/${id}/cancel?user_id=1`)).status, 409);
        const listado = await api('GET', '/solicitud?user_id=1');
        assert.equal(listado.data.find(item => item.id === id).status, status);
    }
});