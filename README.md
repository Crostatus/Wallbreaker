# Clash of clans Bot 🏰

A powerful Telegram bot for **Clash of Clans** clan management, built with **Deno**, **Puppeteer**, and **PostgreSQL**.

## Features 🌟

- **🛡️ Clan Tracking**: Monitors clan and members statistics..
- **⚔️ War Tracking**: Real-time updates on clan wars, attacks, and stats.
- **🎨 Image Generation**: Generates war summaries using a headless browser (Puppeteer).
- **🤖 Telegram Integration**: Sends attack notifications and detailed reports directly to your Telegram group.

## Prerequisites 📋

- [Docker](https://www.docker.com/) & Docker Compose (Recommended)
- [Deno](https://deno.land/) v1.30+ (For local development)

## Quick Start (Docker) 🐳

The easiest way to run the bot is using Docker Compose. It handles the database, migrations, and the bot environment automatically.

1.  **Clone the repository**
    ```bash
    git clone <your-repo-url>
    cd cittadella_bot
    ```

2.  **Configure Environment**
    Create a `.env` file from the example:
    ```bash
    cp .env.example .env
    ```
    Open `.env` and fill in your credentials:
    - `SUPERCELL_KEY`: Your API key from the [Clash of Clans Developer Portal](https://developer.clashofclans.com/).
    - `TELEGRAM_KEY`: Your Bot token from [BotFather](https://t.me/BotFather).
    - `POSTGRES_USER`, `POSTGRES_PASSWORD`, etc.: Database credentials (defaults are fine for local dev).

3.  **Run with Docker Compose**
    Build and start the services:
    ```bash
    docker-compose up --build
    ```
    
    > **Note**: The bot runs on port `5434` for the database to avoid conflicts with local Postgres instances.

## Development 🛠️

If you want to run the bot locally without Docker:

1.  **Start a Database**
    You need a PostgreSQL instance running. You can use the one from Docker:
    ```bash
    docker-compose up db -d
    ```

2.  **Run Migrations**
    Initialize the database schema:
    ```bash
    deno task migrate
    ```

3.  **Start the Bot**
    Run the bot in development mode (with hot-reload):
    ```bash
    deno task dev
    ```

## Project Structure 📂

- **`supercell/`**: Core application logic.
  - **`api/`**: Clash of Clans API client.
  - **`db/`**: Database repositories and migrations.
  - **`image_generators/`**: Puppeteer scripts for generating card images.
- **`utility/`**: Helper functions and logger.
- **`output/`**: Directory where generated images are stored (gitignored).
- **`main.ts`**: Application entry point.

## Troubleshooting 🚑

- **Database Connection Errors**: 
  - Ensure the database container is healthy (`docker-compose ps`).
  - The bot is configured to wait for the DB to be ready before starting.
  
- **Puppeteer/Chrome Crashes**:
  - If running in Docker, ensure the `--disable-dev-shm-usage` flag is present in `clashCardGenerator.ts` (it's already configured).
  - On Mac Silicon (M1/M2), Docker emulation can sometimes be slow; give it a moment to initialize.

---
Made with ❤️ for **Cittadella**.
