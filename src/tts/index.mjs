import edge from './edge.mjs';
import elevenlabs from './elevenlabs.mjs';
import openai from './openai.mjs';
import say from './say.mjs';

export const PROVIDERS = { edge, elevenlabs, openai, say };

export function getProvider(name) {
  const p = PROVIDERS[name];
  if (!p) throw new Error(`Unknown TTS provider "${name}". Available: ${Object.keys(PROVIDERS).join(', ')}`);
  if (p.available()) return name === 'edge' && say.available() ? withFallback(p, say) : p;
  if (name === 'edge' && say.available()) {
    console.warn(`! edge-tts not found (${p.hint}) — falling back to macOS \`say\` (robotic)`);
    return say;
  }
  throw new Error(`TTS provider "${name}" is not available (${p.hint})`);
}

/** The free edge endpoint can refuse some voices outright; don't lose the whole render. */
const withFallback = (primary, backup) => ({
  ...primary,
  async synthesize(opts, out) {
    try {
      await primary.synthesize(opts, out);
    } catch {
      console.warn(`! ${primary.name} failed for voice ${opts.voice} — using \`${backup.name}\` for this line`);
      await backup.synthesize({ ...opts, voice: opts.fallback }, out);
    }
  },
});
