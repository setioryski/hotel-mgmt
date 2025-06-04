// src/models/Booking.js

import { DataTypes } from 'sequelize';
import sequelize from '../config/sequelize.js';
import Room from './Room.js';
import Guest from './Guest.js';

const Booking = sequelize.define('Booking', {
  startDate: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  endDate: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  status: {
    type: DataTypes.STRING,
    defaultValue: 'confirmed',
  },
  guestStatus: {
    type: DataTypes.ENUM('pending', 'checked_in', 'checked_out'),
    defaultValue: 'pending',
  },
});

Booking.belongsTo(Room);
Booking.belongsTo(Guest);
Room.hasMany(Booking);
Guest.hasMany(Booking);

export default Booking;
