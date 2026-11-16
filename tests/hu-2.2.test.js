import { test } from 'node:test';
import assert from 'node:assert/strict';
import { api, camposSolicitud, sembrarSolicitud } from './apoyo-hu-adicional.js';

test('HU-2.2 guarda la edición y devuelve los datos actualizados al consultar', async () => {
    const { id } = await sembrarSolicitud();
    const antes = await api('GET', '/solicitud?user_id=1');
    assert.equal(antes.data[0].address, camposSolicitud.address);
    const cambios = { ...camposSolicitud, address: 'Av. Arequipa 456', type: 'Vidrio' };
    assert.equal((await api('PATCH', `/solicitud/${id}?user_id=1`, cambios)).status, 200);
    const { data } = await api('GET', '/solicitud?user_id=1');
    assert.equal(data[0].address, cambios.address);
    assert.equal(data[0].type, cambios.type);
});

test('HU-2.2 rechaza campos obligatorios vacíos y bloquea la edición tras aceptar', async () => {
    const { id } = await sembrarSolicitud();
    const ruta = `/solicitud/${id}?user_id=1`;
    assert.equal((await api('PATCH', ruta, { ...camposSolicitud, address: ' ' })).status, 400);
    assert.equal((await api('PATCH', `/solicitud/${id}/accept?user_id=2`)).status, 200);
    assert.equal((await api('PATCH', ruta, { ...camposSolicitud, address: 'Otra dirección' })).status, 409);
    assert.equal((await api('GET', '/solicitud?user_id=1')).data[0].address, camposSolicitud.address);
});
test('HU-2.2 | Caja blanca: un usuario ajeno no llega a ejecutar la escritura', async (t) => {
    const { default: servicio } = await import('../src/services/recojo.js');
    const { default: repositorio } = await import('../src/repositories/recojo.js');
    const guardar = t.mock.fn();
    t.mock.method(repositorio, 'atomic', async trabajo => trabajo({
        findUser: async id => ({ id, role: 'Usuario' }),
        findRequest: async () => ({ id: 7, created_by: 1, status: 'Disponible' }),
        updateRequest: guardar
    }));
    await assert.rejects(() => servicio.edit(7, 4, camposSolicitud), { status: 403 });
    assert.equal(guardar.mock.callCount(), 0);
});
