// features/strikeFeature.js

const database = require('../database');

module.exports.execute = async (client, interaction) => {
  const subcommand = interaction.options.getSubcommand();
  const user = interaction.options.getUser('user');
  const action = interaction.options.getString('action');
  const reason = interaction.options.getString('reason');

  if (subcommand === 'manage') {
    if (action === 'add') {
      try {
        // Add a strike for the user
        await addStrike(user.id, reason);
        await interaction.reply(`${user.username} has been given a strike for: ${reason}`);
      } catch (error) {
        console.error('Error adding strike:', error);
        await interaction.reply('An error occurred while adding a strike.');
      }
    } else if (action === 'remove') {
      try {
        // Remove a strike for the user
        await removeStrike(user.id);
        await interaction.reply(`${user.username}'s strike has been removed.`);
      } catch (error) {
        console.error('Error removing strike:', error);
        await interaction.reply('An error occurred while removing a strike.');
      }
    }
  }
};

async function addStrike(userId, reason) {
  const query = 'INSERT INTO strikes (user_id, reason) VALUES (?, ?)';
  await database.query(query, [userId, reason]);
}

async function removeStrike(userId) {
  const query = 'DELETE FROM strikes WHERE user_id = ? LIMIT 1';
  await database.query(query, [userId]);
}
