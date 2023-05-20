import discord
from discord.ext import commands
import youtube_dl

class MusicBot(commands.Cog):
    def __init__(self, bot):
        self.bot = bot
        self.voice_client = None

    @commands.Cog.listener()
    async def on_voice_state_update(self, member, before, after):
        try:
            if self.voice_client is not None and self.voice_client.is_connected() and len(self.voice_client.channel.members) == 1:
                # Only bot remains in the voice channel
                await self.voice_client.disconnect()
                self.voice_client = None
        except Exception as e:
            print(f"An error occurred in on_voice_state_update: {e}")

    @commands.command()
    async def play(self, ctx, url):
        if ctx.author.voice is None:
            await ctx.send("You are not connected to a voice channel.")
            return

        if self.voice_client is None:
            channel = ctx.author.voice.channel
            self.voice_client = await channel.connect()

        try:
            ydl_opts = {
                'format': 'bestaudio/best',
                'postprocessors': [{
                    'key': 'FFmpegExtractAudio',
                    'preferredcodec': 'mp3',
                    'preferredquality': '192',
                }],
            }
            with youtube_dl.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(url, download=False)
                audio_url = info['formats'][0]['url']

            if self.voice_client.is_playing():
                self.voice_client.stop()

            self.voice_client.play(discord.FFmpegPCMAudio(audio_url))
            await ctx.send("Now playing: " + info['title'])
        except youtube_dl.DownloadError:
            await ctx.send("Failed to load the video. Please provide a valid YouTube URL.")
        except Exception as e:
            await ctx.send(f"An error occurred while playing the video: {e}")

    @commands.command()
    async def pause(self, ctx):
        if self.voice_client is not None and self.voice_client.is_playing():
            self.voice_client.pause()
            await ctx.send("Playback paused.")

    @commands.command()
    async def resume(self, ctx):
        if self.voice_client is not None and self.voice_client.is_paused():
            self.voice_client.resume()
            await ctx.send("Playback resumed.")

    @commands.command()
    async def stop(self, ctx):
        if self.voice_client is not None and (self.voice_client.is_playing() or self.voice_client.is_paused()):
            self.voice_client.stop()
            await ctx.send("Playback stopped.")

def setup(bot):
    bot.add_cog(MusicBot(bot))