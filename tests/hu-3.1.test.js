import { test } from 'node:test';
import assert from 'node:assert/strict';
import { api, correos, email, password } from './apoyo-hu-adicional.js';

test('HU-3.1 activa y desactiva 2FA y solicita un código mientras está activo', async () => {
    const ruta = '/user/1/two-factor';
    const activacion = await api('PATCH', ruta, { enabled: true, password });
    assert.equal(activacion.status, 200);
    assert.equal(activacion.data.enabled, true);
    assert.equal((await api('GET', ruta)).data.enabled, true);

    const conCodigo = await api('POST', '/user/login', { email, password });
    assert.equal(conCodigo.status, 200);
    assert.equal(conCodigo.data.requires_2fa, true);
    assert.equal(conCodigo.data.code_sent, true);
    assert.ok(conCodigo.data.challenge);
    assert.equal(conCodigo.data.id, -1);
    assert.equal(correos.length, 1);
    assert.equal(correos[0].to, email);

    const desactivacion = await api('PATCH', ruta, { enabled: false, password });
    assert.equal(desactivacion.status, 200);
    assert.equal(desactivacion.data.enabled, false);
    assert.equal((await api('GET', ruta)).data.enabled, false);
    assert.equal((await api('POST', '/user/login', { email, password })).data.id, 1);
    assert.equal(correos.length, 1);
});
test('HU-3.1 | Caja blanca: una contraseña incorrecta no cambia la configuración', async (t) => {
    const { default: servicio } = await import('../src/services/two_factor.js');
    const { default: repositorio } = await import('../src/repositories/user.js');
    const guardar = t.mock.method(repositorio, 'updateTwoFactor');
    const respuesta = await servicio.setStatus(1, { enabled: true, password: 'incorrecta' });
    assert.equal(respuesta.result, 'INVALID_PASSWORD');
    assert.equal(respuesta.enabled, false);
    assert.equal(guardar.mock.callCount(), 0);
});