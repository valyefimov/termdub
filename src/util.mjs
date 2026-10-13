import { execFileSync, spawnSync } from 'node:child_process';

export const which = (cmd) => spawnSync('sh', ['-c', `command -v "${cmd}"`]).status === 0;

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Media duration in seconds, via ffprobe. */
export const duration = (file) =>
  Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file]).toString());

export const ffmpeg = (...args) => execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...args], { stdio: ['ignore', 'ignore', 'inherit'] });
