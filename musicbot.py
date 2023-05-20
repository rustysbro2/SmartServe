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
            if len(ctx.voice_client.channel.members) > 1:
                await ctx.send("There are still users in the voice channel. I will not leave.")
            else:
                await ctx.voice_client.disconnect()
                if ctx.voice_client.channel in self.voice_queues:
                    del self.voice_queues[ctx.voice_client.channel]
                    del self.vote_skip[ctx.voice_client.channel]
                await ctx.send("Leaving voice channel.")
        else:
            await ctx.send("I am not currently connected to a voice channel.")

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

        if voice_channel.guild.voice_client.is_playing() or voice_channel.guild.voice_client.is_paused():
            return

        filename, requester = await queue.get()
        voice_client = voice_channel.guild.voice_client
        try:
            voice_client.play(discord.FFmpegPCMAudio(filename), after=lambda e: self.bot.loop.create_task(self.check_queue(voice_channel)))

            queue_size = queue.qsize() + 1  # Add 1 for the current song
            await voice_channel.send(f"Now playing: {filename} (requested by {requester})\nQueue size: {queue_size} song(s)")

            while voice_client.is_playing() or voice_client.is_paused():
                if voice_channel in self.vote_skip and len(self.vote_skip[voice_channel]) >= (len(voice_channel.members) - 1) // 2 + 1:
                    voice_client.stop()
                    break

                await asyncio.sleep(1)  # Check vote skip status every second

        except Exception as e:
            print(f"Error playing song: {e}")

        # Play the next song in the queue
        await self.play_queue(voice_channel)

    async def check_queue(self, voice_channel):
        queue = self.voice_queues[voice_channel]
        if queue.empty():
            if voice_channel.guild.voice_client:
                await self.leave(voice_channel.guild.voice_client)
            return

        await self.play_queue(voice_channel)

    async def leave(self, voice_client):
        if voice_client:
            if len(voice_client.channel.members) > 1:
                await voice_client.channel.send("There are still users in the voice channel. I will not leave.")
            else:
                await voice_client.disconnect()
                if voice_client.channel in self.voice_queues:
                    del self.voice_queues[voice_client.channel]
                    del self.vote_skip[voice_client.channel]
                await voice_client.channel.send("Leaving voice channel.")
        else:
            await voice_client.channel.send("I am not currently connected to a voice channel.")

    @commands.command()
    async def vote_skip(self, ctx):
        if not ctx.voice_client or ctx.voice_client.channel not in self.voice_queues:
            await ctx.send("No song is currently playing.")
            return

        voice_channel = ctx.voice_client.channel
        member = ctx.author
        vote_skip_set = self.vote_skip[voice_channel]

        # Calculate votes needed (excluding bot users)
        votes_needed = (len(voice_channel.members) - 1) // 2 + 1

        if member == self.bot.user:
            await ctx.send("Bots cannot vote to skip.")
        elif member in vote_skip_set:
            await ctx.send("You have already voted to skip.")
        else:
            vote_skip_set.add(member)
            await ctx.send(f"{member.mention} has voted to skip the current song.")

            if len(vote_skip_set) >= votes_needed:
                await ctx.send("Vote skip successful. Skipping current song.")
                ctx.voice_client.stop()

                # Check if the current song is being skipped and remove it from the queue
                if not self.voice_queues[voice_channel].empty():
                    filename, _ = self.voice_queues[voice_channel].get_nowait()
                    if filename == ctx.voice_client.source:
                        await ctx.send("Skipped song removed from the queue.")
            else:
                votes_remaining = votes_needed - len(vote_skip_set)
                await ctx.send(f"{votes_remaining} more vote(s) needed to skip the current song.")

    def delete_file(self, filename):
        try:
            os.remove(filename)
        except Exception as e:
            print(f"Error deleting file: {e}")

def setup(bot):
    bot.add_cog(MusicBot(bot))
