import { execFileSync } from 'node:child_process';
import { existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { which } from './util.mjs';

const CANDIDATES = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  'google-chrome',
  'google-chrome-stable',
  'chromium',
  'chromium-browser',
];

export function findChrome() {
  if (process.env.CHROME) return process.env.CHROME;
  for (const c of CANDIDATES) {
    if (c.startsWith('/') ? existsSync(c) : which(c)) return c;
  }
  throw new Error('Chrome/Chromium not found. Install it or set CHROME=/path/to/chrome');
}

/** Screenshots an HTML string into a PNG with headless Chrome. */
export function createShooter({ workDir, width, height }) {
  const chrome = findChrome();
  const page = join(workDir, 'page.html');
  return (html, file) => {
    writeFileSync(page, html);
    execFileSync(chrome, [
      '--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-sandbox',
      `--screenshot=${file}`, `--window-size=${width},${height}`, `file://${page}`,
    ], { stdio: 'ignore' });
  };
}
