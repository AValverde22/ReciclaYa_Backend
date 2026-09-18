import _sequelize from "sequelize";
const DataTypes = _sequelize.DataTypes;
import _user from  "./user.js";
import _verification_code from  "./verification_code.js";

export default function initModels(sequelize) {
  const user = _user.init(sequelize, DataTypes);
  const verification_code = _verification_code.init(sequelize, DataTypes);
  
  verification_code.belongsTo(user, { as: "user", foreignKey: "user_id"});
  user.hasMany(verification_code, { as: "verification_codes", foreignKey: "user_id"});

  return {
    user,
    verification_code
  };
}
