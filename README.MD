# HanaGrooveBot

A simple Discord bot that can play audio in a voice channel using the `discord.js` library and `discord-player`. This bot supports features like playing songs from YouTube, managing a queue, pausing and resuming tracks, and skipping songs.

## Features

- Play audio from YouTube and other sources.
- Display the current song queue.
- Pause and unpause the currently playing track.
- Skip the currently playing track.

## Prerequisites

- [Bun](https://bun.sh/) (v0.1 or later)
- Node.js (v16.9.0 or later)
- FFmpeg (for audio processing)

## Installation

1. **Clone the Repository**

   ```bash
   git clone https://github.com/ShinniUwU/HanaGrooveBot.git
   cd HanaGrooveBot
   ```

2. **Install Dependencies**

   Ensure you have Bun installed. Run the following command to install project dependencies:

   ```bash
   bun install
   ```

3. **Create Environment Variables**

   Create a `.env` file in the project root and add your bot token and client ID:

   ```env
   BOT_TOKEN=your_discord_bot_token
   CLIENT_ID=your_discord_client_id
   ```

4. **Set Up Commands**

   The bot uses slash commands. Make sure to register them in your Discord server. Commands are defined in the code and registered automatically upon starting the bot.

## Usage

1. **Start the Bot**

   You can start the bot locally with:

   ```bash
   bun run src/index.ts
   ```

2. **Bot Commands**

   - `/play [song]`: Plays a song from YouTube based on the given query.
   - `/queue`: Displays the current song queue.
   - `/pause`: Pauses the currently playing song.
   - `/unpause`: Resumes the currently paused song.
   - `/skip`: Skips the currently playing song.

## Development

To make changes or contribute to the project:

1. **Create a Branch**

   ```bash
   git checkout -b feature/your-feature
   ```

2. **Make Changes**

   Modify the code as needed and test your changes.

3. **Commit Changes**

   ```bash
   git add .
   git commit -m "Add new feature or fix"
   ```

4. **Push and Create a Pull Request**

   ```bash
   git push origin feature/your-feature
   ```

   Then, create a pull request on GitHub.

## Troubleshooting

- **Bot Not Responding**: Ensure the bot has permission to connect and speak in the voice channel.
- **Commands Not Working**: Check if the bot is correctly registered with your server and that it has the necessary intents.

## Disclaimer

**Usage of this bot is at your own risk.** I am not responsible for any damages, loss of data, or violations of terms of service (ToS) that may occur as a result of using this bot. This bot is provided as-is, and I make no guarantees regarding its functionality or compliance with any third-party services.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
