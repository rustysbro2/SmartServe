// features/strikeFeature.js

const { db } = require('../database');

module.exports = {
  execute(client, interaction) {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'add') {
      const user = interaction.options.getUser('user');
      const reason = interaction.options.getString('reason');
      addStrike(user.id, reason)
        .then(() => {
          interaction.reply(`Strike added for user ${user.username} with reason: ${reason}`);
        })
        .catch((error) => {
          console.error('Error adding strike:', error);
          interaction.reply('Failed to add strike. Please try again.');
        });
    } else if (subcommand === 'remove') {
      const user = interaction.options.getUser('user');
      removeStrike(user.id)
        .then(() => {
          interaction.reply(`Strike removed for user ${user.username}`);
        })
        .catch((error) => {
          console.error('Error removing strike:', error);
          interaction.reply('Failed to remove strike. Please try again.');
        });
    } else if (subcommand === 'list') {
      const user = interaction.options.getUser('user');
      listStrikes(user.id)
        .then((strikes) => {
          interaction.reply(`Strikes for user ${user.username}: ${strikes.length}`);
        })
        .catch((error) => {
          console.error('Error listing strikes:', error);
          interaction.reply('Failed to list strikes. Please try again.');
        });
    }
  },
};

async function addStrike(userId, reason) {
  try {
    await createStrikesTableIfNotExists();

    const query = 'INSERT INTO strikes (user_id, reason) VALUES (?, ?)';
    await db.query(query, [userId, reason]);
  } catch (error) {
    throw error;
  }
}

async function removeStrike(userId) {
  try {
    await createStrikesTableIfNotExists();

    const query = 'DELETE FROM strikes WHERE user_id = ? ORDER BY id DESC LIMIT 1';
    await db.query(query, [userId]);
  } catch (error) {
    throw error;
  }
}

async function listStrikes(userId) {
  try {
    await createStrikesTableIfNotExists();

    const query = 'SELECT * FROM strikes WHERE user_id = ?';
    const [rows] = await db.query(query, [userId]);
    return rows;
  } catch (error) {
    throw error;
  }
}

async function createStrikesTableIfNotExists() {
  const query = `
    CREATE TABLE IF NOT EXISTS strikes (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id VARCHAR(255) NOT NULL,
      reason VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `;
  await db.query(query);
}
