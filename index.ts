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
import ytdl from '@distube/ytdl-core';
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
import ytSearch from 'yt-search';

dotenv.config();

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates, GatewayIntentBits.GuildMessages]
});
const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN!);

const tempOutputFile = 'audio.webm';  // Temporary file to save audio
const finalOutputFile = 'audio.mp3';  // Final MP3 file

let player: any;  // Audio player instance
let isLooping = false;  // Track looping status
let connection: any;  // Voice connection instance
let queue: string[] = [];  // Queue of tracks
let currentlyPlaying: boolean = false;  // Track if audio is currently playing
let currentTrackUrl: string | null = null;  // Store the current track's URL
let isProcessing = false;  // Flag to avoid concurrent processing

const cookies = JSON.parse(fs.readFileSync('cookies.json', 'utf-8'));

const agent = ytdl.createAgent(cookies);

function cleanUpFiles() {
    try {
        if (fs.existsSync(tempOutputFile)) fs.unlinkSync(tempOutputFile);
        if (fs.existsSync(finalOutputFile)) fs.unlinkSync(finalOutputFile);
    } catch (error) {
        console.error('Error cleaning up files:', error);
    }
}

client.once('ready', () => {
    console.log(`Logged in as ${client.user?.tag}!`);
    cleanUpFiles();
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
            const searchResults = await ytSearch(urlOrQuery);
            const videoUrl = searchResults.videos[0]?.url;

            if (!videoUrl) {
                await interaction.editReply('No results found.');
                return;
            }

            queue.push(videoUrl);

            if (!currentlyPlaying && !isProcessing) {
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
        if (isLooping && currentTrackUrl) {
            // If looping is enabled and there's a current track, re-add it to the queue
            queue.unshift(currentTrackUrl);
        }
    } else if (command.commandName === 'skip') {
        if (player) {
            player.stop();
            await interaction.reply('Skipped the current track.');
            currentlyPlaying = false;
            playNext();
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
    currentTrackUrl = videoUrl;
    currentlyPlaying = true;

    if (!isProcessing) {
        isProcessing = true;
        await downloadAndPlayTrack(videoUrl);
        isProcessing = false;
    }
}

async function downloadAndPlayTrack(videoUrl: string) {
    const downloadOptions = {
        filter: 'audioonly' as ytdl.Filter,
        quality: 'highestaudio',
        agent: agent,
    };

    const fileStream = fs.createWriteStream(tempOutputFile);
    const downloadStream = ytdl(videoUrl, downloadOptions);

    downloadStream.pipe(fileStream as unknown as NodeJS.WritableStream);

    return new Promise<void>((resolve, reject) => {
        downloadStream.on('error', async (err: Error) => {
            console.error('Error during download:', err);
            cleanUpFiles(); // Clean up files on error
            resolve(playNext());
        });

        fileStream.on('finish', async () => {
            console.log('Download completed. Converting to MP3...');
            exec(`ffmpeg -i ${tempOutputFile} -vn -ab 128k -ar 44100 -y ${finalOutputFile}`, async (err: Error | null) => {
                if (err) {
                    console.error('Error during conversion:', err);
                    cleanUpFiles(); // Clean up files on error
                    resolve(playNext());
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
                        queue.unshift(currentTrackUrl!);
                    }
                    currentlyPlaying = false;
                    playNext();
                });

                player.on('error', (error: Error) => {
                    console.error('Error:', error.message);
                    currentlyPlaying = false;
                    playNext();
                });

                console.log('Playing audio...');
                resolve(); // Resolve promise when ready to play
            });
        });

        fileStream.on('error', async (err: Error) => {
            console.error('Error writing to file:', err);
            cleanUpFiles(); // Clean up files on error
            resolve(playNext());
        });
    });
}

function cleanup() {
    if (connection) {
        connection.destroy();
        connection = null;
    }
    cleanUpFiles(); // Clean up files
    currentlyPlaying = false;
    currentTrackUrl = null;
}

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
            await rest.put(
                Routes.applicationGuildCommands(process.env.CLIENT_ID!, process.env.GUILD_ID!),
                { body: commandData }
            );
            console.log('Slash commands registered for the guild.');
        } else {
            await rest.put(
                Routes.applicationCommands(process.env.CLIENT_ID!),
                { body: commandData }
            );
            console.log('Slash commands registered globally.');
        }
    } catch (err) {
        console.error('Error refreshing commands:', err);
    }
}

client.login(process.env.DISCORD_TOKEN);
