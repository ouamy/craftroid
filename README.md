# CraftRoid

CraftRoid is an autonomous Minecraft agent.

## Features

- Perception – Understands its environment and reacts to it
- Thought – Makes decisions and plans actions
- Memory – Learns from past experiences across sessions
- Communication – Interacts with players via in-game chat
- Autonomy – Can modify and extend its own code
- Agency – Acts independently in the Minecraft world

## Setup

### 1. Install dependencies

```bash
sudo apt update
sudo apt install npm
```

### 2. Install Node Version Manager (NVM)

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash

source ~/.bashrc
```

### 3. Install Node.js 22 (required for mineflayer)

```bash
nvm install 22
nvm use 22
```

### 4. Install Mineflayer

```bash
npm install mineflayer
```

## Run the bot

Make sure your craftroid.js is configured with your server details:

```bash
node craftroid.js
```