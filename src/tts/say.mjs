import { execFileSync } from 'node:child_process';
import { ffmpeg, which } from '../util.mjs';

/** macOS built-in `say`. Offline and robotic — fine for drafts. */
export default {
  name: 'say',
  available: () => process.platform === 'darwin' && which('say'),
  hint: 'macOS only',
  async synthesize({ text, voice, sayVoice }, out) {
    const aiff = out.replace(/\.mp3$/, '.aiff');
    const v = sayVoice ?? (voice && !voice.includes('Neural') ? voice : null);
    execFileSync('say', [...(v ? ['-v', v] : []), '-o', aiff, text]);
    ffmpeg('-i', aiff, out);
  },
};
