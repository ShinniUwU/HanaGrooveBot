import { Client, GatewayIntentBits } from 'discord.js';
import { Player, Track, GuildQueue } from 'discord-player';
import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v9';
import { CommandInteractionOptionResolver, GuildMember } from 'discord.js';
import { SlashCommandBuilder } from '@discordjs/builders';
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
        .setName('skip')
        .setDescription('Skips the currently playing song'),
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
    (queue.metadata as any).channel.send(`Started playing **${track.cleanTitle}**!`); // Cast metadata as any
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

            return interaction.followUp(`**${track.cleanTitle}** has been added to the queue!`);
        } catch (error) {
            const errorMessage = (error as Error).message || 'An unknown error occurred.';
            return interaction.followUp(`Error: ${errorMessage}`);
        }
    }

    // Handle /queue command
    else if (commandName === 'queue') {
        const queue = player.nodes.get(interaction.guildId!); // Ensure guildId is not null
        if (!queue || queue.tracks.size === 0) {
            return interaction.reply('The queue is currently empty.');
        }

        const trackTitles = queue.tracks.map(track => track.title).join('\n');
        return interaction.reply(`Current queue:\n${trackTitles}`);
    }

    // Handle /pause command
    else if (commandName === 'pause') {
        const queue = player.nodes.get(interaction.guildId!); // Ensure guildId is not null
        if (!queue || !queue.isPlaying()) {
            return interaction.reply('There is no song currently playing.');
        }

        // Pause the queue correctly using the right method
        queue.node.pause(); // Change to the correct pause method
        return interaction.reply('Paused the current song.');
    }

    // Handle /skip command
    else if (commandName === 'skip') {
        const queue = player.nodes.get(interaction.guildId!); // Ensure guildId is not null
        if (!queue || !queue.isPlaying()) {
            return interaction.reply('There is no song currently playing.');
        }

        const currentTrack = queue.currentTrack; // Ensure you access currentTrack correctly
        if (currentTrack) {
            queue.node.skip(); // Change to the correct skip method
            return interaction.reply(`Skipped **${currentTrack.title}**.`);
        } else {
            return interaction.reply('No track is currently playing to skip.');
        }
    }
});

// Log in to Discord
client.login(process.env.BOT_TOKEN);
