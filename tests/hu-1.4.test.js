import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { api, correos, cuenta, models, usuariosRepo, usuariosService } from './apoyo-hu.js';

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
    });

    test('HU-1.4 rechaza contraseñas que no coinciden', { skip: 'Requiere el formulario de restablecimiento del frontend' });
});

describe('Caja blanca | Recuperación de contraseña', () => {
    test('HU-1.4 un código incorrecto no escribe la clave y el válido solo se usa una vez', async (t) => {
        const code = await pedirCodigo();
        const otroCodigo = code === '111111' ? '222222' : '111111';
        const actualizar = t.mock.method(usuariosRepo, 'reset');
        assert.equal((await usuariosService.reset({ email: cuenta.email, password: nuevaClave, code: otroCodigo })).success, false);
        assert.equal(actualizar.mock.callCount(), 0);
        const datos = { email: cuenta.email, password: nuevaClave, code };
        assert.equal((await usuariosService.reset(datos)).success, true);
        assert.equal((await usuariosService.reset(datos)).success, false);
        assert.equal(actualizar.mock.callCount(), 1);
    });
});

describe('Unitaria | Recuperación de contraseña', () => {
    test('HU-1.4 recover no guarda un código ni envía correo si no existe la cuenta', async (t) => {
        t.mock.method(usuariosRepo, 'getID', async () => null);
        const guardar = t.mock.method(models.verification_code, 'create');
        assert.equal((await usuariosService.recover(cuenta)).success, true);
        assert.equal(guardar.mock.callCount(), 0);
        assert.equal(correos.length, 0);
    });
});
