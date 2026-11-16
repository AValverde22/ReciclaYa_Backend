import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { api, cuenta } from './apoyo-hu.js';

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
});
