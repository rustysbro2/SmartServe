const helpCommand = require('../commands/General/help');
const strikeCommand = require('../commands/strike');

module.exports = async (interaction, client, commandCategories) => {
  try {
    if (interaction.isSelectMenu() && interaction.customId === 'help_category') {
      helpCommand.handleSelectMenu(interaction, commandCategories);
    } else if (interaction.isCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (command) {
        await command.execute(interaction, client, commandCategories);
      }
    }
  } catch (error) {
    console.error('Error handling interaction:', error);
  }
};

async function handleStrikeCommand(interaction, client) {
  const strike = client.commands.get('strike');
  await strike.execute(interaction);
}
