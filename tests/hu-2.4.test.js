import { test } from 'node:test';
import assert from 'node:assert/strict';
import { api, sembrarSolicitud } from './apoyo-hu-adicional.js';

test('HU-2.4 lista solo disponibles y filtra por residuo y horario', async () => {
    const papel = await sembrarSolicitud();
    const vidrio = await sembrarSolicitud({ type: 'Vidrio', time: '16:00' });
    await sembrarSolicitud({ type: 'Vidrio', time: '18:00', status: 'Pendiente', accepted_by: 2 });
    const listado = await api('GET', '/solicitud/disponibles');
    assert.equal(listado.status, 200);
    assert.deepEqual(listado.data.map(item => item.id).sort(), [papel.id, vidrio.id].sort());

    const filtro = await api('GET', '/solicitud/disponibles?type=Vidrio&day=15%2F06%2F2099&time=15%3A00');
    assert.equal(filtro.status, 200);
    assert.equal(filtro.data.length, 1);
    const [detalle] = filtro.data;
    assert.equal(detalle.id, vidrio.id);
    assert.equal(detalle.type, 'Vidrio');
    assert.equal(detalle.status, 'Disponible');
    assert.equal(detalle.address, vidrio.address);
    assert.equal(detalle.day, '15/06/2099');
    assert.equal(detalle.time, '16:00');
});

test('HU-2.4 devuelve un listado vacío cuando no hay solicitudes disponibles', async () => {
    await sembrarSolicitud({ status: 'Cancelada' });
    assert.deepEqual(await api('GET', '/solicitud/disponibles'), { status: 200, data: [] });
});
test('HU-2.4 | Caja blanca: el servicio pasa al repositorio los filtros de disponibilidad', async (t) => {
    const { default: servicio } = await import('../src/services/solicitud.js');
    const { default: repositorio } = await import('../src/repositories/solicitud.js');
    const { Op } = await import('sequelize');
    const consultar = t.mock.method(repositorio, 'getDisponibles', async () => []);
    const respuesta = await servicio.getDisponibles({ type: 'Vidrio', time: '15:00' });
    assert.equal(respuesta.success, true);
    assert.equal(consultar.mock.callCount(), 1);
    assert.deepEqual(consultar.mock.calls[0].arguments, [
        { status: 'Disponible', type: 'Vidrio', time: { [Op.gte]: '15:00' } }, {}
    ]);
});