// database.js
const mysql = require('mysql2');
const { promisify } = require('util');

const pool = mysql.createPool({
    connectionLimit: 10, // Important: set limits to avoid full table scans
    host: "localhost",
    user: "rustysbro",
    password: "Dincas2029@/",
    database: "SmartServe"
});

pool.query = promisify(pool.query);

module.exports = pool;
