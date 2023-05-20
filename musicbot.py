import discord
from discord.ext import commands
import yt_dlp
import os
from collections import deque

class MusicBot(commands.Cog):
    def __init__(self, bot):
        self.bot = bot
        # Create downloads directory if it doesn't exist
        if not os.path.exists('downloads'):
            os.makedirs('downloads')
        self.voice_clients = {}
        self.song_queues = {}

    @commands.command()
    async def join(self, ctx):
        if ctx.author.voice and ctx.author.voice.channel:
            channel = ctx.author.voice.channel
            voice_client = await channel.connect()
            self.voice_clients[channel.id] = voice_client
            self.song_queues[channel.id] = deque()
        else:
            await ctx.send("You are not connected to a voice channel")

    @commands.command()
    async def leave(self, ctx):
        voice_client = self.voice_clients.get(ctx.author.voice.channel.id)
        if voice_client:
            await voice_client.disconnect()
            del self.voice_clients[ctx.author.voice.channel.id]
            del self.song_queues[ctx.author.voice.channel.id]

    @commands.command()
    async def play(self, ctx, url):
        voice_client = self.voice_clients.get(ctx.author.voice.channel.id)
        if not voice_client:
            await ctx.invoke(self.bot.get_command("join"))
        
        voice_client = self.voice_clients.get(ctx.author.voice.channel.id)
        if not voice_client:
            return

        ydl_opts = {'format': 'bestaudio/best', 'outtmpl': 'downloads/%(id)s.%(ext)s'}
        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(url, download=True)
                filename = ydl.prepare_filename(info)
                self.song_queues[ctx.author.voice.channel.id].append(filename)
                if not voice_client.is_playing():
                    self.play_next(ctx.author.voice.channel.id)
        except Exception as e:
            print(e)

    def play_next(self, channel_id):
        if len(self.song_queues[channel_id]) > 0:
            next_song = self.song_queues[channel_id].popleft()
            source = discord.FFmpegPCMAudio(next_song)
            def after(error):
                if len(self.song_queues[channel_id]) > 0:
                    self.play_next(channel_id)
            self.voice_clients[channel_id].play(source, after=after)

def setup(bot):
    bot.add_cog(MusicBot(bot))