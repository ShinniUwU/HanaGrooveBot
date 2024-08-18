import {
    Client,
    GatewayIntentBits,
    SlashCommandBuilder,
    CommandInteraction,
    VoiceChannel,
    Interaction,
    CacheType
} from 'discord.js';
import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v10';
import ytdl from '@distube/ytdl-core';  // Import the updated ytdl-core
import { exec } from 'child_process';
import {
    createAudioPlayer,
    createAudioResource,
    joinVoiceChannel,
    VoiceConnectionStatus,
    AudioPlayerStatus,
} from '@discordjs/voice';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import ytSearch from 'yt-search';  // Import yt-search for YouTube search

// Load environment variables from .env file
dotenv.config();

// Create a new client instance
const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates, GatewayIntentBits.GuildMessages]
});
const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN!);

// File paths
const tempOutputFile = 'audio.webm';  // Temporary file to save audio
const finalOutputFile = 'audio.mp3';  // Final MP3 file

let player: any;  // Audio player instance
let isLooping = false;  // Track looping status
let connection: any;  // Voice connection instance
let queue: string[] = [];  // Queue of tracks
let currentlyPlaying: boolean = false;  // Track if audio is currently playing

// Read cookies from file
const cookies = JSON.parse(fs.readFileSync('cookies.json', 'utf-8'));

// Create an agent with cookies
const agent = ytdl.createAgent(cookies);

// Clean up existing audio files
function cleanUpFiles() {
    if (fs.existsSync(tempOutputFile)) fs.unlinkSync(tempOutputFile);
    if (fs.existsSync(finalOutputFile)) fs.unlinkSync(finalOutputFile);
}

client.once('ready', () => {
    console.log(`Logged in as ${client.user?.tag}!`);
    cleanUpFiles();  // Clean up files on startup
    refreshSlashCommands();
});

client.on('interactionCreate', async (interaction: Interaction<CacheType>) => {
    if (!interaction.isCommand()) return;

    const command = interaction as CommandInteraction;

    if (command.commandName === 'play') {
        const urlOrQuery = command.options.get('url_or_query')?.value as string;
        if (!urlOrQuery) {
            await interaction.reply('Please provide a valid YouTube URL or search query.');
            return;
        }

        const channel = (command.member as any).voice.channel as VoiceChannel;
        if (!channel) {
            await interaction.reply('You need to be in a voice channel to use this command.');
            return;
        }

        await interaction.reply('Searching for the audio...');

        try {
            // Search for the video using yt-search
            const searchResults = await ytSearch(urlOrQuery);
            const videoUrl = searchResults.videos[0]?.url;

            if (!videoUrl) {
                await interaction.editReply('No results found.');
                return;
            }

            // Add the video URL to the queue
            queue.push(videoUrl);

            if (!currentlyPlaying) {
                // Create and connect to the voice connection
                connection = joinVoiceChannel({
                    channelId: channel.id,
                    guildId: interaction.guild!.id,
                    adapterCreator: interaction.guild!.voiceAdapterCreator,
                });

                connection.on(VoiceConnectionStatus.Ready, () => {
                    console.log('The bot has connected to the channel!');
                    currentlyPlaying = true;
                    playNext();
                });

                connection.on(VoiceConnectionStatus.Disconnected, () => {
                    console.log('Disconnected from the voice channel.');
                    cleanup();
                });
            } else {
                await interaction.editReply('Added to queue. The bot is already playing audio.');
            }
        } catch (err) {
            console.error('Error:', err);
            await interaction.editReply('An error occurred during the process.');
        }

    } else if (command.commandName === 'loop') {
        isLooping = !isLooping;
        await interaction.reply(`Looping is now ${isLooping ? 'enabled' : 'disabled'}.`);
    } else if (command.commandName === 'skip') {
        if (player) {
            player.stop();
            await interaction.reply('Skipped the current track.');
        } else {
            await interaction.reply('No audio is currently playing.');
        }
    }
});

async function playNext() {
    if (queue.length === 0) {
        console.log('Queue is empty. Disconnecting...');
        cleanup();
        return;
    }

    const videoUrl = queue.shift()!;
    currentlyPlaying = true;

    // Start downloading the next track in the background
    downloadAndPlayTrack(videoUrl);
}

function downloadAndPlayTrack(videoUrl: string) {
    const downloadOptions = {
        filter: 'audioonly' as ytdl.Filter,
        quality: 'highestaudio',
        agent: agent, // Use the agent with cookies
    };

    const fileStream = fs.createWriteStream(tempOutputFile);
    const downloadStream = ytdl(videoUrl, downloadOptions);

    // Handle the download stream and pipe it to the file stream
    downloadStream.pipe(fileStream as unknown as NodeJS.WritableStream);

    downloadStream.on('error', async (err: Error) => {
        console.error('Error during download:', err);
        fs.unlinkSync(tempOutputFile);  // Clean up on error
        await player?.stop();
        playNext();
    });

    fileStream.on('finish', async () => {
        console.log('Download completed. Converting to MP3...');
        exec(`ffmpeg -i ${tempOutputFile} -vn -ab 128k -ar 44100 -y ${finalOutputFile}`, async (err: Error | null) => {
            if (err) {
                console.error('Error during conversion:', err);
                await player?.stop();
                playNext();
                return;
            }
            console.log('Conversion to MP3 completed.');

            if (player) {
                player.stop();
            }

            player = createAudioPlayer();
            const resource = createAudioResource(finalOutputFile);
            player.play(resource);
            connection?.subscribe(player);

            player.on(AudioPlayerStatus.Idle, () => {
                if (isLooping) {
                    playNext();
                } else {
                    currentlyPlaying = false;
                    playNext();
                }
            });

            player.on('error', (error: Error) => {
                console.error('Error:', error.message);
                currentlyPlaying = false;
                playNext();
            });

            console.log('Playing audio...');
        });
    });

    fileStream.on('error', async (err: Error) => {
        console.error('Error writing to file:', err);
        fs.unlinkSync(tempOutputFile);  // Clean up on error
        await player?.stop();
        playNext();
    });
}

function cleanup() {
    if (connection) {
        connection.destroy();
        connection = null;
    }
    fs.unlinkSync(tempOutputFile);
    fs.unlinkSync(finalOutputFile);
    currentlyPlaying = false;
}

// Register slash commands
async function refreshSlashCommands() {
    const commands = [
        new SlashCommandBuilder()
            .setName('play')
            .setDescription('Search and play audio from YouTube')
            .addStringOption(option =>
                option.setName('url_or_query')
                    .setDescription('The URL of the YouTube video or search query')
                    .setRequired(true)),
        new SlashCommandBuilder()
            .setName('loop')
            .setDescription('Toggle looping of the currently playing track'),
        new SlashCommandBuilder()
            .setName('skip')
            .setDescription('Skip the currently playing track')
    ];

    const commandData = commands.map(command => command.toJSON());

    try {
        console.log('Refreshing slash commands...');
        if (process.env.GUILD_ID) {
            // For a specific guild
            await rest.put(
                Routes.applicationGuildCommands(process.env.CLIENT_ID!, process.env.GUILD_ID!),
                { body: commandData }
            );
            console.log('Slash commands registered for the guild.');
        } else {
            // Globally
            await rest.put(
                Routes.applicationCommands(process.env.CLIENT_ID!),
                { body: commandData }
            );
            console.log('Slash commands registered globally.');
        }
    } catch (error) {
        console.error('Error refreshing slash commands:', error);
    }
}

// Login to Discord with the bot token
client.login(process.env.DISCORD_TOKEN);
