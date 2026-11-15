import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { api, cuenta, usuariosRepo, usuariosService } from './apoyo-hu.js';

describe('Caja negra | Tipo de usuario', () => {
    for (const role of ['Usuario', 'Reciclador']) {
        test(`HU-1.2 guarda el rol ${role} y lo devuelve al iniciar sesión`, async () => {
            const datos = { ...cuenta, email: 'rol@example.test', role };
            assert.equal((await api('POST', '/user/register', datos)).status, 201);
            const login = await api('POST', '/user/login', datos);
            assert.equal(login.status, 200);
            assert.equal(login.data.role, role);
        });
    }

    test('HU-1.2 rechaza el registro sin un tipo de usuario', async () => {
        const respuesta = await api('POST', '/user/register', { ...cuenta, email: 'sinrol@example.test', role: undefined });
        assert.equal(respuesta.status, 400);
    });

    test('HU-1.2 muestra las opciones del rol que inició sesión',
        { skip: 'Requiere las pantallas del frontend' });
});

describe('Caja blanca | Tipo de usuario', () => {
    test('HU-1.2 registro conserva el rol cuando prepara la cuenta para persistir', async (t) => {
        const guardar = t.mock.method(usuariosRepo, 'register', async () => ({ id: 3 }));
        const resultado = await usuariosService.register({ ...cuenta, role: 'Reciclador' });
        assert.equal(resultado.id, 3);
        assert.equal(guardar.mock.calls[0].arguments[0].role, 'Reciclador');
    });
});

describe('Unitaria | Tipo de usuario', () => {
    test('HU-1.2 un rechazo de persistencia para el rol no produce una cuenta creada', async (t) => {
        const guardar = t.mock.method(usuariosRepo, 'register', async () => null);
        const resultado = await usuariosService.register({ ...cuenta, role: 'Otro' });
        assert.equal(guardar.mock.callCount(), 1);
        assert.equal(resultado.success, false);
        assert.equal(resultado.id, -1);
    });
});
