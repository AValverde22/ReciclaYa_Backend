import repository from '../repositories/user.js'
import verification_code from './verification_code.js'
import twoFactor from './two_factor.js'
import sendEmail from './email.js'
import logAccesosServices from './logAccesos.js'

import bcrypt from 'bcryptjs'

const services = {
    async getProfile(value) {
        const id = parseIdentifier(value);
        if (id === null) return { success: false, status: 400, message: 'Identificador inválido.' };
        try {
            const profile = await repository.getProfile(id);
            if (!profile) return { success: false, status: 404, message: 'Usuario no encontrado.' };
            const change = profile.profile_change;
            return {
                success: true,
                profile: {
                    id: profile.id,
                    full_name: profile.full_name,
                    email: profile.email,
                    role: profile.role,
                    profile_photo_url: profile.profile_photo_url,
                    score: Number(profile.score),
                    validation_status: change?.status || 'Validado',
                    sensitive_fields: change?.sensitive_fields ? change.sensitive_fields.split(',') : []
                }
            };
        } catch (error) {
            return { success: false, status: 500, message: error.message };
        }
    },
    async updateProfile(value, body = {}) {
        const id = parseIdentifier(value);
        if (id === null) return { success: false, status: 400, message: 'Identificador inválido.' };

        const fullName = typeof body.full_name === 'string' ? body.full_name.trim().replace(/\s+/g, ' ') : '';
        const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
        const photo = body.profile_photo_url == null ? null : String(body.profile_photo_url).trim();
        if (fullName.length < 2 || fullName.length > 100)
            return { success: false, status: 400, message: 'El nombre debe tener entre 2 y 100 caracteres.', field: 'full_name' };
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254)
            return { success: false, status: 400, message: 'Ingrese un correo válido.', field: 'email' };
        if (photo && (!/^https?:\/\/\S+$/i.test(photo) || photo.length > 2048))
            return { success: false, status: 400, message: 'Ingrese una URL de foto válida.', field: 'profile_photo_url' };

        try {
            const current = await repository.getProfile(id);
            if (!current) return { success: false, status: 404, message: 'Usuario no encontrado.' };
            const pendingFields = current.profile_change?.status === 'Pendiente de validación' &&
                current.profile_change.sensitive_fields
                ? current.profile_change.sensitive_fields.split(',').filter(Boolean)
                : [];
            const sensitiveFields = [...new Set([
                ...pendingFields,
                ...(current.email.toLowerCase() === email ? [] : ['email'])
            ])];
            const result = await repository.updateProfile(id, {
                full_name: fullName,
                email,
                profile_photo_url: photo || null
            }, sensitiveFields);
            if (result.type === 'not_found') return { success: false, status: 404, message: 'Usuario no encontrado.' };
            if (result.type === 'duplicate_email')
                return { success: false, status: 409, message: 'El correo ingresado ya está registrado.', field: 'email' };
            return { success: true, profile: result.profile, message: 'Información personal actualizada correctamente.' };
        } catch (error) {
            if (error?.name === 'SequelizeUniqueConstraintError')
                return { success: false, status: 409, message: 'El correo ingresado ya está registrado.', field: 'email' };
            return { success: false, status: 500, message: error.message };
        }
    },
    async getScore(value) {
        if (!/^[1-9]\d*$/.test(String(value)) || !Number.isSafeInteger(Number(value)))
            return {success:false, status:400, message:'Identificador inválido.'};
        const score = await repository.getScore(Number(value));
        return score ? {success:true, score} : {success:false, status:404, message:'Usuario no encontrado.'};
    },
    async validate(objUsuario) {
        try {
            const { email } = objUsuario;
            const userRes = await repository.validate(email);

            return {
                success: true,
                message: "Email no existente.",
                existe: (userRes !== null)
            }
        } catch (error) {
            return {
                success: false,
                message: error.message,
                existe: false
            }
        }
    },
    async register(objUsuario) {
        try {
            const salt = await bcrypt.genSalt(8);
            const hashedPassword = await bcrypt.hash(objUsuario.password, salt);

            const newUser = {
                ...objUsuario,
                password: hashedPassword
            };

            const userRes = await repository.register(newUser);

            return {
                success: true,
                message: "Usuario creado exitosamente.",
                id: userRes.id
            }

        } catch (error) {
            return {
                success: false,
                message: error.message,
                id: -1
            }
        }
    }, 
    async login(objUsuario, datosAcceso = {}) {
        try {
            const { email, password } = objUsuario;
            
            // Correo inválido
            const userRes = await repository.login(email);
            if (!userRes) return { 
                success: true,
                message: "Credenciales inválidas.",
                user: { id: -1 }
            }

            // Contraseña inválida
            const isPasswordValid = await bcrypt.compare(password, userRes.password);
            if(!isPasswordValid) {

            // Registrar el intento de inicio de sesión rechazado por contraseña invalida
                try {
                    await logAccesosServices.registrar(userRes.id, {
                        direccion_ip: datosAcceso.direccion_ip ?? null,
                        app_version: datosAcceso.app_version ?? null,
                        ciudad: datosAcceso.ciudad ?? null,
                        pais: datosAcceso.pais ?? null,
                        latitud: datosAcceso.latitud ?? null,
                        longitud: datosAcceso.longitud ?? null,
                        estado: 'Rechazado',
                        tipo_actividad: 'Inicio de sesión',
                        dispositivo: datosAcceso.dispositivo ?? null
                    });
                } catch (logError) {
                    console.error(
                        'Error al registrar el intento de acceso:',
                        logError
                    );
                }
                
                return {
                    success: true,
                    message: "Credenciales inválidas.",
                    user: { id: -1 },
                };
            }

            const userPlain = userRes.get({ plain: true });
            const { password: _, ...userWithoutPassword } = userPlain;

            // 2FA activo: no se entregan los datos del usuario hasta validar el código
            if (userPlain.two_factor_enabled) {
                const reto = await twoFactor.startChallenge(userPlain, datosAcceso); //Enviar también los datos de acceso al reto nultifactor
                return {
                    success: true,
                    message: reto.sent ? "Código de verificación enviado." : "No se pudo enviar el código de verificación.",
                    user: {
                        id: -1,
                        requires_2fa: true,
                        code_sent: reto.sent,
                        challenge: reto.challenge
                    }
                }
            }

            //Una vez validado el acceso del usuario, sus datos se envían a la tabla/modelo log_solicitudes
            try {
            await logAccesosServices.registrar(userPlain.id, {
                direccion_ip: datosAcceso.direccion_ip ?? null,
                app_version: datosAcceso.app_version ?? null,
                ciudad: datosAcceso.ciudad ?? null,
                pais: datosAcceso.pais ?? null,
                latitud: datosAcceso.latitud ?? null,
                longitud: datosAcceso.longitud ?? null,
                estado: 'Autorizado',
                tipo_actividad: 'Inicio de sesión',
                dispositivo: datosAcceso.dispositivo ?? null
            });
            } catch (logError) {
                console.error('Error al registrar el historial de acceso:', logError);
            }

            return {
                success: true,
                message: "Inicio de sesión exitoso.",
                user: userWithoutPassword
            };

        } catch (error) {
            return {
                success: false,
                message: error.message,
                user: { id: -1 }
            }
        }
    },
    async recover (objUsuario) {
        try {
            const { email } = objUsuario;

            const userRes = await repository.getID(email);
            if(userRes !== null) {
                const code = Math.floor(Math.random() * (999999 - 100000 + 1) + 100000);
                const strCode = code.toString();

                const salt = await bcrypt.genSalt(8);
                const hashedCode = await bcrypt.hash(strCode, salt);
                await verification_code.insert(hashedCode, userRes.id);
                
                const asunto = 'Código de recuperación';
                const mensaje = `Buen día, <br><br>

                                Su código de verificación para restablecer su contraseña es <b>${code}.</b><br>
                                De no haberlo solicitado, <b>hacer caso omiso al mensaje.</b><br><br>

                                Atentamente,<br>
                                Equipo de ReciclaYa.`

                await sendEmail(email, asunto, mensaje);
            }
            return {
                success: true,
                message: "Correo enviado.",
            }
        } catch (error) {
            return {
                success: false,
                message: error.message,
            }
        } 
    },
    async compare (objUsuario) {
        try {
            const { email, code } = objUsuario;
            const userRes = await repository.getID(email);

            if(userRes !== null) {
                const vcRes = await verification_code.getCode(userRes.id);
                if(vcRes !==  null){
                    const isCodeValid = await bcrypt.compare(code.toString(), vcRes.code);
                    
                    if(isCodeValid) {
                        await verification_code.delete(userRes.id);

                        return {
                            success: true,
                            message: "Código correcto.",
                            correcto: true
                        }
                    }
                }
            }

            return {
                success: true,
                message: "Código incorrecto.",
                correcto: false
            }
        } catch (error) {
            return {
                success: false,
                message: error.message,
                correcto: false
            }
        }
    },
    async reset (objUsuario) {
        try {
            const { email, password } = objUsuario;

            const salt = await bcrypt.genSalt(8);
            const hashedPassword = await bcrypt.hash(password, salt);
            const userRes = await repository.reset(email, hashedPassword);

            const userPlain = userRes.get({ plain: true });
            const { password: _, ...userWithoutPassword } = userPlain;

            return {
                success: true,
                message: "Contraseña reseteada exitosamente.",
                user: userWithoutPassword
            }
        } catch (error) {
            return {
                success: false,
                message: error.message,
                user: { id: -1,}
            }
        }
    }
}

function parseIdentifier(value) {
    if (!/^[1-9]\d*$/.test(String(value))) return null;
    const id = Number(value);
    return Number.isSafeInteger(id) ? id : null;
}

export default services;
