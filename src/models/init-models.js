import _sequelize from "sequelize";
const DataTypes = _sequelize.DataTypes;
import _solicitud from  "./solicitud.js";
import _user from  "./user.js";
import _verification_code from  "./verification_code.js";
import _calificacion from "./calificacion.js";
import _two_factor_challenge from "./two_factor_challenge.js";
import _logAccesos from './logAccesos.js';
import _reportesActividad from "./reportesActividad.js";
import _profileChange from "./profileChange.js";
import _beneficio from "./beneficio.js";
import _canje from "./canje.js";
import _puntosMovimiento from "./puntosMovimiento.js";

const cache = new WeakMap();
export default function initModels(sequelize) {
  if (cache.has(sequelize)) return cache.get(sequelize);
  const solicitud = _solicitud.init(sequelize, DataTypes);
  const user = _user.init(sequelize, DataTypes);
  const verification_code = _verification_code.init(sequelize, DataTypes);
  const calificacion = _calificacion.init(sequelize, DataTypes);
  const two_factor_challenge = _two_factor_challenge.init(sequelize, DataTypes);
  const logAccesos = _logAccesos.init(sequelize, DataTypes);
  const reportesActividad = _reportesActividad.init(sequelize, DataTypes);
  const profileChange = _profileChange.init(sequelize, DataTypes);
  const beneficio = _beneficio.init(sequelize, DataTypes);
  const canje = _canje.init(sequelize, DataTypes);
  const puntosMovimiento = _puntosMovimiento.init(sequelize, DataTypes);

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
  two_factor_challenge.belongsTo(user, { as: "user", foreignKey: "user_id"});
  user.hasOne(two_factor_challenge, { as: "two_factor_challenge", foreignKey: "user_id"});
  user.hasMany(logAccesos, {as: 'logs', foreignKey: 'user_id'});
  logAccesos.belongsTo(user, {as: 'usuario', foreignKey: 'user_id'});
  reportesActividad.belongsTo(user, {as: "usuario", foreignKey: "user_id"});
  user.hasMany(reportesActividad, {as: "reporte", foreignKey: "user_id"});
  reportesActividad.belongsTo(logAccesos, {as: "log_acceso", foreignKey: "logAccesos_id"});
  logAccesos.hasMany(reportesActividad, {as: "reportes", foreignKey: "logAccesos_id"});
  profileChange.belongsTo(user, { as: 'user', foreignKey: 'user_id' });
  user.hasOne(profileChange, { as: 'profile_change', foreignKey: 'user_id' });
  canje.belongsTo(user, { as: 'user', foreignKey: 'user_id' });
  user.hasMany(canje, { as: 'canjes', foreignKey: 'user_id' });
  canje.belongsTo(beneficio, { as: 'beneficio', foreignKey: 'beneficio_id' });
  beneficio.hasMany(canje, { as: 'canjes', foreignKey: 'beneficio_id' });
  puntosMovimiento.belongsTo(user, { as: 'user', foreignKey: 'user_id' });
  user.hasMany(puntosMovimiento, { as: 'puntos_movimientos', foreignKey: 'user_id' });
  puntosMovimiento.belongsTo(solicitud, { as: 'solicitud', foreignKey: 'solicitud_id' });
  solicitud.hasMany(puntosMovimiento, { as: 'puntos_movimientos', foreignKey: 'solicitud_id' });
  puntosMovimiento.belongsTo(canje, { as: 'canje', foreignKey: 'canje_id' });
  canje.hasOne(puntosMovimiento, { as: 'movimiento', foreignKey: 'canje_id' });

  const models = {
    solicitud,
    user,
    verification_code,
    calificacion,
    two_factor_challenge,
    logAccesos,
    reportesActividad,
    profileChange,
    beneficio,
    canje,
    puntosMovimiento
  };
  cache.set(sequelize, models);
  return models;
}
