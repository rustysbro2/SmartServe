// features/countingGame.js
const pool = require('../database');

module.exports = (client) => {
  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isCommand()) return;

    const { commandName, options, guildId } = interaction;

    if (commandName === 'setcountingchannel') {
      const channel = options.getChannel('channel');

      if (!channel.isText()) {
        return interaction.reply('Please select a text channel!');
      }

      await pool.query(
        'REPLACE INTO counting_game (guild_id, channel_id) VALUES (?, ?)',
        [guildId, channel.id]
      );

      return interaction.reply(`Counting game channel has been set to ${channel.name}.`);
    }
  });

  client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    const [game] = await pool.query(
      'SELECT channel_id, current_count FROM counting_game WHERE guild_id = ?',
      [message.guild.id]
    );

    if (!game || message.channel.id !== game.channel_id) {
      // Ignore messages that are not in the counting channel
      return;
    }

    const guess = parseInt(message.content);

    if (isNaN(guess)) {
      // Ignore messages that are not numbers
      return;
    }

    if (guess === game.current_count) {
      await pool.query(
        'UPDATE counting_game SET current_count = ? WHERE guild_id = ?',
        [game.current_count + 1, message.guild.id]
      );
    } else {
      message.channel.send(`Oops! ${message.author}, we were looking for the number ${game.current_count}. Let's try again.`);
      
      await pool.query(
        'UPDATE counting_game SET current_count = 1 WHERE guild_id = ?',
        [message.guild.id]
      );
    }
  });
}
