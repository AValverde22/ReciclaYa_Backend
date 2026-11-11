import _sequelize from 'sequelize';
const { Model } = _sequelize;

export default class puntosMovimiento extends Model {
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
      solicitud_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'solicitud', key: 'id' }
      },
      canje_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'canje', key: 'id' }
      },
      type: {
        type: DataTypes.ENUM('Ganado', 'Canjeado'),
        allowNull: false
      },
      points: { type: DataTypes.INTEGER, allowNull: false },
      description: { type: DataTypes.TEXT, allowNull: false },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: _sequelize.Sequelize.fn('now')
      }
    }, {
      sequelize,
      tableName: 'puntos_movimiento',
      schema: 'public',
      timestamps: false,
      indexes: [
        { name: 'puntos_movimiento_pkey', unique: true, fields: [{ name: 'id' }] },
        {
          name: 'puntos_solicitud_usuario_tipo_key',
          unique: true,
          fields: [{ name: 'solicitud_id' }, { name: 'user_id' }, { name: 'type' }]
        }
      ]
    });
  }
}
