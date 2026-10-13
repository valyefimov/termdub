import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { duration, ffmpeg } from './util.mjs';

/**
 * Glues frames and narration into an MP4. Every scene lasts as long as its
 * voice-over (plus lead/tail silence), but never shorter than `minScene`.
 */
export function assemble({ scenes, audio, workDir, out, tag, lead = 0.6, tail = 0.9, minScene = 2.5 }) {
  const frameList = [];
  const audioParts = [];
  scenes.forEach((s, i) => {
    const speech = audio[i] ? duration(audio[i]) : 0;
    const typingTime = s.typing.reduce((a, f) => a + f.seconds, 0);
    const len = Math.max(typingTime + minScene, s.hold ?? 0, speech ? lead + speech + tail : 0);
    for (const f of s.typing) frameList.push(`file '${f.file}'\nduration ${f.seconds.toFixed(3)}`);
    frameList.push(`file '${s.result}'\nduration ${(len - typingTime).toFixed(3)}`);

    const wav = join(workDir, `${tag}-${i}.wav`);
    if (audio[i]) {
      const ms = Math.round(lead * 1000);
      ffmpeg('-i', audio[i], '-af', `adelay=${ms}|${ms},apad=whole_dur=${len.toFixed(3)}`, '-ar', '44100', '-ac', '2', wav);
    } else {
      ffmpeg('-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=stereo', '-t', len.toFixed(3), wav);
    }
    audioParts.push(wav);
  });

  // concat demuxer ignores the last duration unless the file is repeated
  const framesTxt = join(workDir, `${tag}-frames.txt`);
  writeFileSync(framesTxt, `${frameList.join('\n')}\nfile '${scenes.at(-1).result}'\n`);
  const audioTxt = join(workDir, `${tag}-audio.txt`);
  writeFileSync(audioTxt, audioParts.map((p) => `file '${p}'`).join('\n') + '\n');

  const voice = join(workDir, `${tag}-voice.wav`);
  ffmpeg('-f', 'concat', '-safe', '0', '-i', audioTxt, '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11', '-ar', '44100', voice);
  ffmpeg(
    '-f', 'concat', '-safe', '0', '-i', framesTxt, '-i', voice,
    '-vf', 'fps=30,format=yuv420p', '-c:v', 'libx264', '-preset', 'slow', '-crf', '20',
    '-c:a', 'aac', '-b:a', '160k', '-shortest', '-movflags', '+faststart', out,
  );
  return duration(out);
}

export function poster(video, out, at = 1.5) {
  ffmpeg('-ss', String(at), '-i', video, '-frames:v', '1', out);
}
