import edge from './edge.mjs';
import say from './say.mjs';

export const PROVIDERS = { edge, say };

export function getProvider(name) {
  const p = PROVIDERS[name];
  if (!p) throw new Error(`Unknown TTS provider "${name}". Available: ${Object.keys(PROVIDERS).join(', ')}`);
  if (p.available()) return p;
  if (name === 'edge' && say.available()) {
    console.warn(`! edge-tts not found (${p.hint}) — falling back to macOS \`say\` (robotic)`);
    return say;
  }
  throw new Error(`TTS provider "${name}" is not available (${p.hint})`);
}
