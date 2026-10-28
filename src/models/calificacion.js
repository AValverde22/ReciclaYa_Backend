import _sequelize from 'sequelize';
const { Model, Sequelize } = _sequelize;

export default class calificacion extends Model {
  static init(sequelize, DataTypes) {
    return super.init({
      id: {
        autoIncrement: true,
        autoIncrementIdentity: true,
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true
      },
      solicitud_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'solicitud',
          key: 'id'
        }
      },
      evaluador_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'user',
          key: 'id'
        }
      },
      evaluado_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'user',
          key: 'id'
        }
      },
      puntuacion: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
          min: 1,
          max: 5
        }
      },
      comentario: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: _sequelize.Sequelize.fn('now')
      }
    }, {
      sequelize,
      tableName: 'calificacion',
      schema: 'public',
      timestamps: false,
      indexes: [
        {
          name: "calificacion_pkey",
          unique: true,
          fields: [{ name: "id" }]
        },
        {
          name: "solicitud_evaluador_unica",
          unique: true,
          fields: [
            { name: "solicitud_id" },
            { name: "evaluador_id" }
          ]
        }
      ]
    });
  }
}