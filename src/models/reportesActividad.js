
import _sequelize from 'sequelize';
const { Model } = _sequelize;

export default class reportesActividad extends Model {
    static init(sequelize, DataTypes) {
        return super.init({
            id: {
                autoIncrement: true,
                type: DataTypes.INTEGER,
                allowNull: false,
                primaryKey: true
            },
            logAccesos_id: {
                type: DataTypes.INTEGER,
                allowNull: false,
                references: {
                    model: 'logAccesos',
                    key: 'id'
                }
            },
            user_id: {
                type: DataTypes.INTEGER,
                allowNull: false,
                references: {
                    model: 'user',
                    key: 'id'
                }
            },
            descripcion: {
                type: DataTypes.TEXT,
                allowNull: true
            },
            fecha_reporte: {
                type: DataTypes.DATE,
                allowNull: false,
                defaultValue: DataTypes.NOW
            },
            estado: {
                type: DataTypes.STRING(20),
                allowNull: false,
                defaultValue: 'Registrado'
            }
        }, {
            sequelize,
            tableName: 'reportesActividad',
            schema: 'public',
            timestamps: false,
            indexes: [
                {
                    name: 'reportesActividad_pkey',
                    unique: true,
                    fields: [{ name: 'id' }]
                },
                {
                    name: 'uq_reportesActividad_acceso',
                    unique: true,
                    fields: [
                        { name: 'logAccesos_id' },
                        { name: 'user_id' }
                    ]
                }
            ]
        });
    }
}