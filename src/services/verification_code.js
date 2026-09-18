import repository from '../repositories/verification_code.js'

const services = {
    async insert (code, userID) {
        try {
            return await repository.insert(
                {
                    code: code, 
                    user_id: userID
                }
            );
        } catch (error) { return null; }
    }, 
    async getCode(userID) {
        try { return await repository.getCode(userID); }
        catch (error) { return null; }
    },
    async delete(userID) {
        try { await repository.delete(userID); }
        catch (error) {}
    }
}

export default services;