import _sequelize from 'sequelize';
const { Model } = _sequelize;

export default class canje extends Model {
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
        references: { model: 'user', key: 'id' }
      },
      beneficio_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'beneficio', key: 'id' }
      },
      points_spent: { type: DataTypes.INTEGER, allowNull: false },
      status: {
        type: DataTypes.ENUM('Confirmado', 'Cancelado'),
        allowNull: false,
        defaultValue: 'Confirmado'
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: _sequelize.Sequelize.fn('now')
      }
    }, {
      sequelize,
      tableName: 'canje',
      schema: 'public',
      timestamps: false,
      indexes: [{ name: 'canje_pkey', unique: true, fields: [{ name: 'id' }] }]
    });
  }
}
