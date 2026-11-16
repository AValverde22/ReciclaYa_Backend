import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import { api, cuenta, usuariosRepo, usuariosService } from './apoyo-hu.js';

describe('Caja negra | Registro', () => {
    test('HU-1.1 registra una cuenta que después puede iniciar sesión', async () => {
        const datos = { ...cuenta, email: 'nueva@example.test' };
        const registro = await api('POST', '/user/register', datos);
        assert.equal(registro.status, 201);
        assert.ok(registro.data > 0);
        const login = await api('POST', '/user/login', datos);
        assert.equal(login.status, 200);
        assert.equal(login.data.id, registro.data);
        assert.equal(login.data.email, datos.email);
    });

    test('HU-1.1 detecta el correo duplicado y rechaza registrarlo otra vez', async () => {
        assert.deepEqual(await api('POST', '/user/validate', { email: cuenta.email }), { status: 200, data: true });
        assert.equal((await api('POST', '/user/register', cuenta)).status, 400);
    });

    for (const [campo, nombre] of [['full_name', 'nombre'], ['email', 'correo'], ['password', 'contraseña']]) {
        test(`HU-1.1 rechaza el registro sin ${nombre}`, async () => {
            const datos = { ...cuenta, email: 'nueva@example.test' };
            delete datos[campo];
            const respuesta = await api('POST', '/user/register', datos);
            assert.equal(respuesta.status, 400);
        });
    }
});

describe('Caja blanca unitaria | Registro', () => {
    test('HU-1.1 el registro exitoso conserva el rol y guarda un hash de la contraseña', async (t) => {
        const guardar = t.mock.method(usuariosRepo, 'register', async () => ({ id: 7 }));
        const resultado = await usuariosService.register(cuenta);
        assert.equal(resultado.success, true);
        assert.equal(resultado.id, 7);
        assert.equal(guardar.mock.callCount(), 1);
        const { password, role } = guardar.mock.calls[0].arguments[0];
        assert.equal(role, cuenta.role);
        assert.notEqual(password, cuenta.password);
        assert.equal(await bcrypt.compare(cuenta.password, password), true);
    });

    test('HU-1.1 si el hash falla, el registro termina antes de guardar', async (t) => {
        const guardar = t.mock.method(usuariosRepo, 'register');
        const resultado = await usuariosService.register({ ...cuenta, password: undefined });
        assert.equal(resultado.success, false);
        assert.equal(resultado.id, -1);
        assert.equal(guardar.mock.callCount(), 0);
    });

    test('HU-1.1 si el repositorio devuelve null, el servicio devuelve un error', async (t) => {
        const guardar = t.mock.method(usuariosRepo, 'register', async () => null);
        const resultado = await usuariosService.register(cuenta);
        assert.equal(resultado.success, false);
        assert.equal(resultado.id, -1);
        assert.equal(guardar.mock.callCount(), 1);
    });
});
