const mysql = require('mysql2');
const { promisify } = require('util');

const pool = mysql.createPool({
  connectionLimit: 10,
  host: 'localhost',
  user: 'your_username',
  password: 'your_password',
  database: 'your_database_name',
});

const query = promisify(pool.query).bind(pool);

module.exports = query;
