import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { accesos, api, cuenta, usuariosService } from './apoyo-hu.js';

describe('Caja negra | Inicio de sesión', () => {
    test('HU-1.3 acepta credenciales válidas sin devolver la contraseña', async () => {
        const login = await api('POST', '/user/login', { email: cuenta.email, password: cuenta.password });
        assert.equal(login.status, 200);
        assert.equal(login.data.id, 1);
        assert.equal(login.data.password, undefined);
    });

    test('HU-1.3 deniega acceso con correo o contraseña incorrectos', async () => {
        for (const datos of [{ ...cuenta, email: 'otro@example.test' }, { ...cuenta, password: 'incorrecta' }]) {
            assert.deepEqual((await api('POST', '/user/login', datos)).data, { id: -1 });
        }
    });

    test('HU-1.3 deniega acceso si el correo o la contraseña están vacíos', async () => {
        for (const datos of [{ ...cuenta, email: '' }, { ...cuenta, password: '' }]) {
            assert.deepEqual((await api('POST', '/user/login', datos)).data, { id: -1 });
        }
    });
});

describe('Caja blanca | Inicio de sesión', () => {
    test('HU-1.3 registra los intentos de cuentas existentes según el resultado', async () => {
        await usuariosService.login({ ...cuenta, email: 'otro@example.test' });
        assert.equal(accesos.length, 0);
        await usuariosService.login({ ...cuenta, password: 'incorrecta' });
        await usuariosService.login(cuenta);
        assert.deepEqual(accesos.map(acceso => acceso.estado), ['Rechazado', 'Autorizado']);
    });
});
