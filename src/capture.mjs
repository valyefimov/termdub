import { spawnSync } from 'node:child_process';

/**
 * Runs a shell command and returns its colored output exactly as a terminal
 * would show it. Non-zero exits are kept: failing commands make good demos too.
 */
export function capture(command, { cwd, env = {}, columns = 100, replace = {} } = {}) {
  const res = spawnSync('sh', ['-c', `${command} 2>&1`], {
    cwd,
    env: { ...process.env, FORCE_COLOR: '3', CLICOLOR_FORCE: '1', COLUMNS: String(columns), TERM: 'xterm-256color', ...env },
    maxBuffer: 32 * 1024 * 1024,
  });
  if (res.error) throw res.error;
  if (res.status !== 0) console.warn(`! "${command}" exited with ${res.status}`);
  let out = res.stdout.toString().replace(/\r\n?/g, '\n');
  for (const [from, to] of Object.entries(replace)) out = out.replaceAll(from, to);
  return out;
}
