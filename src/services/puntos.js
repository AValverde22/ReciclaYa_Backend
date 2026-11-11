import repository from '../repositories/puntos.js';

function id(value) {
  if (!/^[1-9]\d*$/.test(String(value))) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

export default {
  async account(userId) {
    const parsed = id(userId);
    if (parsed === null) return { success: false, status: 400, message: 'Identificador inválido.' };
    try {
      const account = await repository.getAccount(parsed);
      return account
        ? { success: true, ...account }
        : { success: false, status: 404, message: 'Usuario no encontrado.' };
    } catch (error) {
      return { success: false, status: 500, message: error.message };
    }
  },
  async benefits(userId) {
    const parsed = id(userId);
    if (parsed === null) return { success: false, status: 400, message: 'Identificador inválido.' };
    try {
      const result = await repository.getBenefits(parsed);
      return result
        ? { success: true, ...result }
        : { success: false, status: 404, message: 'Usuario no encontrado.' };
    } catch (error) {
      return { success: false, status: 500, message: error.message };
    }
  },
  async redeem(userId, benefitId) {
    const user = id(userId);
    const benefit = id(benefitId);
    if (user === null || benefit === null)
      return { success: false, status: 400, message: 'Identificador inválido.' };
    try {
      const redemption = await repository.redeem(user, benefit);
      return { success: true, redemption, message: 'Beneficio canjeado correctamente.' };
    } catch (error) {
      return { success: false, status: error.status || 500, message: error.message };
    }
  }
};
