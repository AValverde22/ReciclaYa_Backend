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
test('HU-2.6 | Unitaria: el servicio adapta la fecha y el reciclador asignado', async (t) => {
    const { default: servicio } = await import('../src/services/solicitud.js');
    const { default: repositorio } = await import('../src/repositories/solicitud.js');
    const reciclador = { id: 2, full_name: 'Luis Ramos' };
    const buscar = t.mock.method(repositorio, 'getByCreator', async () => [{
        id: 7, day: '2099-06-15', status: 'Pendiente', accepted_by_user: reciclador
    }]);
    const respuesta = await servicio.getByCreator(1);
    assert.equal(respuesta.success, true);
    assert.equal(buscar.mock.callCount(), 1);
    assert.deepEqual(buscar.mock.calls[0].arguments, [1]);
    assert.equal(respuesta.solicitudes[0].day, '15/06/2099');
    assert.deepEqual(respuesta.solicitudes[0].user, reciclador);
});