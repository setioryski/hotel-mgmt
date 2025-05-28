import { DataTypes } from 'sequelize';
import sequelize from '../config/sequelize.js';
import Hotel from './Hotel.js';

const Room = sequelize.define('Room', {
  number: DataTypes.STRING,
  type: DataTypes.STRING,
  price: DataTypes.DECIMAL(10, 2),
  status: {
    type: DataTypes.ENUM('available', 'booked'),
    defaultValue: 'available',
  },
});

Room.belongsTo(Hotel);
Hotel.hasMany(Room);

export default Room;
