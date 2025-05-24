const mineflayer = require('mineflayer');
const { enablePerception } = require('./controller/perceptionController');

const bot = mineflayer.createBot({
  host: 'trupiloztaerzi.aternos.me',
  username: 'CraftRoid',
  version: '1.20.4'
});

enablePerception(bot, {
  visionURL: 'http://localhost:3007',
  outputPath: './view/screenshot.png',
  llmURL: 'http://localhost:8080',
  prompt: 'Describe the scene as if you are playing Minecraft.'
});
