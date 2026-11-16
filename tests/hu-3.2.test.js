import { test } from 'node:test';
import assert from 'node:assert/strict';
import { beforeEach } from 'node:test';
import { api, correos, email, iniciarReto, modelos, ultimoCodigo } from './apoyo-hu-adicional.js';

beforeEach(async () => {
    await modelos.user.update({ two_factor_enabled: true }, { where: { id: 1 } });
});

test('HU-3.2 rechaza un código incorrecto y permite usar el correcto una sola vez', async () => {
    const challenge = await iniciarReto();
    const code = ultimoCodigo();
    assert.match(code, /^\d{6}$/);
    const incorrecto = code === '111111' ? '222222' : '111111';
    const verificar = valor => api('POST', '/user/login/verify', { email, challenge, code: valor });
    assert.equal((await verificar(incorrecto)).data.result, 'INVALID');
    const aceptado = await verificar(code);
    assert.equal(aceptado.data.result, 'VALID');
    assert.equal(aceptado.data.user.id, 1);
    assert.equal((await verificar(code)).data.result, 'INVALID_CHALLENGE');
});

test('HU-3.2 devuelve EXPIRED para un código vencido', async () => {
    const challenge = await iniciarReto();
    await modelos.two_factor_challenge.update({ expires_at: new Date(0) }, { where: { user_id: 1 } });
    const respuesta = await api('POST', '/user/login/verify', { email, challenge, code: ultimoCodigo() });
    assert.equal(respuesta.data.result, 'EXPIRED');
});

test('HU-3.2 permite reenviar tras el tiempo de espera y acepta el código enviado', async () => {
    const challenge = await iniciarReto();
    const reenviar = () => api('POST', '/user/login/resend', { email, challenge });
    assert.equal((await reenviar()).data.result, 'COOLDOWN');
    await modelos.two_factor_challenge.update({ sent_at: new Date(0) }, { where: { user_id: 1 } });
    assert.equal((await reenviar()).data.result, 'SENT');
    assert.deepEqual(correos.map(correo => correo.to), [email, email]);
    const respuesta = await api('POST', '/user/login/verify', { email, challenge, code: ultimoCodigo() });
    assert.equal(respuesta.data.result, 'VALID');
});