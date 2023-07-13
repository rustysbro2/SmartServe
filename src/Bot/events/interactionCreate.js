const helpCommand = require("../commands/General/help");

module.exports = async (interaction, client, commandCategories) => {
  try {
    if (
      interaction.isStringSelectMenu() &&
      interaction.customId === "help_category"
    ) {
      helpCommand.handleSelectMenu(interaction, commandCategories);
    } else if (interaction.isCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (command) {
        await command.execute(interaction, client, commandCategories);
      }
    }
  } catch (error) {
    console.error("Error handling interaction:", error);
  }
};
