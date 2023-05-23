// database.js
const mysql = require('mysql');

let pool = mysql.createPool({
    connectionLimit: 10, // Important: set limits to avoid full table scans
    host: "localhost",
    user: "root",
    password: "",
    database: "SmartServe"
});

module.exports = pool;
