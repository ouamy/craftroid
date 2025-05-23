const puppeteer = require('puppeteer');
const path = require('path');
const { execFile } = require('child_process');
const viewer = require('prismarine-viewer').mineflayer;
const sharp = require('sharp');

function wait(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function isMostlyBlue(imagePath) {
  const { data, info } = await sharp(imagePath).resize(64, 64).raw().toBuffer({ resolveWithObject: true });
  const totalPixels = info.width * info.height;
  let blueishPixels = 0;

  for (let i = 0; i < data.length; i += 3) {
    const [r, g, b] = [data[i], data[i + 1], data[i + 2]];
    if (b > 100 && r < 80 && g < 80) blueishPixels++;
  }

  return (blueishPixels / totalPixels) > 0.8;
}

// Run caption.py via execFile for better safety and pass screenshot path
function runCaptionScript(imagePath) {
  return new Promise((resolve, reject) => {
    const pythonPath = path.join(__dirname, 'eyes', 'venv38', 'bin', 'python');
    const scriptPath = path.join(__dirname, 'eyes', 'caption.py');
    execFile(pythonPath, [scriptPath, imagePath], { cwd: path.join(__dirname, 'eyes') }, (err, stdout, stderr) => {
      if (err) return reject(stderr);
      resolve(stdout.trim());
    });
  });
}

module.exports = async function enablePerception(bot) {
  bot.once('spawn', async () => {
    await bot.waitForChunksToLoad();
    viewer(bot, { port: 3007, firstPerson: true });
    console.log('Perception module active at http://localhost:3007');

    const url = 'http://localhost:3007';
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    let firstTime = true;

    async function takeScreenshotAndCaption() {
      try {
        await page.goto(url, { timeout: 15000 });
        await page.waitForSelector('canvas', { timeout: 15000 });

        if (firstTime) {
          await wait(10000);
          firstTime = false;
        }

        const imagePath = path.join(__dirname, 'eyes', 'screenshot.png');
        await page.screenshot({ path: imagePath });

        if (await isMostlyBlue(imagePath)) {
          return null;
        }

        return await runCaptionScript(imagePath);
      } catch (e) {
        console.error('takeScreenshotAndCaption error:', e);
        return null;
      }
    }

    bot.on('chat', async (username, message) => {
      if (username === bot.username) return;

      const lower = message.toLowerCase().trim();

      if (!lower.startsWith(bot.username.toLowerCase())) return;

      const command = lower.slice(bot.username.length).trim();

      if (command.includes('what do you see')) {
        bot.chat("Wait, I'll try to describe it as best as I can...");
        const caption = await takeScreenshotAndCaption();

        if (!caption) {
          bot.chat("I couldn't see anything clear right now.");
        } else {
          bot.chat(`I see: ${caption}`);
        }
      }
    });
  });
};
