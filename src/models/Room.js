import { DataTypes } from 'sequelize';
import sequelize from '../config/sequelize.js';
import Hotel from './Hotel.js';

const Room = sequelize.define('Room', {
  number: {
    type: DataTypes.STRING,
    allowNull: false
  },
  type: {
    type: DataTypes.STRING,
    allowNull: false
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('available', 'booked'),
    allowNull: false,
    defaultValue: 'available'
  },
  // ← NEW: whether to show this room in the scheduler
  visible: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
  // drag-order index
  position: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  }
});

Room.belongsTo(Hotel, { foreignKey: 'HotelId' });
Hotel.hasMany(Room,   { foreignKey: 'HotelId' });

export default Room;
