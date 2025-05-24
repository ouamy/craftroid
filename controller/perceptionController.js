const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs').promises;
const { mineflayer: viewer } = require('prismarine-viewer');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

const wait = ms => new Promise(r => setTimeout(r, ms));

let lastVision = null;
let visionReady = false;

async function screenshotToBase64(page, outputPath) {
  // Wait longer and retry for canvas presence
  await waitForCanvasWithRetry(page, 5, 2000);
  await page.screenshot({ path: outputPath });
  const img = await fs.readFile(outputPath);
  return `data:image/png;base64,${img.toString('base64')}`;
}

async function waitForCanvasWithRetry(page, retries, delayMs) {
  for (let i = 0; i < retries; i++) {
    try {
      await page.waitForSelector('canvas', { timeout: 5000 });
      return;
    } catch {
      if (i === retries - 1) throw new Error('Canvas selector not found after retries');
      await wait(delayMs);
    }
  }
}

function blockToName(block) {
  return block?.name.replace(/_/g, ' ') || 'unknown';
}

function entityToShortString(entity, pos) {
  const dist = entity.position.distanceTo(pos);
  const name = entity.name || entity.type || 'entity';
  return `${name} (${dist.toFixed(1)}m)`;
}

async function getEnvironmentInfo(bot) {
  const pos = bot.entity.position;
  const r = 1;

  const blocks = [];
  for (let dx = -r; dx <= r; dx++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dz = -r; dz <= r; dz++) {
        const block = bot.blockAt(pos.offset(dx, dy, dz));
        if (block) blocks.push(blockToName(block));
      }
    }
  }

  const uniqueBlocks = [...new Set(blocks)].slice(0, 5).join(', ') || 'none';

  const nearbyEntities = Object.values(bot.entities)
    .filter(e => e !== bot.entity && e.position.distanceTo(pos) <= 6)
    .slice(0, 4)
    .map(e => entityToShortString(e, pos))
    .join(', ') || 'none';

  const underBlock = blockToName(bot.blockAt(pos.offset(0, -1, 0)));

  return `On ${underBlock}. Around: ${uniqueBlocks}. Nearby entities: ${nearbyEntities}.`;
}

async function sendToVisionLLM(imageBase64URL, prompt, llmURL) {
  const res = await fetch(`${llmURL}/v1/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      max_tokens: 100,
      messages: [{ role: 'user', content: [{ type: 'text', text: prompt }, { type: 'image_url', image_url: { url: imageBase64URL } }] }]
    }),
  });

  if (!res.ok) throw new Error(`LLM error ${res.status}`);

  const json = await res.json();
  const content = json.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error('Empty LLM response');
  return content;
}

async function waitForPageLoad(page, url, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      await page.goto(url, { timeout: 15000, waitUntil: 'networkidle2' });
      return;
    } catch {
      if (i === maxRetries - 1) throw new Error('Failed to load vision page');
      await wait(3000);
    }
  }
}

async function enablePerception(bot, opts = {}) {
  const visionURL = opts.visionURL || 'http://localhost:3007';
  const outputPath = opts.outputPath || path.join(__dirname, '../view/screenshot.png');
  const llmURL = opts.llmURL || 'http://localhost:8080';

  let browser, page;

  bot.once('spawn', async () => {
    await bot.waitForChunksToLoad();
    viewer(bot, { port: 3007, firstPerson: true });

    try {
      browser = await puppeteer.launch({ headless: true });
      page = await browser.newPage();
      await waitForPageLoad(page, visionURL);
      await wait(10000);

      async function loop() {
        try {
          const img64 = await screenshotToBase64(page, outputPath);
          const envInfo = await getEnvironmentInfo(bot);
          const prompt = `Briefly describe what you see in the screenshot along with this context: ${envInfo}`;
          const caption = await sendToVisionLLM(img64, prompt, llmURL);
          lastVision = caption;
          visionReady = true;
        } catch (e) {
          console.error('Vision loop error:', e.message);
        }
      }

      await loop();
      setInterval(loop, 1000);
    } catch (e) {
      console.error('Puppeteer error:', e.message);
    }
  });

  bot.on('chat', async (user, msg) => {
    if (user === bot.username) return;
    if (msg.toLowerCase().startsWith(bot.username.toLowerCase())) {
      if (!visionReady) await bot.chat("My computer is slow, the game is still loading...");
      else await bot.chat(lastVision || "Can't see anything.");
    }
  });
}

module.exports = { enablePerception };
