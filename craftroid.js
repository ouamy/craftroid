const mineflayer = require('mineflayer');
const enablePerception = require('./view/eyes');

const bot = mineflayer.createBot({
  host: 'trupiloztaerzi.aternos.me',
  username: 'CraftRoid'
});

bot.on('login', () => {
  console.log('CraftRoid has logged in');
  enablePerception(bot);
});