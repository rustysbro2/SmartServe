import discord
from discord.ext import commands
import json

class Tracking(commands.Cog):
    def __init__(self, bot):
        self.bot = bot

    @commands.Cog.listener()
    async def on_invite_create(self, invite):
        guild_id = str(invite.guild.id)

        # Load existing data from the JSON file
        with open('invite_data.json', 'r') as f:
            all_data = json.load(f)

        # Update the invite data for the guild
        all_data[guild_id] = invite.code

        # Save the updated data back to the JSON file
        with open('invite_data.json', 'w') as f:
            json.dump(all_data, f, indent=4)

    @commands.command()
    async def tracking(self, ctx):
        guild_id = str(ctx.guild.id)

        # Load existing data from the JSON file
        with open('invite_data.json', 'r') as f:
            all_data = json.load(f)

        # Retrieve the current tracking invite for the guild
        invite_code = all_data.get(guild_id)

        if invite_code:
            invite_url = f"https://discord.gg/{invite_code}"
            await ctx.send(f"The current tracking invite is: {invite_url}.")
        else:
            await ctx.send("No tracking invite is currently set.")

def setup(bot):
    bot.add_cog(Tracking(bot))
