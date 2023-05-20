onst Discord = require("discord.js");

const bot = new Discord.Client();

bot.slashCommands = new Discord.SlashCommands(bot);

bot.on("ready", () => {
  console.log("Bot is ready!");
});

bot.slashCommands.create("hello", {
  description: "Says hello to the user.",
  options: [
    {
      name: "name",
      type: "string",
      description: "The user's name.",
    },
  ],
  callback: async (interaction) => {
    const name = interaction.options.get("name");
    await interaction.reply(`Hello, ${name}!`);
  },
});
bot.login("MTEwNTU5ODczNjU1MTM4NzI0Nw.G-i9vg.q3zXGRKAvdtozwU0JzSpWCSDH1bfLHvGX801RY");
