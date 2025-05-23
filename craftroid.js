const mineflayer = require('mineflayer');
const enablePerception = require('./view/perception');

const bot = mineflayer.createBot({
  host: 'trupiloztaerzi.aternos.me',
  username: 'CraftRoid'
});

bot.on('login', () => {
  console.log('CraftRoid has logged in');
  enablePerception(bot);
});

bot.on('error', err => {
  console.error('Error:', err);
});

bot.on('end', () => {
  console.log('CraftRoid has disconnected');
});
