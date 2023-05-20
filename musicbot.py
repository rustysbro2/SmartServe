import discord
from discord.ext import commands
import youtube_dl

class MusicBot(commands.Cog):
    def __init__(self, bot):
        self.bot = bot

    @commands.command(pass_context=True)
    async def play(self, ctx, url: str):
        # Connect to voice channel
        channel = ctx.message.author.voice.channel
        voice_channel = await channel.connect()

        # Download audio file
        ydl_opts = {'format': 'bestaudio'}
        with youtube_dl.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            url2 = info['formats'][0]['url']
            voice_channel.play(discord.FFmpegPCMAudio(executable="ffmpeg.exe", source=url2))

    @commands.command(pass_context=True)
    async def leave(self, ctx):
        voice_client = discord.utils.get(self.bot.voice_clients, guild=ctx.guild)
        if voice_client and voice_client.is_connected():
            await voice_client.disconnect()
        else:
            await ctx.send("I'm not in a voice channel.")

def setup(bot):
    bot.add_cog(MusicBot(bot))
