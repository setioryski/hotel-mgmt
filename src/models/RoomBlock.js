// src/models/RoomBlock.js

import { DataTypes } from 'sequelize';
import sequelize from '../config/sequelize.js';
import Room from './Room.js';

const RoomBlock = sequelize.define('RoomBlock', {
  startDate: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  endDate: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  reason: {
    type: DataTypes.STRING,
    allowNull: true,
  },
});

// Associations
RoomBlock.belongsTo(Room);
Room.hasMany(RoomBlock);

export default RoomBlock;
