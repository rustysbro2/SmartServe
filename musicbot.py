import discord
from discord.ext import commands
import youtube_dl
import youtube_dl.utils

class MusicBot(commands.Cog):
    def __init__(self, bot):
        self.bot = bot
        self.voice_client = None

    def debug_logger(self, message):
        print(message)  # Debug output for youtube_dl

    def debug_progress_hook(self, progress):
        print(progress)  # Progress updates for youtube_dl

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
            ydl_opts = {
                'format': 'bestaudio/best',
                'postprocessors': [{
                    'key': 'FFmpegExtractAudio',
                    'preferredcodec': 'mp3',
                    'preferredquality': '192',
                }],
                'logger': self.debug_logger,
                'progress_hooks': [self.debug_progress_hook],
            }
            with youtube_dl.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(url, download=False)
                audio_url = info['formats'][0]['url']

            if self.voice_client.is_playing():
                self.voice_client.stop()

            self.voice_client.play(discord.FFmpegPCMAudio(audio_url))
            await ctx.send("Now playing: " + info['title'])
        except youtube_dl.utils.DownloadError:
            await ctx.send("Failed to load the video. Please provide a valid YouTube URL.")
        except youtube_dl.utils.ExtractorError:
            await ctx.send("Failed to extract the audio from the video. Please try again later.")
        except discord.errors.ClientException:
            await ctx.send("Failed to play the audio. Please make sure I have the necessary permissions.")
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
