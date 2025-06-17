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
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
    totalPrice: {
    type: DataTypes.DECIMAL(10,2),
    allowNull: false,       // full stay total
  },
  status: {
    type: DataTypes.ENUM('tentative', 'booked', 'checkedin', 'checkedout', 'cancelled'),
    defaultValue: 'booked',
  },
});

// Associations
Booking.belongsTo(Room);
Booking.belongsTo(Guest);
Room.hasMany(Booking);
Guest.hasMany(Booking);

export default Booking;
