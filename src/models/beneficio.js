import _sequelize from 'sequelize';
const { Model } = _sequelize;

export default class beneficio extends Model {
  static init(sequelize, DataTypes) {
    return super.init({
      id: {
        autoIncrement: true,
        autoIncrementIdentity: true,
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true
      },
      code: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: 'beneficio_code_key'
      },
      name: { type: DataTypes.TEXT, allowNull: false },
      description: { type: DataTypes.TEXT, allowNull: false },
      provider: { type: DataTypes.TEXT, allowNull: false },
      points_required: { type: DataTypes.INTEGER, allowNull: false },
      conditions: { type: DataTypes.TEXT, allowNull: false },
      stock: { type: DataTypes.INTEGER, allowNull: true },
      active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true }
    }, {
      sequelize,
      tableName: 'beneficio',
      schema: 'public',
      timestamps: false,
      indexes: [
        { name: 'beneficio_pkey', unique: true, fields: [{ name: 'id' }] },
        { name: 'beneficio_code_key', unique: true, fields: [{ name: 'code' }] }
      ]
    });
  }
}
