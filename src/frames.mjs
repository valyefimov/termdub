import { execFileSync } from 'node:child_process';
import { existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
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

/**
 * Screenshots a page into a PNG with headless Chrome. The returned function
 * takes an HTML string, or `{ url }` for a file:// or http(s):// page.
 */
export function createShooter({ workDir, width, height }) {
  const chrome = findChrome();
  const page = join(workDir, 'page.html');
  return (source, file) => {
    let url = source.url;
    if (!url) {
      writeFileSync(page, source);
      url = `file://${page}`;
    }
    execFileSync(chrome, [
      '--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-sandbox',
      `--screenshot=${file}`, `--window-size=${width},${height}`, '--virtual-time-budget=4000', url,
    ], { stdio: 'ignore' });
  };
}

/**
 * Turns "what a scene shows" into something the shooter accepts. Takes an HTML
 * string, `{ html }`, `{ url }` or `{ image }` (a path to a PNG/JPG, scaled to fit).
 */
export function toSource(x) {
  if (typeof x === 'string') return x;
  if (x.html != null) return x.html;
  if (x.url) return { url: x.url };
  if (x.image) {
    const img = pathToFileURL(x.image).href;
    return `<!doctype html><body style="margin:0;background:#11111b;display:grid;place-items:center;height:100vh"><img src="${img}" style="max-width:100%;max-height:100%"></body>`;
  }
  throw new Error('A frame must be an HTML string, or { html }, { url } or { image }');
}
