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

  // the first language is the "main" one: its video gets no suffix
  if (Object.keys(cfg.languages).length === 0) cfg.languages = { en: {} };

  if (!Array.isArray(cfg.scenes) || cfg.scenes.length === 0) throw new Error(`${file}: "scenes" must be a non-empty list`);
  cfg.scenes = cfg.scenes.map((s, i) => {
    const kinds = ['command', 'image', 'html', 'url'].filter((k) => s[k] != null);
    if (kinds.length !== 1) throw new Error(`${file}: scene #${i + 1} needs exactly one of "command", "image", "html" or "url"`);
    if (s.image) s = { ...s, image: resolve(base, s.image) };
    if (s.html && !s.html.trimStart().startsWith('<')) s = { ...s, html: resolve(base, s.html) };
    const say = typeof s.say === 'string' ? Object.fromEntries(Object.keys(cfg.languages).map((l) => [l, s.say])) : (s.say ?? {});
    return { name: s.name ?? `scene-${i + 1}`, run: s.run ?? s.command, ...s, say };
  });
  return cfg;
}
