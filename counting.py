import discord
from discord.ext import commands
import pytube

class MusicBot(commands.Cog):
    def __init__(self, bot):
        self.bot = bot
        self.voice_client = None

    @commands.Cog.listener()
    async def on_voice_state_update(self, member, before, after):
        if self.voice_client is not None and self.voice_client.is_connected() and len(self.voice_client.channel.members) == 1:
            # Only bot remains in the voice channel
            await self.voice_client.disconnect()
            self.voice_client = None

    @commands.command()
    async def play(self, ctx, url):
        if ctx.author.voice is None:
            await ctx.send("You are not connected to a voice channel.")
            return

        if self.voice_client is None:
            channel = ctx.author.voice.channel
            self.voice_client = await channel.connect()

        try:
            video = pytube.YouTube(url)
            audio_stream = video.streams.filter(only_audio=True).first()
            audio_url = audio_stream.url

            if self.voice_client.is_playing():
                self.voice_client.stop()

            self.voice_client.play(discord.FFmpegPCMAudio(audio_url))
            await ctx.send("Now playing: " + video.title)
        except pytube.exceptions.PytubeError:
            await ctx.send("Failed to load the video. Please provide a valid YouTube URL.")

    @commands.command()
    async def pause(self, ctx):
        if self.voice_client is not None and self.voice_client.is_playing():
            self.voice_client.pause()

    @commands.command()
    async def resume(self, ctx):
        if self.voice_client is not None and self.voice_client.is_paused():
            self.voice_client.resume()

    @commands.command()
    async def stop(self, ctx):
        if self.voice_client is not None and (self.voice_client.is_playing() or self.voice_client.is_paused()):
            self.voice_client.stop()

def setup(bot):
    bot.add_cog(MusicBot(bot))
