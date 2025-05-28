import { DataTypes } from 'sequelize';
import sequelize from '../config/sequelize.js';

const Guest = sequelize.define('Guest', {
  name: DataTypes.STRING,
  email: DataTypes.STRING,
  phone: DataTypes.STRING,
});

export default Guest;
