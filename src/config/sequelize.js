import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASS,
  {
    host: process.env.DB_HOST || 'localhost',
    dialect: 'mysql',
    logging: false,
    // Ensure writes and reads use Jakarta time (UTC+7)
    timezone: '+07:00',
    dialectOptions: {
      timezone: '+07:00',
      // (Optional) return DATE/DATETIME as strings rather than JS Date objects
      dateStrings: true,
      typeCast: true
    },
  }
);

export default sequelize;
