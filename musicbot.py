import discord
from discord.ext import commands
import yt_dlp

class MusicBot(commands.Cog):
    def __init__(self, bot):
        self.bot = bot

    @commands.command()
    async def join(self, ctx):
        channel = ctx.author.voice.channel
        await channel.connect()

    @commands.command()
    async def leave(self, ctx):
        if ctx.voice_client:
            await ctx.voice_client.disconnect()

    @commands.command()
    async def play(self, ctx, url):
        if not ctx.voice_client:
            await ctx.invoke(self.bot.get_command("join"))

        # Specify the `format` parameter to download a lower quality audio format.
        with yt_dlp.YoutubeDL({'format': 'bestaudio[ext=m4a]', 'noplaylist':'True'}) as ydl:
            info = ydl.extract_info(url, download=False)
            url2 = info['formats'][0]['url']
            ctx.voice_client.play(discord.FFmpegPCMAudio(url2))

        # Handle errors gracefully.
        try:
            info = ydl.extract_info(url, download=False)
            url2 = info['formats'][0]['url']
            ctx.voice_client.play(discord.FFmpegPCMAudio(url2))
        except Exception as e:
            print(e)
            return


def setup(bot):
    bot.add_cog(MusicBot(bot))

