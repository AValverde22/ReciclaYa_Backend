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
test('HU-2.5 | Caja blanca: si el reciclador tiene un recojo activo, no cambia la asignación', async (t) => {
    const { default: servicio } = await import('../src/services/recojo.js');
    const { default: repositorio } = await import('../src/repositories/recojo.js');
    const guardar = t.mock.fn();
    const consultarConflicto = t.mock.fn(async () => ({ id: 8 }));
    t.mock.method(repositorio, 'atomic', async trabajo => trabajo({
        findUser: async id => ({ id, role: 'Reciclador' }),
        findRequest: async () => ({ id: 7, created_by: 1, status: 'Disponible', day: '2099-06-15', time: '12:00' }),
        findAcceptanceConflict: consultarConflicto,
        updateRequest: guardar
    }));
    await assert.rejects(() => servicio.accept(7, 2), { status: 409 });
    assert.deepEqual(consultarConflicto.mock.calls[0].arguments, [2, 1]);
    assert.equal(guardar.mock.callCount(), 0);
});
