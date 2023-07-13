const {
  SlashCommandBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
  PermissionsBitField
} = require('discord.js')
const path = require('path')
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') })

const guildId = process.env.guildId

async function handleSelectMenu (interaction, commandCategories) {
  console.log('Interaction guild ID:', interaction.guildId)
  console.log('Stored guild ID:', guildId)
  const selectedCategory = interaction.values[0]
  const category = commandCategories.find(
    (category) =>
      category.name.toLowerCase().replace(/\s/g, '_') === selectedCategory
  )

  let categoryEmbed

  if (category) {
    categoryEmbed = new EmbedBuilder()
    categoryEmbed.setTitle(`Commands - ${category.name}`)
    categoryEmbed.setDescription(
      category.categoryDescription || 'No description available.'
    )

    const commandsToShow = category.commands.filter((command) => {
      console.log('Command:', command.name)
      console.log('Global:', command.global)
      console.log('Interaction guild ID:', interaction.guildId)
      console.log('Stored guild ID:', guildId)
      const shouldShow =
        command.global === true ||
        (command.global === false &&
          interaction.guildId === '1106643216125665350')
      console.log('Should Show:', shouldShow)
      return shouldShow
    })

    console.log('Commands to show:', commandsToShow) // Debugging line

    commandsToShow.forEach((command) => {
      categoryEmbed.addFields({
        name: command.name,
        value: command.description
      })
    })

    try {
      if (interaction.message) {
        const actionRow = new ActionRowBuilder().addComponents(
          ...interaction.message.components[0].components
        )
        await interaction.deferUpdate()
        await interaction.message.edit({
          embeds: [categoryEmbed],
          components: [actionRow]
        })
      } else {
        console.error('Interaction does not have a message.')
      }
    } catch (error) {
      console.error('Error deferring or editing interaction:', error)
    }
  } else {
    console.error(`Category '${selectedCategory}' not found.`)
  }
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('List all commands or info about a specific command'),

  async execute (interaction, client, commandCategories) {
    // Bot Permissions
    const guild = interaction.guild
    const botMember = await guild.members.fetch(interaction.client.user.id)

    if (
      !interaction.guild.members.me.permissions.has(
        PermissionsBitField.Flags.EmbedLinks |
          PermissionsBitField.Flags.SendMessages |
          PermissionsBitField.Flags.ViewChannel
      )
    ) {
      await interaction.reply(
        "I need the 'Embed Links', 'Send Messages', and 'View Channel' permissions to use this command."
      )
      return
    }

    if (interaction.deferred || interaction.replied) {
      console.log('Interaction already deferred or replied to.')
      return
    }

    const filteredCommandCategories = commandCategories
      .filter((category) =>
        category.commands.some(
          (command) =>
            command.global === true ||
            (command.global === false &&
              interaction.guildId === '1106643216125665350')
        )
      )
      .slice(0, 10)

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('help_category')
      .setPlaceholder('Select a category')

    filteredCommandCategories.forEach((category) => {
      if (
        category.commands.some(
          (command) =>
            command.global !== false || command.guildId === undefined
        )
      ) {
        const categoryName = category.name.toLowerCase().replace(/\s/g, '_')
        selectMenu.addOptions(
          new StringSelectMenuOptionBuilder()
            .setLabel(category.name)
            .setValue(categoryName)
            .setDescription(
              category.categoryDescription || 'No description available.'
            )
        )
      }
    })

    const actionRow = new ActionRowBuilder().addComponents(selectMenu)

    try {
      await interaction.reply({
        content: 'Please select a category:',
        components: [actionRow]
      })
    } catch (error) {
      console.error('Error replying to interaction:', error)
    }
  },

  handleSelectMenu
}
