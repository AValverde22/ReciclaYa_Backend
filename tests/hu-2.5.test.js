import { test } from 'node:test';
import assert from 'node:assert/strict';
import { api, sembrarSolicitud } from './apoyo-hu-adicional.js';

test('HU-2.5 asigna el recojo al reciclador y lo muestra en su listado', async () => {
    const { id } = await sembrarSolicitud();
    assert.deepEqual(await api('PATCH', `/solicitud/${id}/accept?user_id=2`), { status: 200, data: true });
    const activo = await api('GET', '/solicitud/activa?user_id=2');
    assert.equal(activo.data.solicitud.status, 'Pendiente');
    assert.equal(activo.data.solicitud.accepted_by, 2);
    const listado = await api('GET', '/solicitud/reciclador?user_id=2');
    assert.equal(listado.status, 200);
    assert.deepEqual(listado.data.map(item => item.id), [id]);
    assert.deepEqual((await api('GET', '/solicitud/reciclador?user_id=3')).data, []);
});

test('HU-2.5 rechaza una segunda aceptación y conserva la asignación original', async () => {
    const { id } = await sembrarSolicitud({ status: 'Pendiente', accepted_by: 2 });
    const conflicto = await api('PATCH', `/solicitud/${id}/accept?user_id=3`);
    assert.equal(conflicto.status, 409);
    assert.match(conflicto.data.message, /ya no se encuentra disponible/i);
    assert.equal((await api('GET', '/solicitud/activa?user_id=2')).data.solicitud.accepted_by, 2);
});
