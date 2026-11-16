import { test } from 'node:test';
import assert from 'node:assert/strict';
import { api, modelos, sembrarSolicitud } from './apoyo-hu-adicional.js';

test('HU-4.2 abona 100 puntos a cada participante tras ambas confirmaciones, una sola vez', async () => {
    const { id } = await sembrarSolicitud({
        status: 'Pendiente', accepted_by: 2, recycler_latitude: -12,
        recycler_longitude: -77, location_updated_at: new Date()
    });
    const confirmar = userId => api('POST', `/solicitud/${id}/confirmar?user_id=${userId}`);
    assert.equal((await confirmar(1)).data.completed, false);
    assert.equal((await api('GET', '/user/1/points')).data.balance, 0);
    const cierre = await confirmar(2);
    assert.equal(cierre.status, 200);
    assert.equal(cierre.data.completed, true);
    assert.equal(cierre.data.points_awarded, 100);
    assert.equal((await confirmar(2)).status, 409);

    for (const userId of [1, 2]) {
        const { data } = await api('GET', `/user/${userId}/points`);
        assert.equal(data.balance, 100);
        assert.equal(data.history.length, 1);
        assert.equal(data.history[0].type, 'Ganado');
        assert.equal(data.history[0].solicitud_id, id);
    }
});

test('HU-4.2 un recojo cancelado no genera puntos', async () => {
    const { id } = await sembrarSolicitud({ status: 'Pendiente', accepted_by: 2 });
    assert.equal((await api('POST', `/solicitud/${id}/cancelar-recojo?user_id=1`)).status, 200);
    for (const userId of [1, 2]) {
        const { data } = await api('GET', `/user/${userId}/points`);
        assert.equal(data.balance, 0);
        assert.deepEqual(data.history, []);
    }
});

test('HU-4.2 publica condiciones, rechaza saldo insuficiente y descuenta un canje válido', async () => {
    const catalogo = await api('GET', '/user/1/benefits');
    assert.equal(catalogo.status, 200);
    const beneficio = catalogo.data.benefits[0];
    assert.ok(beneficio.points_required > 0);
    assert.ok(beneficio.conditions);
    const ruta = `/user/1/benefits/${beneficio.id}/redeem`;
    const rechazo = await api('POST', ruta);
    assert.equal(rechazo.status, 409);
    assert.match(rechazo.data.message, /no cuenta con puntos suficientes/i);

    await modelos.puntosMovimiento.create({
        user_id: 1, type: 'Ganado', points: beneficio.points_required + 50
    });
    const canje = await api('POST', ruta);
    assert.equal(canje.status, 201);
    assert.match(canje.data.message, /beneficio canjeado correctamente/i);
    assert.equal(canje.data.redemption.balance, 50);
    const cuenta = await api('GET', '/user/1/points');
    assert.equal(cuenta.data.balance, 50);
    assert.ok(cuenta.data.history.some(item => item.type === 'Canjeado' && item.points === -beneficio.points_required));
});
test('HU-4.2 | Caja blanca: un ID inválido de beneficio impide invocar el canje', async (t) => {
    const { default: servicio } = await import('../src/services/puntos.js');
    const { default: repositorio } = await import('../src/repositories/puntos.js');
    const guardar = t.mock.method(repositorio, 'redeem');
    const respuesta = await servicio.redeem('1', '0');
    assert.equal(respuesta.success, false);
    assert.equal(respuesta.status, 400);
    assert.equal(guardar.mock.callCount(), 0);
});
