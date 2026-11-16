import { test } from 'node:test';
import assert from 'node:assert/strict';
import { api, email } from './apoyo-hu-adicional.js';

const ruta = '/user/1/profile';

test('HU-1.6 consulta y actualiza el perfil y marca el correo para validación', async () => {
    const inicial = await api('GET', ruta);
    assert.equal(inicial.status, 200);
    assert.equal(inicial.data.email, email);
    const cambios = { full_name: ' Ana  Torres ', email: 'ANA.TORRES@example.test',
        profile_photo_url: 'https://example.test/ana.png' };
    const guardado = await api('PATCH', ruta, cambios);
    assert.equal(guardado.status, 200);

    const { data } = await api('GET', ruta);
    assert.equal(data.full_name, 'Ana Torres');
    assert.equal(data.email, 'ana.torres@example.test');
    assert.equal(data.profile_photo_url, cambios.profile_photo_url);
    assert.equal(data.validation_status, 'Pendiente de validación');
    assert.deepEqual(data.sensitive_fields, ['email']);
});

test('HU-1.6 rechaza un correo inválido y un duplicado sin cambiar el perfil', async () => {
    const campos = { full_name: 'Ana Torres' };
    const invalido = await api('PATCH', ruta, { ...campos, email: 'incorrecto' });
    assert.equal(invalido.status, 400);
    assert.equal(invalido.data.field, 'email');
    const duplicado = await api('PATCH', ruta, { ...campos, email: 'LUIS@example.test' });
    assert.equal(duplicado.status, 409);
    assert.match(duplicado.data.message, /ya está registrado/i);
    assert.equal((await api('GET', ruta)).data.email, email);
});
test('HU-1.6 | Caja blanca: un correo inválido se rechaza antes de acceder al repositorio', async (t) => {
    const { default: servicio } = await import('../src/services/user.js');
    const { default: repositorio } = await import('../src/repositories/user.js');
    const leer = t.mock.method(repositorio, 'getProfile');
    const guardar = t.mock.method(repositorio, 'updateProfile');
    const respuesta = await servicio.updateProfile(1, { full_name: 'Ana Pérez', email: 'invalido' });
    assert.equal(respuesta.field, 'email');
    assert.equal(leer.mock.callCount(), 0);
    assert.equal(guardar.mock.callCount(), 0);
});