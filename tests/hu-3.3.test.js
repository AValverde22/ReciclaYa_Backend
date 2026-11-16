import { test } from 'node:test';
import assert from 'node:assert/strict';
import { api, modelos } from './apoyo-hu-adicional.js';

test('HU-3.3 lista accesos del usuario en orden descendente y filtra por tipo', async () => {
    const antiguo = await modelos.logAccesos.create({
        user_id: 1, tipo_actividad: 'Inicio de sesión', fecha_login: new Date('2026-01-01T12:30:00Z')
    });
    const reciente = await modelos.logAccesos.create({
        user_id: 1, tipo_actividad: 'Cierre de sesión', fecha_login: new Date('2026-01-02T13:15:00Z')
    });
    await modelos.logAccesos.create({ user_id: 2, fecha_login: new Date('2026-01-03T00:00:00Z') });
    const listado = await api('GET', '/accesos/1');
    assert.equal(listado.status, 200);
    assert.deepEqual(listado.data.map(item => item.id), [reciente.id, antiguo.id]);
    assert.deepEqual(listado.data.map(item => item.fecha_login), [
        '2026-01-02T13:15:00.000Z', '2026-01-01T12:30:00.000Z'
    ]);

    const filtrado = await api('GET', '/accesos/1?tipo=' + encodeURIComponent('Inicio de sesión'));
    assert.equal(filtrado.status, 200);
    assert.deepEqual(filtrado.data.map(item => item.id), [antiguo.id]);
});

test('HU-3.3 devuelve un listado vacío si no hay accesos', async () => {
    assert.deepEqual(await api('GET', '/accesos/1'), { status: 200, data: [] });
});

test('HU-3.3 deniega la consulta sin una sesión autenticada', {
    todo: 'La API actual identifica la cuenta con el ID de la URL sin autenticar a quien consulta.'
}, async () => {
    await modelos.logAccesos.create({ user_id: 2, fecha_login: new Date('2026-01-01T01:00:00Z') });
    const respuesta = await api('GET', '/accesos/2');
    assert.ok([401, 403].includes(respuesta.status), 'La API debe exigir autenticación y comprobar la cuenta');
});