//database.js
const mysql = require("mysql2");
const mysqlPromise = require("mysql2/promise");
const { promisify } = require("util");

const isBeta = process.env.BETA === "true";
const dbConfig = isBeta
  ? process.env.DB_CONFIG_SMARTBETA
  : process.env.DB_CONFIG_SMARTSERVE;
const dbConfigRegex =
  /DB_HOST=(\S+)\s+DB_USER=(\S+)\s+DB_PASSWORD=(\S+)\s+DB_DATABASE=(\S+)/;
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

async function createCountTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS count_table (
        id INT PRIMARY KEY AUTO_INCREMENT,
        guild_id VARCHAR(255) NOT NULL,
        channel_id VARCHAR(255) NOT NULL,
        current_count INT NOT NULL DEFAULT 0,
        CONSTRAINT uc_guild_id UNIQUE (guild_id)
      )
    `);
    console.log("Count table created");
  } catch (error) {
    console.error("Error creating count table:", error);
  }
}

async function createInviteTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS invites (
        guildId VARCHAR(255),
        code VARCHAR(255),
        uses INT,
        inviterId VARCHAR(255),
        PRIMARY KEY (guildId, code)
      )
    `);
    console.log("Invite table created");
  } catch (error) {
    console.error("Error creating invite table:", error);
  }
}

async function createGuildsTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS guilds (
        join_message_channel VARCHAR(255) NOT NULL,
        leave_message_channel VARCHAR(255) NOT NULL,
        target_guild_id VARCHAR(255) NOT NULL
      )
    `);
    console.log("Guilds table created");
  } catch (error) {
    console.error("Error creating guilds table:", error);
  }
}

async function createCommandTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS commands (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(255) NOT NULL,
        description VARCHAR(255) NOT NULL
      )
    `);
    console.log("Commands table created");
  } catch (error) {
    console.error("Error creating commands table:", error);
  }
}

async function createStrikesTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS strikes (
        id INT PRIMARY KEY AUTO_INCREMENT,
        guild_id VARCHAR(255) NOT NULL,
        user_id VARCHAR(255) NOT NULL,
        strike_count INT NOT NULL DEFAULT 0
      )
    `);
    console.log("Strikes table created");
  } catch (error) {
    console.error("Error creating strikes table:", error);
  }
}

async function createStrikeChannelsTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS strike_channels (
        guild_id VARCHAR(255) PRIMARY KEY,
        channel_id VARCHAR(255) NOT NULL
      )
    `);
    console.log("Strike channels table created");
  } catch (error) {
    console.error("Error creating strike channels table:", error);
  }
}

async function createTables() {
  try {
    await createCountTable();
    await createInviteTable();
    await createGuildsTable();
    await createCommandTable();
    await createStrikesTable();
    await createStrikeChannelsTable(); // Call the createStrikeChannelsTable function
    console.log("Database tables created");
  } catch (error) {
    console.error("Error creating database tables:", error);
  }
}

createTables();

module.exports = {
  pool,
  connection,
};
