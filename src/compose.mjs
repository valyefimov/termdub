import { createHash } from 'node:crypto';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { createShooter, toSource } from './frames.mjs';
import { getProvider } from './tts/index.mjs';
import { duration, ffmpeg } from './util.mjs';
import { assemble, poster as makePoster } from './video.mjs';

const sentences = (text) => text.split(/(?<=[.!?])\s+/).filter(Boolean);

/**
 * Narrates one scene sentence by sentence, so captions can follow the voice
 * exactly. Returns the joined audio and where each sentence starts and ends.
 */
async function narrate(text, { provider, tts, workDir, key, gap }) {
  const parts = sentences(text);
  const files = [];
  const lengths = [];
  for (const [i, part] of parts.entries()) {
    const mp3 = join(workDir, `${key}-${i}.mp3`);
    await provider.synthesize({ ...tts, text: part }, mp3);
    files.push(mp3);
    lengths.push(duration(mp3));
  }
  const silence = join(workDir, 'gap.wav');
  ffmpeg('-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=stereo', '-t', String(gap), silence);
  const list = join(workDir, `${key}.txt`);
  writeFileSync(list, files.flatMap((f, i) => (i ? [silence, f] : [f])).map((f) => `file '${f}'`).join('\n') + '\n');
  const mp3 = join(workDir, `${key}.mp3`);
  ffmpeg('-f', 'concat', '-safe', '0', '-i', list, '-ar', '44100', '-ac', '2', mp3);

  let t = 0;
  const spans = parts.map((sentence, i) => {
    const span = { text: sentence, start: t, end: t + lengths[i] };
    t += lengths[i] + gap;
    return span;
  });
  return { mp3, spans, speech: duration(mp3) };
}

/**
 * Builds a narrated video from scenes you draw yourself.
 *
 *   await compose({
 *     out: 'demo.mp4',
 *     size: { width: 1280, height: 720 },
 *     tts: { provider: 'elevenlabs', voice: '…' },
 *     scenes: [{
 *       say: 'First sentence. Second sentence.',
 *       frame: ({ t, caption }) => `<html>…${caption}…</html>`,
 *       cuts: [0.3, 0.6],
 *     }],
 *   });
 *
 * `frame` is called for every stretch of time in which something changes and
 * returns an HTML string, `{ html }`, `{ url }` or `{ image }`. It gets
 *   t         seconds since the scene started
 *   caption   the sentence being spoken right now ('' in the pauses)
 *   sentence  its index, or -1
 *   speaking  whether the voice is on
 *   index     scene number
 *   duration  total scene length
 * Frames are cut at every sentence boundary, plus the extra times in `cuts`
 * (an array of seconds, or a function of the scene length). Identical HTML is
 * screenshotted once, so slow-changing scenes stay cheap.
 */
export async function compose({
  scenes,
  out,
  size = { width: 1280, height: 720 },
  tts = { provider: 'edge' },
  timing = {},
  workDir = join(resolve(out, '..'), '.termdub'),
  poster = null,
  silent = false,
  keepWork = false,
  log = console.log,
}) {
  const { lead = 0.4, tail = 0.7, gap = 0.25 } = timing;
  rmSync(workDir, { recursive: true, force: true });
  const framesDir = join(workDir, 'frames');
  mkdirSync(framesDir, { recursive: true });
  mkdirSync(resolve(out, '..'), { recursive: true });

  const shoot = createShooter({ workDir, width: size.width, height: size.height });
  const cache = new Map();
  let n = 0;
  const png = (result) => {
    const source = toSource(result);
    const id = createHash('sha1').update(typeof source === 'string' ? source : source.url).digest('hex');
    if (!cache.has(id)) {
      const file = join(framesDir, `f${String(n++).padStart(5, '0')}.png`);
      shoot(source, file);
      cache.set(id, file);
    }
    return cache.get(id);
  };

  const provider = silent ? null : getProvider(tts.provider);
  const built = [];
  const audio = [];

  for (const [index, scene] of scenes.entries()) {
    const spans = [];
    let speech = 0;
    if (scene.say && !silent) {
      const nar = await narrate(scene.say, { provider, tts, workDir, key: `scene-${index}`, gap });
      spans.push(...nar.spans);
      speech = nar.speech;
      audio.push(nar.mp3);
    } else {
      audio.push(null);
    }

    const total = Math.max(scene.hold ?? 0, speech ? lead + speech + tail : 0, scene.minLength ?? 2);
    const extra = typeof scene.cuts === 'function' ? scene.cuts(total) : (scene.cuts ?? []);
    const cuts = new Set([0, total, lead, lead + speech, ...extra]);
    for (const s of spans) {
      cuts.add(lead + s.start);
      cuts.add(lead + s.end);
    }
    const times = [...cuts].filter((t) => t >= 0 && t <= total).sort((a, b) => a - b);

    const frames = [];
    for (let i = 0; i < times.length - 1; i++) {
      const seconds = times[i + 1] - times[i];
      if (seconds < 0.02) continue;
      const t = times[i] + seconds / 2;
      const sentence = spans.findIndex((s) => t >= lead + s.start && t < lead + s.end);
      const html = await scene.frame({
        t, index, duration: total,
        sentence, caption: sentence < 0 ? '' : spans[sentence].text, speaking: sentence >= 0,
      });
      frames.push({ file: png(html), seconds });
    }
    built.push({ typing: frames.slice(0, -1), result: frames.at(-1).file, hold: total });
    log(`✔ scene ${index + 1}/${scenes.length}${scene.name ? ` ${scene.name}` : ''}`);
  }

  const len = assemble({ scenes: built, audio, workDir, out, tag: 'compose', lead, tail, minScene: 0 });
  if (poster) makePoster(out, poster.file ?? out.replace(/\.mp4$/, '-poster.png'), poster.at);
  if (!keepWork) rmSync(workDir, { recursive: true, force: true });
  log(`🎬 ${out} (${len.toFixed(1)}s)`);
  return { out, seconds: len };
}
