import discord
from discord.ext import commands
import yt_dlp
import os
import asyncio

class MusicBot(commands.Cog):
    def __init__(self, bot):
        self.bot = bot
        self.voice_queues = {}
        self.vote_skip = {}

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
            if ctx.voice_client.channel in self.voice_queues:
                del self.voice_queues[ctx.voice_client.channel]
                del self.vote_skip[ctx.voice_client.channel]

    @commands.command()
    async def play(self, ctx, url):
        if not ctx.voice_client:
            await self.join(ctx)
        
        if not ctx.voice_client:
            return

        if ctx.voice_client.channel not in self.voice_queues:
            self.voice_queues[ctx.voice_client.channel] = asyncio.Queue()
            self.vote_skip[ctx.voice_client.channel] = set()

        queue = self.voice_queues[ctx.voice_client.channel]
        ydl_opts = {'format': 'bestaudio/best', 'outtmpl': 'downloads/%(id)s.%(ext)s'}
        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(url, download=True)
                filename = ydl.prepare_filename(info)
                await queue.put((filename, ctx.author))
                if queue.qsize() == 1:
                    await self.play_queue(ctx.voice_client.channel)
                await ctx.send(f"Added to the queue: {info['title']}")
        except Exception as e:
            print(e)

    async def play_queue(self, voice_channel):
        queue = self.voice_queues[voice_channel]
        if queue.empty():
            return

        filename, requester = await queue.get()
        voice_client = voice_channel.guild.voice_client
        try:
            voice_client.play(discord.FFmpegPCMAudio(filename), after=lambda e: self.bot.loop.create_task(self.check_queue(voice_channel)))
            await voice_channel.send(f"Now playing: {filename} (requested by {requester})")

            while voice_client.is_playing() or voice_client.is_paused():
                if voice_channel in self.vote_skip and len(self.vote_skip[voice_channel]) >= (len(voice_channel.members) // 2) + 1:
                    voice_client.stop()
                    break

                await asyncio.sleep(1)  # Check vote skip status every second

        except Exception as e:
            print(e)

    async def check_queue(self, voice_channel):
        queue = self.voice_queues[voice_channel]
        if queue.empty():
            del self.voice_queues[voice_channel]
            del self.vote_skip[voice_channel]
            await voice_channel.send("Queue is empty. Leaving voice channel.")
            await self.leave(voice_channel)
        else:
            await self.play_queue(voice_channel)

    @commands.command()
    async def vote_skip(self, ctx):
        if not ctx.voice_client or ctx.voice_client.channel not in self.voice_queues:
            await ctx.send("No song is currently playing.")
            return

        voice_channel = ctx.voice_client.channel
        member = ctx.author
        vote_skip_set = self.vote_skip[voice_channel]
        vote_skip_set.add(member)

        votes_needed = (len(voice_channel.members) // 2) + 1

        if len(vote_skip_set) >= votes_needed:
            await ctx.send("Vote skip successful. Skipping current song.")
            ctx.voice_client.stop()
        else:
            await ctx.send(f"{member.mention} has voted to skip the current song. {votes_needed - len(vote_skip_set)} more vote(s) needed.")

    def delete_file(self, filename):
        try:
            os.remove(filename)
        except Exception as e:
            print(f"Error deleting file: {e}")

def setup(bot):
    bot.add_cog(MusicBot(bot))
