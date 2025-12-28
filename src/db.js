import dotenv from 'dotenv';
import mysql from 'mysql2/promise';

dotenv.config({ path: '../.env.local' });
dotenv.config({ path: '../.env' });
dotenv.config();

const DB_NAME =
  process.env.NODE_ENV === 'test' ? `${process.env.DB_NAME}_test` : process.env.DB_NAME;

export default mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});
