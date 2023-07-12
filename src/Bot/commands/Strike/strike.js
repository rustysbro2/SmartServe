const { SlashCommandBuilder } = require('discord.js');
const { PermissionFlagsBits, PermissionsBitField } = require('discord.js');
const { strikePlayer, getStrikes, getStrikeChannel } = require('../../features/strikeLogic');
const { EmbedBuilder} = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('strike')
        .setDescription('Strike a user.')
        .addUserOption(option => 
            option.setName('target')
                .setDescription('The user to strike.')
                .setRequired(true))
        .addStringOption(option => 
            option.setName('reason')
                .setDescription('The reason for the strike.')
                .setRequired(true)),
    
    async execute(interaction) {
        const guild = interaction.guild;
        if (!interaction.guild.members.me.permissions.has(PermissionsBitField.Flags.ViewChannel | PermissionsBitField.Flags.SendMessages)) {
            await interaction.reply("I need the 'ViewChannel' and 'SendMessage' permissions in a text channel to use this command.");
            return;
        }

        const target = interaction.options.getUser('target');
        const reason = interaction.options.getString('reason');

        if (await strikePlayer(guild.id, target.id, reason)) {
            interaction.reply(`User <@${target.id}> has been striked for reason: ${reason}`);
        
            const strikes = await getStrikes(guild.id);
            const strikeChannelId = await getStrikeChannel(guild.id);

            const strikeChannel = guild.channels.cache.get(strikeChannelId);

            if (strikeChannel) {
                const embed = new MessageEmbed().setTitle('Strikes');

                // For each user, add a field to the embed with their total number of strikes and reasons
                for (const userId in strikes) {
                    const { count, reasons } = strikes[userId];
                    embed.addFields(`User <@${userId}>`, `${count} strike(s) for reasons: ${reasons.join(', ')}`);
                }

                strikeChannel.send({ embeds: [embed] });
            }
        } else {
            interaction.reply('Failed to strike user.');
        }
    },

    category: 'Moderation',
    categoryDescription: 'Commands related to moderation functionality',
};
