const express = require("express");
const router = express.Router();
const dotenv = require("dotenv");
const path = require("path");
const { getClient } = require("../client");
const { pool } = require("../../database");

const envPath = path.resolve(__dirname, "../../.env");
dotenv.config({ path: envPath });

// Get the client instance
const client = getClient();

// Define the setupDatabase function
async function setupDatabase() {
  try {
    const guilds = await client.guilds.fetch(); // Fetch all guilds the bot is in

    const insertOrUpdateServersQuery =
      "INSERT INTO servers (id, name, description) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description)";

    for (const guild of guilds.values()) {
      await pool.query(insertOrUpdateServersQuery, [
        guild.id,
        guild.name,
        guild.description,
      ]);
    }

    console.log("Database populated successfully.");
  } catch (error) {
    console.error("Error populating database:", error);
  }
}

// Invoke the setupDatabase function
setupDatabase();

// Function to retrieve user's avatar URL
async function getUserAvatarURL(userId) {
  try {
    const user = await client.users.fetch(userId);
    return user.avatarURL({ dynamic: true });
  } catch (error) {
    console.error("Error fetching user's avatar:", error);
    return null;
  }
}

router.get("/:id", async (req, res) => {
  const serverId = req.params.id;

  try {
    const query = "SELECT * FROM web_users WHERE id = ? AND guilds LIKE ?";
    const [user] = await pool.query(query, [req.user.id, `%${serverId}%`]);



    if (user) {
      const server = {
        id: serverId,
        name: user.name,
        description: "Server Description", // Replace with the actual server description column from the table
      };

      const avatarURL = await getUserAvatarURL(user.discordId);

      res.render("server-details", { server, avatarURL });
    } else {
      res.status(404).send("User not found");
    }
  } catch (error) {
    console.error("Error retrieving server details:", error);
    res.status(500).send("Internal Server Error");
  }
});

module.exports = router;
