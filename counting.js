const Discord = require("discord.js");

const bot = new Discord.Client();

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

bot.login("YOUR_BOT_TOKEN");
