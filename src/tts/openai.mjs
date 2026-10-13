import { writeFileSync } from 'node:fs';

/** OpenAI TTS. Needs OPENAI_API_KEY. `voice` is e.g. "alloy", "ash", "coral". */
export default {
  name: 'openai',
  available: () => Boolean(process.env.OPENAI_API_KEY),
  hint: 'set OPENAI_API_KEY (in the environment or .env)',
  async synthesize({ text, voice = 'alloy', model = 'gpt-4o-mini-tts', instructions }, out) {
    const res = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: { authorization: `Bearer ${process.env.OPENAI_API_KEY}`, 'content-type': 'application/json' },
      body: JSON.stringify({ model, voice, input: text, response_format: 'mp3', ...(instructions ? { instructions } : {}) }),
    });
    if (!res.ok) throw new Error(`openai: ${res.status} ${await res.text()}`);
    writeFileSync(out, Buffer.from(await res.arrayBuffer()));
  },
};
