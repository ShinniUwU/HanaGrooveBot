# HanaGrooveBot

A simple Discord bot that can play audio from YouTube in a voice channel using the `discord.js` library and `@distube/ytdl-core`. This bot supports features like searching YouTube for audio tracks, playing them in a voice channel, skipping tracks, and looping.

## Features

- Search and play audio from YouTube.
- Skip the currently playing track.
- Toggle looping of the current track.
- Handles downloading and conversion of audio files.

## Prerequisites

- Node.js (v18 or later)
- npm (v6 or later)
- FFmpeg (for audio conversion)

## Installation

1. **Clone the Repository**

   ```bash
   git clone https://github.com/yourusername/your-repo.git
   cd HanaGrooveBot

   ```

2. **Install Dependencies**

   Make sure you have Node.js and npm installed. Run the following command to install project dependencies:

   ```bash
   npm install
   ```

3. **Create Environment Variables**

   Copy the `.env.example` file to `.env` and update it with your own values:

   ```bash
   cp .env.example .env
   ```

   Example `.env` file:

   ```env
   DISCORD_TOKEN=your_discord_bot_token
   CLIENT_ID=your_discord_client_id
   GUILD_ID=your_discord_guild_id
   ```

4. **Get Cookies for YouTube**

   - Install the [EditThisCookie](https://chrome.google.com/webstore/detail/editthiscookie) extension for your browser.
   - Go to YouTube and log in to your account.
   - Export the cookies and save them to a file named `cookies.json` in the project directory.

5. **Create Docker Image** (Optional)

   If you want to use Docker, build the Docker image with:

   ```bash
   docker build -t my-discord-bot .
   ```

   And run it with:

   ```bash
   docker run -d --name my-discord-bot my-discord-bot
   ```

## Usage

1. **Start the Bot**

   You can start the bot locally with:

   ```bash
   npm start
   ```

   Or if you’re using Docker, ensure your Docker container is running as shown in the Docker setup.

2. **Bot Commands**

   - `/play [url_or_query]`: Search and play audio from a YouTube URL or search query.
   - `/loop`: Toggle looping of the currently playing track.
   - `/skip`: Skip the currently playing track.

3. **Cleaning Up**

   The bot will automatically clean up temporary audio files after playing. However, if you need to manually remove old files, delete `audio.mp3` and `audio.webm` from the project directory.

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

- **FFmpeg Not Found**: Ensure FFmpeg is installed and accessible from your system’s PATH.
- **403 Errors**: Make sure your `cookies.json` is correctly configured and valid.

## Disclaimer

**Usage of this bot is at your own risk.** I am not responsible for any damages, loss of data, or violations of terms of service (ToS) that may occur as a result of using this bot. This bot is provided as-is, and the I don't make no guarantees regarding its functionality or compliance with any third-party services.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
