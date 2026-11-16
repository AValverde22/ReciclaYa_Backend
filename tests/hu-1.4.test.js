import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { api, correos, cuenta, usuariosRepo, usuariosService } from './apoyo-hu.js';

const nuevaClave = 'Nueva#2026';

async function pedirCodigo() {
    const respuesta = await api('POST', '/user/recover', { email: cuenta.email });
    assert.equal(respuesta.status, 200);
    assert.equal(correos.length, 1);
    assert.equal(correos[0].to, cuenta.email);
    const codigo = correos[0].html.match(/\b\d{6}\b/)?.[0];
    assert.ok(codigo, 'El correo debe contener un código de seis dígitos');
    return codigo;
}

describe('Caja negra | Recuperación de contraseña', () => {
    test('HU-1.4 permite recuperar el acceso con un código válido', async () => {
        const code = await pedirCodigo();
        const reset = await api('PATCH', '/user/reset', { email: cuenta.email, password: nuevaClave, code });
        assert.equal(reset.status, 200);
        assert.equal(reset.data.id, 1);
        const login = await api('POST', '/user/login', { email: cuenta.email, password: nuevaClave });
        assert.equal(login.data.id, 1);
        assert.deepEqual((await api('POST', '/user/login', cuenta)).data, { id: -1 });
        const reutilizado = await api('PATCH', '/user/reset', { email: cuenta.email, password: cuenta.password, code });
        assert.equal(reutilizado.status, 400);
    });
});

describe('Caja blanca | Recuperación de contraseña', () => {
    test('HU-1.4 un código incorrecto se rechaza antes de actualizar la contraseña', async (t) => {
        const code = await pedirCodigo();
        const otroCodigo = code === '111111' ? '222222' : '111111';
        const actualizar = t.mock.method(usuariosRepo, 'reset');
        const resultado = await usuariosService.reset({
            email: cuenta.email, password: nuevaClave, code: otroCodigo
        });
        assert.equal(resultado.success, false);
        assert.deepEqual(resultado.user, { id: -1 });
        assert.equal(actualizar.mock.callCount(), 0);
    });
});
