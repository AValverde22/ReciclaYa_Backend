import _sequelize from 'sequelize';
const { Model, Sequelize } = _sequelize;

export default class logAccesos extends Model {
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
          references: {
            model: 'user',
            key: 'id'
          }
        },
        direccion_ip: {
          type: DataTypes.STRING(45),
          allowNull: true
        },
        app_version: {
          type: DataTypes.STRING(20),
          allowNull: true
        },
        ciudad: {
          type: DataTypes.STRING(100),
          allowNull: true
        },
        pais: {
          type: DataTypes.STRING(100),
          allowNull: true
        },
        latitud: {
          type: DataTypes.DOUBLE,
          allowNull: true
        },
        longitud: {
          type: DataTypes.DOUBLE,
          allowNull: true
        },
        fecha_login: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW
        },
        estado: {
          type: DataTypes.STRING(20),
          allowNull: false,
          defaultValue: 'Autorizado'
        },
        tipo_actividad: {
          type: DataTypes.STRING(50),
          allowNull: false,
          defaultValue: 'Inicio de sesión'
        },
        dispositivo: {
        type: DataTypes.STRING(150),
        allowNull: true
        }
      }, {
        sequelize,
        tableName: 'logAccesos',
        schema: 'public',
        timestamps: false,
        indexes: [
          {
            name: "logAccesos_pkey",
            unique: true,
            fields: [
              { name: "id" },
            ]
          },
          {
            name: "idx_logAccesos_user_id",
            fields: [
              { name: "user_id" },
            ]
          }]
    });
  }
}
