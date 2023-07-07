const mysql = require('mysql2');
const mysqlPromise = require('mysql2/promise');
const { promisify } = require('util');
const dotenv = require('dotenv');

dotenv.config(); // Load environment variables from .env file

const dbConfig = process.env.DB_CONFIG;
const dbConfigRegex = /DB_HOST=(\S+)\s+DB_USER=(\S+)\s+DB_PASSWORD=(\S+)\s+DB_DATABASE=(\S+)/;
const [, host, user, password, database] = dbConfigRegex.exec(dbConfig);

const pool = mysql.createPool({
  host,
  user,
  password,
  database,
});

pool.query = promisify(pool.query);

const connection = mysqlPromise.createPool({
  host,
  user,
  password,
  database,
});

module.exports = {
  pool,
  connection
};
