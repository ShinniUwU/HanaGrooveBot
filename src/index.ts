import { Client, GatewayIntentBits } from 'discord.js';
import { Player, Track, GuildQueue, QueueRepeatMode } from 'discord-player';
import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v9';
import { CommandInteractionOptionResolver, GuildMember } from 'discord.js';
import { SlashCommandBuilder } from '@discordjs/builders';
import dotenv from 'dotenv'

dotenv.config();
// Initialize Discord client
const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates],
});

// Create a new Player instance
const player = new Player(client);

// Register commands
const commands = [
    new SlashCommandBuilder()
        .setName('play')
        .setDescription('Plays a song')
        .addStringOption(option =>
            option.setName('song')
                .setDescription('The name of the song to play')
                .setRequired(true)
        ),
    new SlashCommandBuilder()
        .setName('queue')
        .setDescription('Displays the current queue'),
    new SlashCommandBuilder()
        .setName('pause')
        .setDescription('Pauses the currently playing song'),
    new SlashCommandBuilder()
        .setName('unpause')
        .setDescription('Unpauses the currently paused song'),
    new SlashCommandBuilder()
        .setName('skip')
        .setDescription('Skips the currently playing song'),
    new SlashCommandBuilder()
        .setName('loop')
        .setDescription('Toggles looping for the current song'),
].map(command => command.toJSON());

// REST API for registering commands
const rest = new REST({ version: '9' }).setToken(process.env.BOT_TOKEN as string);

(async () => {
    try {
        console.log('Started refreshing application (/) commands.');

        await rest.put(
            Routes.applicationCommands(process.env.CLIENT_ID as string),
            { body: commands },
        );

        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error(error);
    }
})();

// Load default extractors
(async () => {
    await player.extractors.loadDefault();
})();

// Event when a track starts playing
player.events.on('playerStart', (queue: GuildQueue, track: Track) => {
    if (queue.tracks.size > 1) {
        const message = `Now playing: **${track.cleanTitle}** by **${track.author}**\n` +
                        `Duration: ${track.duration}\n` +
                        `URL: [Listen Here](${track.url})`;
        (queue.metadata as any).channel.send(message);
    }
});

// Handling command interactions
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isCommand()) return;

    const { commandName, options } = interaction;

    // Handle /play command
    if (commandName === 'play') {
        const channel = (interaction.member as GuildMember)?.voice.channel;

        if (!channel) {
            return interaction.reply('You need to be in a voice channel to play music!');
        }

        const songOptions = options as CommandInteractionOptionResolver;
        const query = songOptions.getString('song', true);

        await interaction.deferReply();

        try {
            const { track } = await player.play(channel, query, {
                nodeOptions: {
                    metadata: interaction,
                },
            });

            const trackDetails = `**${track.cleanTitle}** by **${track.author}**\n` +
                                 `Duration: ${track.duration}\n` +
                                 `URL: [Listen Here](${track.url})`;

            const queue = player.nodes.get(interaction.guildId!);
            if (queue && queue.tracks.size > 1) {
                return interaction.followUp(`Added to queue:\n${trackDetails}`);
            }
        } catch (error) {
            const errorMessage = (error as Error).message || 'An unknown error occurred.';
            return interaction.followUp(`Error: ${errorMessage}`);
        }
    }

    // Handle /queue command
    else if (commandName === 'queue') {
        const queue = player.nodes.get(interaction.guildId!);
        if (!queue || queue.tracks.size === 0) {
            return interaction.reply('The queue is currently empty.');
        }

        const trackTitles = queue.tracks.map(track => track.title).join('\n');
        return interaction.reply(`Current queue:\n${trackTitles}`);
    }

    // Handle /pause command
    else if (commandName === 'pause') {
        const queue = player.nodes.get(interaction.guildId!);
        if (!queue) {
            return interaction.reply('No music is currently playing.');
        }

        if (!queue.isPlaying()) {
            return interaction.reply('There is no song currently playing.');
        }

        try {
            queue.node.pause();
            return interaction.reply('Paused the current song.');
        } catch (error) {
            console.error('Error pausing the track:', error);
            return interaction.reply('Failed to pause the track. Please try again.');
        }
    }

    // Handle /unpause command
    else if (commandName === 'unpause') {
        const queue = player.nodes.get(interaction.guildId!);
        if (!queue || !queue.node.isPaused()) {
            return interaction.reply('There is no song currently paused.');
        }

        try {
            queue.node.resume();
            return interaction.reply('Resumed the current song.');
        } catch (error) {
            console.error('Error resuming the track:', error);
            return interaction.reply('Failed to resume the track. Please try again.');
        }
    }

    // Handle /skip command
    else if (commandName === 'skip') {
        const queue = player.nodes.get(interaction.guildId!);
        if (!queue || !queue.isPlaying()) {
            return interaction.reply('There is no song currently playing.');
        }

        const currentTrack = queue.currentTrack;
        if (currentTrack) {
            queue.node.skip();
            return interaction.reply(`Skipped **${currentTrack.title}**.`);
        } else {
            return interaction.reply('No track is currently playing to skip.');
        }
    }

    // Handle /loop command
    else if (commandName === 'loop') {
        const queue = player.nodes.get(interaction.guildId!);
        
        if (!queue) {
            return interaction.reply("No music is currently playing.");
        }

        const currentMode = queue.repeatMode;
        const currentTrack = queue.currentTrack;

        if (!currentTrack) {
            return interaction.reply("No track is currently playing to loop.");
        }

        // Toggle loop mode
        if (currentMode === QueueRepeatMode.TRACK) {
            // If currently looping, disable it
            queue.setRepeatMode(QueueRepeatMode.OFF);
            // Clear the queue while keeping the current track playing
            queue.tracks.clear();
            return interaction.reply("Looping has been disabled, and the queue has been cleared.");
        } else {
            // If not currently looping, enable it
            queue.setRepeatMode(QueueRepeatMode.TRACK);
            return interaction.reply("Looping has been enabled for the current song.");
        }
    }
});

// Log in to Discord
client.login(process.env.BOT_TOKEN);
