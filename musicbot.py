import discord
from discord.ext import commands
import youtube_dl

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
        
        with youtube_dl.YoutubeDL({'format': 'bestaudio', 'noplaylist':'True'}) as ydl:
            info = ydl.extract_info(url, download=False)
            url2 = info['formats'][0]['url']
            ctx.voice_client.play(discord.FFmpegPCMAudio(url2))


def setup(bot):
    bot.add_cog(MusicBot(bot))
