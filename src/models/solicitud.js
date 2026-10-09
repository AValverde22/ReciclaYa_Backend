import _sequelize from 'sequelize';
const { Model, Sequelize } = _sequelize;

export default class solicitud extends Model {
  static init(sequelize, DataTypes) {
  return super.init({
    id: {
      autoIncrement: true,
      autoIncrementIdentity: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    type: {
      type: DataTypes.ENUM("Papel","Plástico","Vidrio"),
      allowNull: false
    },
    size: {
      type: DataTypes.ENUM("Extrapequeña","Mediana","Grande","Pequeña","Extragrande"),
      allowNull: false
    },
    day: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    time: {
      type: DataTypes.TIME,
      allowNull: false
    },
    address: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    latitude: {
      type: DataTypes.DOUBLE,
      allowNull: false
    },
    longitude: {
      type: DataTypes.DOUBLE,
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM("Disponible","Finalizada","Cancelada"),
      allowNull: false,
      defaultValue: "Disponible"
    },
    created_by: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'user',
        key: 'id'
      }
    },
    accepted_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'user',
        key: 'id'
      }
    }
  }, {
    sequelize,
    tableName: 'solicitud',
    schema: 'public',
    timestamps: false,
    indexes: [
      {
        name: "solicitud_pkey",
        unique: true,
        fields: [
          { name: "id" },
        ]
      },
    ]
  });
  }
}
