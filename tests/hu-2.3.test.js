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