import edge from './edge.mjs';

export const PROVIDERS = { edge };

export function getProvider(name) {
  const p = PROVIDERS[name];
  if (!p) throw new Error(`Unknown TTS provider "${name}". Available: ${Object.keys(PROVIDERS).join(', ')}`);
  if (!p.available()) throw new Error(`TTS provider "${name}" is not available (${p.hint})`);
  return p;
}
