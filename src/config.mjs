import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { parse } from 'yaml';

const DEFAULTS = {
  title: '',
  cwd: '.',
  setup: [],
  env: {},
  replace: {},
  columns: 100,
  window: { width: 1280, height: 720, fontSize: 17 },
  typing: { frames: 10, frameSeconds: 0.09 },
  timing: { lead: 0.6, tail: 0.9, minScene: 2.5 },
  tts: { provider: 'edge', rate: null },
  output: { dir: 'media', name: 'demo', screenshots: true, poster: true },
  languages: {},
};

export function loadConfig(file) {
  const path = resolve(file);
  const raw = parse(readFileSync(path, 'utf8')) ?? {};
  const base = dirname(path);
  const cfg = {
    ...DEFAULTS,
    ...raw,
    window: { ...DEFAULTS.window, ...raw.window },
    typing: { ...DEFAULTS.typing, ...raw.typing },
    timing: { ...DEFAULTS.timing, ...raw.timing },
    tts: { ...DEFAULTS.tts, ...raw.tts },
    output: { ...DEFAULTS.output, ...raw.output },
  };
  cfg.cwd = resolve(base, cfg.cwd);
  cfg.output.dir = resolve(base, cfg.output.dir);
  cfg.setup = [].concat(cfg.setup);

  if (!Array.isArray(cfg.scenes) || cfg.scenes.length === 0) throw new Error(`${file}: "scenes" must be a non-empty list`);
  cfg.scenes = cfg.scenes.map((s, i) => {
    if (!s.command) throw new Error(`${file}: scene #${i + 1} has no "command"`);
    const say = typeof s.say === 'string' ? Object.fromEntries(Object.keys(cfg.languages).map((l) => [l, s.say])) : (s.say ?? {});
    return { name: s.name ?? `scene-${i + 1}`, run: s.run ?? s.command, ...s, say };
  });
  // the first language is the "main" one: its video gets no suffix
  if (Object.keys(cfg.languages).length === 0) cfg.languages = { en: {} };
  return cfg;
}
