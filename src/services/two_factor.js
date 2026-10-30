import crypto from 'node:crypto'
import bcrypt from 'bcryptjs'

import repository from '../repositories/two_factor.js'
import userRepository from '../repositories/user.js'
import sendEmail from './email.js'

export const CODE_TTL_MS = 10 * 60 * 1000;          // vigencia de cada código
export const MAX_ATTEMPTS = 5;                       // intentos por código
export const RESEND_COOLDOWN_MS = 60 * 1000;         // espera entre reenvíos
export const CHALLENGE_TTL_MS = 30 * 60 * 1000;      // vida máxima del reto

export const RESULT = Object.freeze({
    VALID: 'VALID',
    INVALID: 'INVALID',
    EXPIRED: 'EXPIRED',
    BLOCKED: 'BLOCKED',
    INVALID_CHALLENGE: 'INVALID_CHALLENGE',
    SENT: 'SENT',
    COOLDOWN: 'COOLDOWN',
    EMAIL_ERROR: 'EMAIL_ERROR',
    UPDATED: 'UPDATED',
    INVALID_PASSWORD: 'INVALID_PASSWORD'
});

const generateCode = () => String(crypto.randomInt(100000, 1000000));
const generateChallenge = () => crypto.randomBytes(32).toString('hex');
const hashChallenge = (challenge) => crypto.createHash('sha256').update(challenge).digest('hex');
const hashCode = async (code) => bcrypt.hash(code, await bcrypt.genSalt(8));
const sameHash = (a, b) => typeof a === 'string' && typeof b === 'string' && a.length === b.length
    && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
const time = (value) => new Date(value).getTime();
const validId = (value) => /^[1-9]\d*$/.test(String(value)) && Number.isSafeInteger(Number(value));

const sendCode = (email, code) => sendEmail(email, 'Código de verificación', `Buen día, <br><br>

    Su código de verificación para iniciar sesión es <b>${code}</b>.<br>
    El código vence en 10 minutos. De no haber intentado iniciar sesión, <b>cambie su contraseña</b>.<br><br>

    Atentamente,<br>
    Equipo de ReciclaYa.`);

// Reto pendiente del usuario, solo si el challenge recibido le pertenece
async function findPending(email, challenge) {
    if (typeof email !== 'string' || typeof challenge !== 'string' || challenge.length === 0) return null;

    const user = await userRepository.getID(email);
    if (!user) return null;

    const pending = await repository.findByUser(user.id);
    if (!pending || !sameHash(hashChallenge(challenge), pending.challenge_hash)) return null;
    return pending;
}

const services = {
    // Se invoca desde el login cuando la contraseña ya fue validada.
    // El código se envía al correo registrado y nunca viaja en la respuesta.
    async startChallenge(user) {
        const code = generateCode();
        const challenge = generateChallenge();
        const now = new Date();

        await repository.replace({
            user_id: user.id,
            challenge_hash: hashChallenge(challenge),
            code_hash: await hashCode(code),
            expires_at: new Date(now.getTime() + CODE_TTL_MS),
            attempts: 0,
            sent_at: now,
            created_at: now
        });

        if (await sendCode(user.email, code)) return { sent: true, challenge };

        await repository.deleteByUser(user.id);
        return { sent: false, challenge: null };
    },

    async verify({ email, challenge, code } = {}) {
        const pending = await findPending(email, challenge);
        if (!pending) return { result: RESULT.INVALID_CHALLENGE };

        if (Date.now() > time(pending.expires_at)) return { result: RESULT.EXPIRED };
        if (pending.attempts >= MAX_ATTEMPTS) return { result: RESULT.BLOCKED };

        const value = String(code ?? '');
        if (!/^\d{6}$/.test(value)) return { result: RESULT.INVALID };

        // El intento se reserva antes de comparar para que peticiones simultáneas no superen el límite
        if (!await repository.reserveAttempt(pending.id, MAX_ATTEMPTS)) return { result: RESULT.BLOCKED };
        if (!await bcrypt.compare(value, pending.code_hash)) return { result: RESULT.INVALID };

        // Uso único: solo la petición que consume el reto inicia sesión
        if (!await repository.consume(pending.id)) return { result: RESULT.INVALID_CHALLENGE };

        const user = await userRepository.getSessionUser(pending.user_id);
        return user ? { result: RESULT.VALID, user } : { result: RESULT.INVALID_CHALLENGE };
    },

    async resend({ email, challenge } = {}) {
        const pending = await findPending(email, challenge);
        if (!pending || Date.now() - time(pending.created_at) > CHALLENGE_TTL_MS)
            return { result: RESULT.INVALID_CHALLENGE };

        const now = new Date();
        const code = generateCode();
        const refreshed = await repository.refreshCode(
            pending.id,
            await hashCode(code),
            new Date(now.getTime() + CODE_TTL_MS),
            now,
            new Date(now.getTime() - RESEND_COOLDOWN_MS)
        );

        if (!refreshed) {
            const retryAfter = Math.ceil((time(pending.sent_at) + RESEND_COOLDOWN_MS - now.getTime()) / 1000);
            return { result: RESULT.COOLDOWN, retry_after: Math.max(1, retryAfter) };
        }

        return { result: (await sendCode(email, code)) ? RESULT.SENT : RESULT.EMAIL_ERROR };
    },

    async getStatus(id) {
        if (!validId(id)) return { success: false, status: 400, message: 'Identificador inválido.' };

        const user = await userRepository.getSecurity(Number(id));
        if (!user) return { success: false, status: 404, message: 'Usuario no encontrado.' };

        return { success: true, enabled: Boolean(user.two_factor_enabled) };
    },

    async setStatus(id, { enabled, password } = {}) {
        if (!validId(id)) return { success: false, status: 400, message: 'Identificador inválido.' };
        if (typeof enabled !== 'boolean') return { success: false, status: 400, message: 'El valor de activación es inválido.' };

        const user = await userRepository.getSecurity(Number(id));
        if (!user) return { success: false, status: 404, message: 'Usuario no encontrado.' };

        // Sin sesiones en el servidor, desactivar exige confirmar la contraseña
        if (!enabled && Boolean(user.two_factor_enabled)) {
            const passwordValid = typeof password === 'string' && password.length > 0
                && await bcrypt.compare(password, user.password);
            if (!passwordValid) return { success: true, result: RESULT.INVALID_PASSWORD, enabled: true };
        }

        await userRepository.updateTwoFactor(user.id, enabled);
        if (!enabled) await repository.deleteByUser(user.id);

        return { success: true, result: RESULT.UPDATED, enabled };
    }
};

export default services;
