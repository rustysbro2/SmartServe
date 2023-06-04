const { SlashCommandBuilder } = require('discord.js');
const { setStrikeChannel, getStrikes } = require('../features/strikeFeature');
const { MessageEmbed } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setstrikechannel')
    .setDescription('Set the strike channel')
    .addChannelOption(option =>
      option.setName('channel')
        .setDescription('Select the strike channel')
        .setRequired(true)
    ),
  async execute(interaction) {
    const channel = interaction.options.getChannel('channel');
    const guildId = interaction.guild.id;

    // Set the strike channel
    setStrikeChannel(guildId, channel.id);

    // Fetch the strikes and update the embed
    const strikes = await getStrikes(guildId);

    const embed = new MessageEmbed()
      .setTitle('Strike List')
      .setDescription('List of players with their strike counts');

    strikes.forEach(strike => {
      embed.addField(strike.userTag, `Strikes: ${strike.count}`, true);
    });

    channel.send({ embeds: [embed] });

    await interaction.reply('Strike channel has been set successfully.');
  },
};
