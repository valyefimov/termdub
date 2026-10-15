import { execFileSync } from 'node:child_process';
import { sleep, which } from '../util.mjs';

/** Used when a language sets no `voice`. Other languages must name one. */
const DEFAULT_VOICES = { en: 'en-US-AndrewNeural' };

/**
 * Microsoft Edge neural voices via the `edge-tts` Python package
 * (pip install edge-tts). Free and unofficial: great for drafts, but the
 * endpoint sometimes answers 403, so we back off and retry.
 */
export default {
  name: 'edge',
  available: () => which(process.env.EDGE_TTS ?? 'edge-tts'),
  hint: 'pip install edge-tts',
  async synthesize({ text, lang, voice = DEFAULT_VOICES[lang], rate }, out) {
    if (!voice) throw new Error(`edge: set "voice" for language "${lang}" (e.g. ru-RU-DmitryNeural)`);
    const bin = process.env.EDGE_TTS ?? 'edge-tts';
    const args = ['--voice', voice, '--text', text, '--write-media', out];
    if (rate) args.push(`--rate=${rate}`);
    for (let attempt = 1; ; attempt++) {
      try {
        execFileSync(bin, args, { stdio: 'ignore' });
        return;
      } catch (err) {
        if (attempt === 4) throw err;
        await sleep(attempt * 2000);
      }
    }
  },
};
