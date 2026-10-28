import _sequelize from "sequelize";
const DataTypes = _sequelize.DataTypes;
import _solicitud from  "./solicitud.js";
import _user from  "./user.js";
import _verification_code from  "./verification_code.js";
import _calificacion from "./calificacion.js";

const cache = new WeakMap();
export default function initModels(sequelize) {
  if (cache.has(sequelize)) return cache.get(sequelize);
  const solicitud = _solicitud.init(sequelize, DataTypes);
  const user = _user.init(sequelize, DataTypes);
  const verification_code = _verification_code.init(sequelize, DataTypes);
  const calificacion = _calificacion.init(sequelize, DataTypes);

  solicitud.belongsTo(user, { as: "accepted_by_user", foreignKey: "accepted_by"});
  user.hasMany(solicitud, { as: "solicituds", foreignKey: "accepted_by"});
  solicitud.belongsTo(user, { as: "created_by_user", foreignKey: "created_by"});
  user.hasMany(solicitud, { as: "created_by_solicituds", foreignKey: "created_by"});
  verification_code.belongsTo(user, { as: "user", foreignKey: "user_id"});
  user.hasMany(verification_code, { as: "verification_codes", foreignKey: "user_id"});
  calificacion.belongsTo(solicitud, { as: "solicitud", foreignKey: "solicitud_id" });
  solicitud.hasMany(calificacion, { as: "calificaciones", foreignKey: "solicitud_id" });
  calificacion.belongsTo(user, { as: "evaluador", foreignKey: "evaluador_id" });
  user.hasMany(calificacion, { as: "calificaciones_dadas", foreignKey: "evaluador_id" });
  calificacion.belongsTo(user, { as: "evaluado", foreignKey: "evaluado_id" });
  user.hasMany(calificacion, { as: "calificaciones_recibidas", foreignKey: "evaluado_id" });

  const models = {
    solicitud,
    user,
    verification_code,
    calificacion,
  };
  cache.set(sequelize, models);
  return models;
}
