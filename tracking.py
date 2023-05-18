import discord
from discord.ext import commands
import json

class Tracking(commands.Cog):
    def __init__(self, bot):
        self.bot = bot

    @commands.command()
    @commands.has_permissions(administrator=True)
    async def tracking(self, ctx, channel: discord.TextChannel = None):
        guild_id = str(ctx.guild.id)

        # Load existing data from the JSON file
        with open('count_data.json', 'r') as f:
            all_data = json.load(f)

        if channel is None:
            # Retrieve the current tracking channel for the guild
            data = all_data.get(guild_id)
            if data and data['tracking_channel_id']:
                channel_id = data['tracking_channel_id']
                channel = self.bot.get_channel(int(channel_id))
                if channel:
                    await ctx.send(f"The current tracking channel is {channel.mention}.")
                else:
                    await ctx.send("The current tracking channel is invalid or no longer accessible.")
            else:
                await ctx.send("No tracking channel is currently set.")
        else:
            # Update the tracking channel ID for the guild
            all_data[guild_id] = {
                'tracking_channel_id': str(channel.id)
            }

            # Save the updated data back to the JSON file
            with open('count_data.json', 'w') as f:
                json.dump(all_data, f, indent=4)

            await ctx.send(f"The tracking channel has been set to {channel.mention}.")

def setup(bot):
    bot.add_cog(Tracking(bot))
