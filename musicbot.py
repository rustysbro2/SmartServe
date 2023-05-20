import discord
from discord.ext import commands
import pytube

class MusicBot(commands.Cog):
    def __init__(self, bot):
        self.bot = bot

    @commands.command()
    async def join(self, ctx):
        if ctx.author.voice is None:
            await ctx.send("You are not connected to a voice channel.")
            return

        channel = ctx.author.voice.channel
        await channel.connect()

    @commands.command()
    async def leave(self, ctx):
        if ctx.voice_client is not None:
            await ctx.voice_client.disconnect()

    @commands.command()
    async def play(self, ctx, url):
        if ctx.voice_client is None:
            await ctx.send("I'm not connected to a voice channel. Use the `join` command first.")
            return

        try:
            video = pytube.YouTube(url)
            audio_stream = video.streams.filter(only_audio=True).first()
            audio_url = audio_stream.url

            ctx.voice_client.stop()
            ctx.voice_client.play(discord.FFmpegPCMAudio(audio_url))
        except pytube.exceptions.PytubeError:
            await ctx.send("Failed to load the video. Please provide a valid YouTube URL.")

    @commands.command()
    async def pause(self, ctx):
        if ctx.voice_client.is_playing():
            ctx.voice_client.pause()

    @commands.command()
    async def resume(self, ctx):
        if ctx.voice_client.is_paused():
            ctx.voice_client.resume()

    @commands.command()
    async def stop(self, ctx):
        if ctx.voice_client.is_playing() or ctx.voice_client.is_paused():
            ctx.voice_client.stop()

def setup(bot):
    bot.add_cog(MusicBot(bot))
