// 把 docs/figures 等处的 HTML 图渲染成 PNG（只加载本地文件，阻断其他网络请求）。
// 用法：node scripts/render-figure.mjs docs/figures/architecture.html docs/figures/architecture.png
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

const [input, output] = process.argv.slice(2);
if (!input || !output) { console.error('用法：node scripts/render-figure.mjs <输入.html> <输出.png>'); process.exit(1); }
const candidates = [process.env.AI_TEST_BROWSER, chromium.executablePath(),
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'].filter(Boolean);
const executablePath = candidates.find(p => fs.existsSync(p));
if (!executablePath) { console.error('未找到浏览器，请安装 Playwright Chromium 或用 AI_TEST_BROWSER 指定'); process.exit(1); }
const browser = await chromium.launch({ executablePath, headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1360, height: 600 }, deviceScaleFactor: 2 });
  await page.route('**/*', route => route.request().url().startsWith('file:') ? route.continue() : route.abort());
  await page.goto(pathToFileURL(path.resolve(input)).href);
  await page.locator('.wrap').screenshot({ path: output });
  console.log('已生成 ' + output + '（' + (fs.statSync(output).size / 1024).toFixed(0) + ' KB）');
} finally { await browser.close(); }
