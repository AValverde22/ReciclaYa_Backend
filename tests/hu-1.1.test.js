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

    test('HU-1.1 rechaza un registro sin contraseña', async () => {
        const respuesta = await api('POST', '/user/register', { ...cuenta, password: undefined });
        assert.equal(respuesta.status, 400);
    });

    test('HU-1.1 rechaza un correo con formato inválido', { todo: 'La API no valida el formato' }, async () => {
        const respuesta = await api('POST', '/user/register', { ...cuenta, email: 'correo-invalido' });
        assert.equal(respuesta.status, 400);
    });

    test('HU-1.1 rechaza una contraseña débil', { todo: 'La API no valida la fortaleza' }, async () => {
        const respuesta = await api('POST', '/user/register', { ...cuenta, email: 'debil@example.test', password: '123' });
        assert.equal(respuesta.status, 400);
    });

    test('HU-1.1 valida la confirmación de la contraseña en el registro',
        { skip: 'Requiere el formulario de registro del frontend' });
});

describe('Caja blanca | Registro', () => {
    test('HU-1.1 si falla el repositorio, registro devuelve un error y el ID -1', async (t) => {
        const guardar = t.mock.method(usuariosRepo, 'register', async () => { throw new Error('Fallo de prueba'); });
        assert.deepEqual(await usuariosService.register(cuenta), { success: false, message: 'Fallo de prueba', id: -1 });
        assert.equal(guardar.mock.callCount(), 1);
    });
});

describe('Unitaria | Registro', () => {
    test('HU-1.1 register guarda un hash que corresponde a la contraseña', async (t) => {
        const guardar = t.mock.method(usuariosRepo, 'register', async () => ({ id: 7 }));
        const resultado = await usuariosService.register(cuenta);
        assert.equal(resultado.id, 7);
        assert.equal(guardar.mock.callCount(), 1);
        const { password } = guardar.mock.calls[0].arguments[0];
        assert.notEqual(password, cuenta.password);
        assert.equal(await bcrypt.compare(cuenta.password, password), true);
    });
});
