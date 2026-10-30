import { test, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import _sequelize from 'sequelize';

const { Op } = _sequelize;

// HU-3.1 y HU-3.2: pruebas aisladas. Sin conexión a la base de datos ni envío real de correos.
let users, challenges, sent, emailOk, nextId;

function matches(row, where = {}) {
    return Reflect.ownKeys(where).every(key => {
        const condition = where[key];
        if (condition !== null && typeof condition === 'object' && !(condition instanceof Date)) {
            return Reflect.ownKeys(condition).every(op => {
                if (op === Op.lt) return row[key] < condition[op];
                if (op === Op.lte) return new Date(row[key]).getTime() <= new Date(condition[op]).getTime();
                throw Error('Operador no soportado en la prueba');
            });
        }
        return row[key] === condition;
    });
}
const pick = (row, attributes) => attributes ? Object.fromEntries(attributes.map(a => [a, row[a]])) : { ...row };
const instance = (row) => Object.assign({ ...row }, { get: () => ({ ...row }) });

const models = {
    user: {
        async findOne({ where, attributes }) { const u = users.find(r => matches(r, where)); return u ? instance(pick(u, attributes)) : null; },
        async findByPk(id, { attributes } = {}) { const u = users.find(r => r.id === id); return u ? pick(u, attributes) : null; },
        async update(data, { where }) { const rows = users.filter(r => matches(r, where)); rows.forEach(r => Object.assign(r, data)); return [rows.length]; }
    },
    two_factor_challenge: {
        async destroy({ where }) { const before = challenges.length; challenges = challenges.filter(c => !matches(c, where)); return before - challenges.length; },
        async create(data) { const row = { id: nextId++, ...data }; challenges.push(row); return row; },
        async findOne({ where }) { const c = challenges.find(r => matches(r, where)); return c ? { ...c } : null; },
        async update(data, { where }) {
            const rows = challenges.filter(r => matches(r, where));
            for (const row of rows)
                for (const [key, value] of Object.entries(data))
                    row[key] = value?.val === 'attempts + 1' ? row.attempts + 1 : value;
            return [rows.length];
        }
    }
};

mock.module('../src/config/database.js', { defaultExport: {} });
mock.module('../src/models/init-models.js', { defaultExport: () => models });
mock.module('../src/services/email.js', {
    defaultExport: async (to, subject, html) => { sent.push({ to, subject, html }); return emailOk; }
});

const { default: userService } = await import('../src/services/user.js');
const { default: twoFactor, RESULT, MAX_ATTEMPTS, CODE_TTL_MS, RESEND_COOLDOWN_MS, CHALLENGE_TTL_MS } =
    await import('../src/services/two_factor.js');

const PASSWORD = 'Clave#2026';
const hashed = await bcrypt.hash(PASSWORD, 8);
const EMAIL = 'con2fa@test.pe';

beforeEach(() => {
    users = [
        { id: 1, full_name: 'Persona sin 2FA', email: 'sin2fa@test.pe', password: hashed, role: 'Usuario', profile_photo_url: null, score: 5, two_factor_enabled: false },
        { id: 2, full_name: 'Persona con 2FA', email: EMAIL, password: hashed, role: 'Reciclador', profile_photo_url: null, score: 4.5, two_factor_enabled: true }
    ];
    challenges = []; sent = []; emailOk = true; nextId = 1;
});

const codeFrom = (mail) => mail.html.match(/<b>(\d{6})<\/b>/)[1];
const wrongCode = (code) => code === '111111' ? '222222' : '111111';
async function loginWith2FA() {
    const response = await userService.login({ email: EMAIL, password: PASSWORD });
    return { response, code: codeFrom(sent.at(-1)), challenge: response.user.challenge };
}

test('HU-3.1: without 2FA the login returns the user and sends no code', async () => {
    const response = await userService.login({ email: 'sin2fa@test.pe', password: PASSWORD });
    assert.equal(response.user.id, 1);
    assert.equal(response.user.requires_2fa, undefined);
    assert.equal(response.user.password, undefined);
    assert.equal(sent.length, 0); assert.equal(challenges.length, 0);
});

test('HU-3.1: with 2FA, valid credentials request a code and do not return the user', async () => {
    const before = Date.now();
    const { response, code, challenge } = await loginWith2FA();

    assert.deepEqual(Object.keys(response.user).sort(), ['challenge', 'code_sent', 'id', 'requires_2fa']);
    assert.equal(response.user.id, -1); assert.equal(response.user.requires_2fa, true); assert.equal(response.user.code_sent, true);
    assert.match(challenge, /^[0-9a-f]{64}$/);

    assert.equal(sent.length, 1); assert.equal(sent[0].to, EMAIL); assert.match(code, /^\d{6}$/);
    assert.ok(!JSON.stringify(response).includes(code), 'the code never travels in the response');

    const [row] = challenges;
    assert.equal(row.user_id, 2); assert.equal(row.attempts, 0);
    assert.notEqual(row.code_hash, code); assert.ok(await bcrypt.compare(code, row.code_hash));
    assert.notEqual(row.challenge_hash, challenge);
    const ttl = row.expires_at.getTime() - before;
    assert.ok(ttl >= CODE_TTL_MS && ttl < CODE_TTL_MS + 5000);
});

test('HU-3.1: a wrong password with 2FA neither sends a code nor creates a challenge', async () => {
    const response = await userService.login({ email: EMAIL, password: 'otra' });
    assert.deepEqual(response.user, { id: -1 });
    assert.equal(sent.length, 0); assert.equal(challenges.length, 0);
});

test('an email failure is reported and leaves no pending challenge', async () => {
    emailOk = false;
    const response = await userService.login({ email: EMAIL, password: PASSWORD });
    assert.equal(response.user.requires_2fa, true); assert.equal(response.user.code_sent, false);
    assert.equal(response.user.challenge, null); assert.equal(challenges.length, 0);
});

test('HU-3.2: the correct code grants access exactly once', async () => {
    const { code, challenge } = await loginWith2FA();
    const result = await twoFactor.verify({ email: EMAIL, challenge, code });
    assert.equal(result.result, RESULT.VALID);
    assert.equal(result.user.id, 2); assert.equal(result.user.role, 'Reciclador'); assert.equal(result.user.password, undefined);
    assert.equal(challenges.length, 0);
    assert.equal((await twoFactor.verify({ email: EMAIL, challenge, code })).result, RESULT.INVALID_CHALLENGE);
});

test('HU-3.2: a wrong code returns INVALID and counts the attempt', async () => {
    const { code, challenge } = await loginWith2FA();
    assert.equal((await twoFactor.verify({ email: EMAIL, challenge, code: wrongCode(code) })).result, RESULT.INVALID);
    assert.equal(challenges[0].attempts, 1);
    assert.equal((await twoFactor.verify({ email: EMAIL, challenge, code })).result, RESULT.VALID);
});

test('after the maximum failed attempts the code is blocked, even if correct', async () => {
    const { code, challenge } = await loginWith2FA();
    for (let i = 0; i < MAX_ATTEMPTS; i++)
        assert.equal((await twoFactor.verify({ email: EMAIL, challenge, code: wrongCode(code) })).result, RESULT.INVALID);
    assert.equal((await twoFactor.verify({ email: EMAIL, challenge, code })).result, RESULT.BLOCKED);
});

test('concurrent wrong attempts cannot exceed the limit', async () => {
    const { code, challenge } = await loginWith2FA();
    const results = await Promise.all(Array.from({ length: MAX_ATTEMPTS + 3 },
        () => twoFactor.verify({ email: EMAIL, challenge, code: wrongCode(code) })));
    assert.equal(results.filter(r => r.result === RESULT.INVALID).length, MAX_ATTEMPTS);
    assert.equal(results.filter(r => r.result === RESULT.BLOCKED).length, 3);
    assert.equal(challenges[0].attempts, MAX_ATTEMPTS);
});

test('concurrent correct submissions log in only once', async () => {
    const { code, challenge } = await loginWith2FA();
    const results = await Promise.all([1, 2].map(() => twoFactor.verify({ email: EMAIL, challenge, code })));
    assert.equal(results.filter(r => r.result === RESULT.VALID).length, 1);
    assert.equal(results.filter(r => r.result === RESULT.INVALID_CHALLENGE).length, 1);
});

test('HU-3.2: an expired code returns EXPIRED even with the correct digits', async () => {
    const { code, challenge } = await loginWith2FA();
    challenges[0].expires_at = new Date(Date.now() - 1000);
    assert.equal((await twoFactor.verify({ email: EMAIL, challenge, code })).result, RESULT.EXPIRED);
    assert.equal(challenges[0].attempts, 0);
});

test('foreign challenges and malformed codes are rejected without spending attempts', async () => {
    const { code, challenge } = await loginWith2FA();
    assert.equal((await twoFactor.verify({ email: EMAIL, challenge: 'f'.repeat(64), code })).result, RESULT.INVALID_CHALLENGE);
    assert.equal((await twoFactor.verify({ email: 'sin2fa@test.pe', challenge, code })).result, RESULT.INVALID_CHALLENGE);
    assert.equal((await twoFactor.verify({ email: EMAIL, code })).result, RESULT.INVALID_CHALLENGE);
    for (const malformed of ['12ab56', '12345', '1234567', null])
        assert.equal((await twoFactor.verify({ email: EMAIL, challenge, code: malformed })).result, RESULT.INVALID);
    assert.equal(challenges[0].attempts, 0);
});

test('a new login replaces the previous challenge', async () => {
    const first = await loginWith2FA();
    const second = await loginWith2FA();
    assert.equal(challenges.length, 1);
    assert.equal((await twoFactor.verify({ email: EMAIL, challenge: first.challenge, code: first.code })).result, RESULT.INVALID_CHALLENGE);
    assert.equal((await twoFactor.verify({ email: EMAIL, challenge: second.challenge, code: second.code })).result, RESULT.VALID);
});

test('HU-3.2: resend respects the cooldown, then sends a new code that replaces the old one', async () => {
    const { code: oldCode, challenge } = await loginWith2FA();

    const early = await twoFactor.resend({ email: EMAIL, challenge });
    assert.equal(early.result, RESULT.COOLDOWN);
    assert.ok(early.retry_after >= 1 && early.retry_after <= RESEND_COOLDOWN_MS / 1000);
    assert.equal(sent.length, 1);

    challenges[0].sent_at = new Date(Date.now() - RESEND_COOLDOWN_MS - 1000);
    challenges[0].attempts = 3;
    assert.equal((await twoFactor.resend({ email: EMAIL, challenge })).result, RESULT.SENT);
    assert.equal(sent.length, 2); assert.equal(sent[1].to, EMAIL);
    assert.equal(challenges[0].attempts, 0);

    const newCode = codeFrom(sent[1]);
    if (newCode !== oldCode)
        assert.equal((await twoFactor.verify({ email: EMAIL, challenge, code: oldCode })).result, RESULT.INVALID);
    assert.equal((await twoFactor.verify({ email: EMAIL, challenge, code: newCode })).result, RESULT.VALID);
});

test('resend is rejected after the challenge lifetime and reports email failures', async () => {
    const { challenge } = await loginWith2FA();
    challenges[0].sent_at = new Date(Date.now() - RESEND_COOLDOWN_MS - 1000);

    emailOk = false;
    assert.equal((await twoFactor.resend({ email: EMAIL, challenge })).result, RESULT.EMAIL_ERROR);

    challenges[0].created_at = new Date(Date.now() - CHALLENGE_TTL_MS - 1000);
    assert.equal((await twoFactor.resend({ email: EMAIL, challenge })).result, RESULT.INVALID_CHALLENGE);
});

test('HU-3.1: activate and deactivate 2FA; deactivating requires the current password', async () => {
    assert.deepEqual(await twoFactor.getStatus(1), { success: true, enabled: false });

    assert.equal((await twoFactor.setStatus(1, { enabled: true })).result, RESULT.UPDATED);
    assert.equal(users[0].two_factor_enabled, true);
    assert.equal((await twoFactor.getStatus(1)).enabled, true);

    await userService.login({ email: 'sin2fa@test.pe', password: PASSWORD });
    assert.equal(challenges.length, 1);

    for (const password of [undefined, '', 'otra'])
        assert.deepEqual(await twoFactor.setStatus(1, { enabled: false, password }),
            { success: true, result: RESULT.INVALID_PASSWORD, enabled: true });
    assert.equal(users[0].two_factor_enabled, true);

    assert.deepEqual(await twoFactor.setStatus(1, { enabled: false, password: PASSWORD }),
        { success: true, result: RESULT.UPDATED, enabled: false });
    assert.equal(users[0].two_factor_enabled, false);
    assert.equal(challenges.length, 0, 'deactivating removes the pending challenge');
});

test('rejects invalid identifiers and values; unknown users get 404', async () => {
    for (const id of ['abc', '0', '-1', '1.5', ''])
        assert.equal((await twoFactor.getStatus(id)).status, 400);
    assert.equal((await twoFactor.getStatus(99)).status, 404);
    assert.equal((await twoFactor.setStatus(99, { enabled: true })).status, 404);
    for (const enabled of ['true', 1, null, undefined])
        assert.equal((await twoFactor.setStatus(1, { enabled })).status, 400);
});

test('HTTP contracts: login challenge, verify, resend and settings answer JSON', async () => {
    const { default: express } = await import('express');
    const { default: router } = await import('../src/routes/user.js');
    const app = express(); app.use(express.json()); app.use('/user', router);
    const server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve));
    const base = `http://127.0.0.1:${server.address().port}`;
    const post = (path, body) => fetch(base + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const patch = (id, body) => fetch(base + `/user/${id}/two-factor`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    try {
        const login = await post('/user/login', { email: EMAIL, password: PASSWORD });
        assert.equal(login.status, 200);
        const challengeBody = await login.json();
        assert.equal(challengeBody.requires_2fa, true); assert.equal(challengeBody.email, undefined);
        const code = codeFrom(sent.at(-1));

        const wrong = await post('/user/login/verify', { email: EMAIL, challenge: challengeBody.challenge, code: wrongCode(code) });
        assert.equal(wrong.status, 200); assert.deepEqual(await wrong.json(), { result: RESULT.INVALID });

        const valid = await (await post('/user/login/verify', { email: EMAIL, challenge: challengeBody.challenge, code })).json();
        assert.equal(valid.result, RESULT.VALID); assert.equal(valid.user.id, 2); assert.equal(valid.user.password, undefined);

        assert.deepEqual(await (await post('/user/login/resend', {})).json(), { result: RESULT.INVALID_CHALLENGE });

        assert.deepEqual(await (await fetch(base + '/user/2/two-factor')).json(), { enabled: true });
        assert.deepEqual(await (await patch(2, { enabled: false })).json(), { result: RESULT.INVALID_PASSWORD, enabled: true });
        assert.deepEqual(await (await patch(2, { enabled: false, password: PASSWORD })).json(), { result: RESULT.UPDATED, enabled: false });

        const invalid = await fetch(base + '/user/abc/two-factor');
        assert.equal(invalid.status, 400); assert.ok((await invalid.json()).message);
    } finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
});
