import _sequelize from 'sequelize';
const { Model, Sequelize } = _sequelize;

// Reto de autenticación de dos factores: un registro activo por usuario.
// El código y el challenge se guardan solo como hash.
export default class two_factor_challenge extends Model {
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
      unique: "two_factor_challenge_user_key",
      references: {
        model: 'user',
        key: 'id'
      }
    },
    challenge_hash: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    code_hash: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: false
    },
    attempts: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    sent_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: Sequelize.fn('now')
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: Sequelize.fn('now')
    },
    //Atributos metadatos para mantenerlos al momento de registrar los inicios de sesión y proceso de doble autenticador en el modelo logAccesos
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
    dispositivo: {
      type: DataTypes.STRING(150),
      allowNull: true
    }
  }, {
    sequelize,
    tableName: 'two_factor_challenge',
    schema: 'public',
    timestamps: false,
    indexes: [
      {
        name: "two_factor_challenge_pkey",
        unique: true,
        fields: [
          { name: "id" },
        ]
      },
      {
        name: "two_factor_challenge_user_key",
        unique: true,
        fields: [
          { name: "user_id" },
        ]
      },
    ]
  });
  }
}
