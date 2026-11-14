import _sequelize from 'sequelize';
const { Model } = _sequelize;

export default class profileChange extends Model {
  static init(sequelize, DataTypes) {
    return super.init({
      id: {
        autoIncrement: true,
        autoIncrementIdentity: true,
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true
      },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        unique: 'profile_change_user_key',
        references: { model: 'user', key: 'id' }
      },
      status: {
        type: DataTypes.ENUM('Validado', 'Pendiente de validación'),
        allowNull: false,
        defaultValue: 'Validado'
      },
      sensitive_fields: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: _sequelize.Sequelize.fn('now')
      }
    }, {
      sequelize,
      tableName: 'profile_change',
      schema: 'public',
      timestamps: false,
      indexes: [
        { name: 'profile_change_pkey', unique: true, fields: [{ name: 'id' }] },
        { name: 'profile_change_user_key', unique: true, fields: [{ name: 'user_id' }] }
      ]
    });
  }
}
