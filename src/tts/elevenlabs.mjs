import { writeFileSync } from 'node:fs';
import { sleep } from '../util.mjs';

/**
 * ElevenLabs (https://elevenlabs.io). Needs ELEVENLABS_API_KEY.
 * `voice` is an ElevenLabs voice ID; `model` defaults to the multilingual one
 * so a single voice can narrate every language.
 */
export default {
  name: 'elevenlabs',
  available: () => Boolean(process.env.ELEVENLABS_API_KEY),
  hint: 'set ELEVENLABS_API_KEY (in the environment or .env)',
  async synthesize({ text, voice, lang, model = 'eleven_multilingual_v2', stability = 0.45, similarity = 0.8, style = 0.2, speed }, out) {
    if (!voice) throw new Error('elevenlabs: set "voice" to an ElevenLabs voice ID');
    const body = {
      text,
      model_id: model,
      voice_settings: { stability, similarity_boost: similarity, style, ...(speed ? { speed } : {}) },
    };
    if (model.includes('turbo') || model.includes('flash')) body.language_code = lang;
    for (let attempt = 1; ; attempt++) {
      const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}?output_format=mp3_44100_128`, {
        method: 'POST',
        headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY, 'content-type': 'application/json', accept: 'audio/mpeg' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        writeFileSync(out, Buffer.from(await res.arrayBuffer()));
        return;
      }
      const retryable = res.status === 429 || res.status >= 500;
      if (!retryable || attempt === 4) throw new Error(`elevenlabs: ${res.status} ${await res.text()}`);
      await sleep(attempt * 2000);
    }
  },
};
