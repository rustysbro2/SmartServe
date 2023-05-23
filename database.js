// database.js
const mysql = require('mysql');

let pool = mysql.createPool({
    connectionLimit: 10, // Important: set limits to avoid full table scans
    host: "localhost",
    user: "yourusername",
    password: "yourpassword",
    database: "mydb"
});

module.exports = pool;
