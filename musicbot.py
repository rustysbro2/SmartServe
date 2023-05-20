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

    @commands.slash_command(name="join", description="Joins the voice channel the user is in.")
    async def join(self, interaction: discord.SlashCommandInteraction):
        if interaction.user.voice and interaction.user.voice.channel:
            channel = interaction.user.voice.channel
            await channel.connect()
        else:
            await interaction.response.send("You are not connected to a voice channel")

    @commands.slash_command(name="leave", description="Leaves the voice channel the bot is in.")
    async def leave(self, interaction: discord.SlashCommandInteraction):
        voice_channel = interaction.voice_client.channel
        if interaction.voice_client and voice_channel:
            if len(voice_channel.members) > 1:
                await interaction.response.send("There are still users in the voice channel. I will not leave.")
            else:
                await interaction.voice_client.disconnect()
                if voice_channel in self.voice_queues:
                    del self.voice_queues[voice_channel]
                    del self.vote_skip[voice_channel]
                await interaction.response.send("Leaving voice channel.")
        else:
            await interaction.response.send("I am not currently connected to a voice channel.")

    @commands.slash_command(name="play", description="Plays the song specified by the URL.")
    async def play(self, interaction: discord.SlashCommandInteraction, url: str):
        if not interaction.voice_client:
            await self.join(interaction)
        
        if not interaction.voice_client:
            return

        if interaction.voice_client.channel not in self.voice_queues:
            self.voice_queues[interaction.voice_client.channel] = asyncio.Queue()
            self.vote_skip[interaction.voice_client.channel] = set()

        queue = self.voice_queues[interaction.voice_client.channel]
        ydl_opts = {'format': 'bestaudio/best', 'outtmpl': 'downloads/%(id)s.%(ext)s'}
        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(url, download=True)
                filename = ydl.prepare_filename(info)
                await queue.put((filename, interaction.author, interaction.channel))
                if queue.qsize() == 1:
                    await self.play_queue(interaction.voice_client.channel)
                await interaction.response.send(f"Added to the queue: {info['title']}")
        except Exception as e:
            print(e)

    async def play_queue(self, voice_channel):
        queue = self.voice_queues[voice_channel]
        if queue.empty():
            return

        filename, requester, text_channel = await queue.get()
        voice_client = voice_channel.guild.voice_client
        try:
            voice_client.play(discord.FFmpegPCMAudio(filename), after=lambda e: self.bot.loop.create_task(self.check_queue(voice_channel, text_channel)))

            queue_size = queue.qsize() + 1  # Add 1 for the current song
            await text_channel.send(f"Now playing: {filename} (requested by {requester})\nQueue size: {queue_size} song(s)")

            while voice_client.is_playing() or voice_client.is_paused():
                if voice_channel in self.vote_skip and len(self.vote_skip[voice_channel]) >= (len(voice_channel.members) - 1) // 2 + 1:
                    voice_client.stop()
                    break

                await asyncio.sleep(1)  # Check vote skip status every second

            await self.check_queue(voice_channel, text_channel)  # Play the next song in the queue

        except Exception as e:
            print(e)

    async def check_queue(self, voice_channel, text_channel):
        queue = self.voice_queues[voice_channel]
        if queue.empty():
            await self.leave(voice_channel.guild.voice_client)
            return

        await self.play_queue(voice_channel)

    @commands.slash_command(name="vote_skip", description="Votes to skip the current song.")
    async def vote_skip(self, interaction: discord.SlashCommandInteraction):
        if not interaction.voice_client or interaction.voice_client.channel not in self.voice_queues:
            await interaction.response.send("No song is currently playing.")
            return

        voice_channel = interaction.voice_client.channel
        member = interaction.author
        vote_skip_set = self.vote_skip[voice_channel]

        # Calculate votes needed (excluding bot users)
        votes_needed = (len(voice_channel.members) - 1) // 2 + 1

        if member == self.bot.user:
            await interaction.response.send("Bots cannot vote to skip.")
        elif member in vote_skip_set:
            await interaction.response.send("You have already voted to skip.")
        else:
            vote_skip_set.add(member)
            await interaction.response.send(f"{member.mention} has voted to skip the current song.")

            if len(vote_skip_set) >= votes_needed:
                await interaction.response.send("Vote skip successful. Skipping current song.")
                ctx.voice_client.stop()
            else:
                votes_remaining = votes_needed - len(vote_skip_set)
                await interaction.response.send(f"{votes_remaining} more vote(s) needed to skip the current song.")

def setup(bot):
    bot.add_cog(MusicBot(bot))
