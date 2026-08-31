import repository from '../repositories/user.js'
import bcrypt from 'bcryptjs'

const services = {
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
    async login(objUsuario) {
        try {
            const { email, password } = objUsuario;
            
            // Correo inválido
            const userRes = await repository.login(email);
            if (!userRes) return { 
                success: true,
                message: "Credenciales inválidas.",
                user: { 
                    id: -1,
                    full_name: "",
                    email: "",
                    role: ""
                }
            }

            // Contraseña inválida
            const isPasswordValid = await bcrypt.compare(password, userRes.password);
            if(!isPasswordValid) return {
                success: true,
                message: "Credenciales inválidas.",
                user: { 
                    id: -1,
                    full_name: "",
                    email: "",
                    role: ""
                }
            }

            return {
                success: true,
                message: "Inicio de sesión exitoso.",
                user: {
                    id: userRes.id,
                    full_name: userRes.full_name,
                    email: userRes.email,
                    role: userRes.role
                }
            }
        } catch (error) {
            return {
                success: false,
                message: error.message,
                user: { 
                    id: -1,
                    full_name: "",
                    email: "",
                    role: ""
                }
            }
        }
    }
}

export default services;