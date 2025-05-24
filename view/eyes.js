const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs').promises;
const fetch = require('node-fetch');
const { mineflayer: viewer } = require('prismarine-viewer');

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

const maxHistory = 3;
const visionHistory = [];
let visionReady = false;

function storeAnswer(answer) {
  visionHistory.push(answer);
  if (visionHistory.length > maxHistory) visionHistory.shift();
  visionReady = true;
}

function getLastAnswer() {
  return visionHistory.length ? visionHistory[visionHistory.length - 1] : null;
}

async function screenshotToBase64(url, outputPath) {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(url, { timeout: 15000 });
  await page.waitForSelector('canvas', { timeout: 15000 });
  await wait(10000);
  await page.screenshot({ path: outputPath });
  await browser.close();
  const imageBuffer = await fs.readFile(outputPath);
  return `data:image/png;base64,${imageBuffer.toString('base64')}`;
}

async function sendToVisionLLM(imageBase64URL, instruction, baseURL) {
  const response = await fetch(`${baseURL}/v1/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      max_tokens: 100,
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: instruction },
          { type: 'image_url', image_url: { url: imageBase64URL } }
        ]
      }]
    })
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`LLM error: ${response.status} - ${errorText}`);
  }
  const data = await response.json();
  return data.choices[0].message.content;
}

module.exports = async function enablePerception(bot) {
  bot.once('spawn', async () => {
    await bot.waitForChunksToLoad();
    viewer(bot, { port: 3007, firstPerson: true });
    console.log('Perception module active at http://localhost:3007');

    const visionURL = 'http://localhost:3007';
    const outputPath = path.join(__dirname, 'screenshot.png');
    const llmURL = 'http://localhost:8080';
    const prompt = 'What do you see on this?';

    async function visionLoop() {
      try {
        const imageBase64 = await screenshotToBase64(visionURL, outputPath);
        const caption = await sendToVisionLLM(imageBase64, prompt, llmURL);
        storeAnswer(caption);
      } catch (err) {
      }
      setTimeout(visionLoop, 3000);
    }

    visionLoop();

    bot.on('chat', async (username, message) => {
      if (username === bot.username) return;
      const prefix = `${bot.username.toLowerCase()} `;
      if (!message.toLowerCase().startsWith(prefix)) return;

      const command = message.slice(prefix.length).trim().toLowerCase();

      if (command.includes('what do you see')) {
        if (!visionReady) {
          bot.chat("One second, it's still loading...");
        } else {
          bot.chat(getLastAnswer());
        }
      }
    });
  });
};
