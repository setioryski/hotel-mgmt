import { DataTypes } from 'sequelize';
import sequelize from '../config/sequelize.js';

const Hotel = sequelize.define('Hotel', {
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  address: DataTypes.STRING,
  contact: DataTypes.STRING,
});

export default Hotel;
