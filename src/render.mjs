import { mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { ansiToHtml, terminalPage } from './ansi.mjs';
import { capture } from './capture.mjs';
import { createShooter } from './frames.mjs';
import { getProvider } from './tts/index.mjs';
import { assemble, poster } from './video.mjs';

const prompt = (cmd, cursor) =>
  `<span class="prompt">❯</span> ${ansiToHtml(cmd)}${cursor ? '<span class="cursor"></span>' : ''}`;

export async function render(cfg, { langs, silent = false } = {}) {
  const workDir = join(cfg.output.dir, '.termdub');
  const framesDir = join(workDir, 'frames');
  rmSync(workDir, { recursive: true, force: true });
  mkdirSync(framesDir, { recursive: true });
  const shotsDir = join(cfg.output.dir, 'screenshots');
  if (cfg.output.screenshots) mkdirSync(shotsDir, { recursive: true });

  const run = (cmd) => capture(cmd, { cwd: cfg.cwd, env: cfg.env, columns: cfg.columns, replace: cfg.replace });
  for (const cmd of cfg.setup) run(cmd);

  // ------------------------------------------------------------ frames
  const shoot = createShooter({ workDir, width: cfg.window.width, height: cfg.window.height });
  const page = (body) => terminalPage(body, { ...cfg.window, title: cfg.title });
  let n = 0;
  const frame = (html) => {
    const file = join(framesDir, `f${String(n++).padStart(4, '0')}.png`);
    shoot(html, file);
    return file;
  };

  const scenes = [];
  for (const s of cfg.scenes) {
    const output = s.output ?? run(s.run);
    const typing = [];
    const steps = Math.min(cfg.typing.frames, s.command.length);
    for (let i = 1; i <= steps; i++) {
      const typed = s.command.slice(0, Math.round((s.command.length * i) / steps));
      typing.push({ file: frame(page(prompt(typed, true))), seconds: cfg.typing.frameSeconds });
    }
    const full = page(`${prompt(s.command)}\n${ansiToHtml(output.trimEnd())}\n\n${prompt('', true)}`);
    const result = frame(full);
    if (cfg.output.screenshots) shoot(full, join(shotsDir, `${s.name}.png`));
    scenes.push({ ...s, typing, result });
    console.log(`✔ ${s.name}`);
  }

  // ------------------------------------------------------------ narration + video
  const all = Object.keys(cfg.languages);
  const videos = [];
  for (const lang of langs ?? all) {
    const opts = cfg.languages[lang];
    if (!opts) throw new Error(`Language "${lang}" is not defined in "languages"`);
    const audio = [];
    if (!silent) {
      const provider = getProvider(opts.provider ?? cfg.tts.provider);
      for (const [i, s] of scenes.entries()) {
        const text = s.say[lang];
        if (!text) { audio.push(null); continue; }
        const mp3 = join(workDir, `${lang}-${i}.mp3`);
        await provider.synthesize({ text, lang, voice: opts.voice, rate: opts.rate ?? cfg.tts.rate, ...cfg.tts, ...opts }, mp3);
        audio.push(mp3);
      }
    }
    const name = lang === all[0] ? cfg.output.name : `${cfg.output.name}.${lang}`;
    const out = join(cfg.output.dir, `${name}.mp4`);
    const len = assemble({ scenes, audio: silent ? scenes.map(() => null) : audio, workDir, out, tag: lang, ...cfg.timing });
    console.log(`🎬 ${out} (${len.toFixed(1)}s)`);
    videos.push(out);
  }

  if (cfg.output.poster && videos[0]) poster(videos[0], join(cfg.output.dir, `${cfg.output.name}-poster.png`));
  return videos;
}
