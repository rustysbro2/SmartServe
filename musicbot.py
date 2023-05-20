import discord
from discord.ext import commands
import yt_dlp
import os
import asyncio
from collections import deque

class MusicBot(commands.Cog):
    def __init__(self, bot):
        self.bot = bot
        self.queue = deque()
        self.is_playing = False

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

        ydl_opts = {'format': 'bestaudio/best', 'outtmpl': 'downloads/%(id)s.%(ext)s'}
        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(url, download=True)
                filename = ydl.prepare_filename(info)
                self.queue.append((filename, ctx.author))
                await self.play_queue(ctx)
                await ctx.send(f"Added to the queue: {info['title']}")
        except Exception as e:
            print(e)

    async def play_queue(self, ctx):
        if not self.is_playing and self.queue:
            self.is_playing = True
            filename, requester = self.queue.popleft()
            voice_channel = ctx.voice_client
            try:
                voice_channel.play(discord.FFmpegPCMAudio(filename), after=lambda e: self.check_queue(ctx))
                await ctx.send(f"Now playing: {filename} (requested by {requester})")
            except Exception as e:
                print(e)
                self.is_playing = False

    def check_queue(self, ctx):
        if not self.queue:
            self.is_playing = False
            asyncio.run_coroutine_threadsafe(ctx.send("Queue is empty. Leaving voice channel."), self.bot.loop)
        else:
            asyncio.run_coroutine_threadsafe(self.play_queue(ctx), self.bot.loop)

def setup(bot):
    bot.add_cog(MusicBot(bot))
