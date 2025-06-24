// src/models/AccountingEntry.js

import { DataTypes } from 'sequelize';
import sequelize from '../config/sequelize.js';
import Hotel from './Hotel.js';
import Booking from './Booking.js';

const AccountingEntry = sequelize.define('AccountingEntry', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  type: {
    type: DataTypes.ENUM('income', 'expense'),
    allowNull: false,
  },
  amount: {
    type: DataTypes.DECIMAL(10,2),
    allowNull: false,
  },
  description: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
});

// Associations
AccountingEntry.belongsTo(Hotel);
Hotel.hasMany(AccountingEntry);

AccountingEntry.belongsTo(Booking, { allowNull: true });
Booking.hasMany(AccountingEntry);

export default AccountingEntry;
