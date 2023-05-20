import discord
from discord.ext import commands
import yt_dlp
import os

class MusicBot(commands.Cog):
    def __init__(self, bot):
        self.bot = bot

    @commands.command()
    async def join(self, ctx):
        if ctx.author.voice and ctx.author.voice.channel:
            channel = ctx.author.voice.channel
            await channel.connect()
        else:
            await ctx.send("You are not connected to a voice channel")

    @commands.command()
    async def leave(self, ctx):
        if ctx.voice_client:
            await ctx.voice_client.disconnect()

    @commands.command()
    async def play(self, ctx, url):
        if not ctx.voice_client:
            await ctx.invoke(self.bot.get_command("join"))
        
        if not ctx.voice_client:
            return

        # Specify the `format` parameter to download a lower quality audio format.
        ydl_opts = {'format': 'bestaudio/best', 'outtmpl': 'downloads/%(title)s.%(ext)s'}
        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(url, download=True)
                filename = ydl.prepare_filename(info)
                ctx.voice_client.play(discord.FFmpegPCMAudio(filename))
        except Exception as e:
            print(e)


def setup(bot):
    bot.add_cog(MusicBot(bot))
