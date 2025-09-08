import { DataTypes } from 'sequelize';
import sequelize from '../config/sequelize.js';
import Hotel from './Hotel.js';

const InvoiceSetting = sequelize.define('InvoiceSetting', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  address: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  footerQuote: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: 'Thank you for your business.',
  },
}, {
  timestamps: true,
});

// Setiap Hotel memiliki satu set pengaturan invoice
Hotel.hasOne(InvoiceSetting);
InvoiceSetting.belongsTo(Hotel);

export default InvoiceSetting;