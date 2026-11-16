import { test } from 'node:test';
import assert from 'node:assert/strict';
import { api, sembrarSolicitud } from './apoyo-hu-adicional.js';

test('HU-2.3 cancela una solicitud disponible y conserva su registro histórico', async () => {
    const { id } = await sembrarSolicitud();
    assert.equal((await api('PATCH', `/solicitud/${id}/cancel?user_id=1`)).status, 200);
    const { data } = await api('GET', '/solicitud?user_id=1');
    assert.equal(data[0].id, id);
    assert.equal(data[0].status, 'Cancelada');
    assert.ok(Number.isFinite(Date.parse(data[0].closed_at)));
    assert.deepEqual((await api('GET', '/solicitud/disponibles')).data, []);
});

test('HU-2.3 rechaza la cancelación normal si la solicitud ya fue aceptada', async () => {
    const { id } = await sembrarSolicitud({ status: 'Pendiente', accepted_by: 2 });
    assert.equal((await api('PATCH', `/solicitud/${id}/cancel?user_id=1`)).status, 409);
    assert.equal((await api('GET', '/solicitud?user_id=1')).data[0].status, 'Pendiente');
});
test('HU-2.3 | Caja blanca: la cancelación registra el estado y la fecha de cierre', async (t) => {
    const { default: servicio } = await import('../src/services/recojo.js');
    const { default: repositorio } = await import('../src/repositories/recojo.js');
    const guardar = t.mock.fn();
    t.mock.method(repositorio, 'atomic', async trabajo => trabajo({
        findUser: async id => ({ id, role: 'Usuario' }),
        findRequest: async id => ({ id, created_by: 1, status: 'Disponible' }),
        findActive: async () => null,
        updateRequest: guardar
    }));
    await servicio.cancel(7, 1);
    assert.equal(guardar.mock.callCount(), 1);
    const [id, cambios] = guardar.mock.calls[0].arguments;
    assert.equal(id, 7);
    assert.equal(cambios.status, 'Cancelada');
    assert.ok(cambios.closed_at instanceof Date);
});
