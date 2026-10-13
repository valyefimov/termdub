# termdub

Narrated terminal demo videos made from real command output.

You list a few commands in a YAML file and write what the narrator should say over each one.
termdub runs the commands, draws their colored output in a fake terminal window and reads your lines
with a TTS voice (ElevenLabs, OpenAI, Microsoft Edge or macOS `say`). You get one MP4 per language,
a PNG of every scene and a poster frame.

When your CLI changes, run termdub again to get a fresh demo.

```
demo.yaml ──▶ run commands ──▶ ANSI → HTML ──▶ headless Chrome frames ─┐
                                                                       ├─▶ ffmpeg ──▶ demo.mp4, demo.ru.mp4, …
            say: { en, ru, … } ──▶ TTS provider ──▶ voice clips ───────┘
```

## Why

Most CLI demos are a silent GIF recorded with VHS or asciinema, or a video someone cut by hand.
Both are out of date the next time the output changes. I wanted the demo to live in the repo as a
config file and rebuild with one command, locally or in CI.

The output in the frames comes from running the commands for real. The typing is faked: the command
shows up over a few frames, then the output appears. Each scene stays on screen for as long as its
narration, and every language gets its own `say:` line and its own video.

## Requirements

- Node.js 20.12 or newer
- Google Chrome or Chromium. termdub looks in the usual places; if yours is elsewhere, set `CHROME=/path/to/chrome`
- `ffmpeg` and `ffprobe` (`brew install ffmpeg`)
- A TTS provider (see below)

## Install

```bash
npm install -D termdub
```

Or run it without installing:

```bash
npx termdub render demo.yaml
```

## Quick start

```yaml
# demo.yaml
title: ~/code/my-tool
languages:
  en: { voice: en-US-BrianNeural }
scenes:
  - command: my-tool --help
    say: This is my-tool. It does one thing, and does it well.
  - command: my-tool run --fast
    say: Run it, and you get results in a second.
```

```bash
npx termdub render demo.yaml
```

The files land in `media/`:

```
media/demo.mp4
media/demo-poster.png
media/screenshots/scene-1.png, scene-2.png
```

There's a full three-language example in [examples/hello/demo.yaml](examples/hello/demo.yaml).

## Voices (TTS providers)

Pick a provider with `tts.provider`. You can override it for one language with `languages.<code>.provider`.

| Provider     | Quality         | Needs                          | `voice` is                                       |
|--------------|-----------------|--------------------------------|--------------------------------------------------|
| `elevenlabs` | the most natural | `ELEVENLABS_API_KEY`          | an ElevenLabs voice ID                           |
| `openai`     | very good       | `OPENAI_API_KEY`               | `alloy`, `ash`, `coral`, `sage`, …               |
| `edge`       | good, free      | `pip install edge-tts`, internet | `en-US-BrianNeural` etc. (`edge-tts --list-voices`) |
| `say`        | robotic, works offline | macOS                   | a macOS voice name (`say -v '?'`)                |

### ElevenLabs

1. Create an API key at <https://elevenlabs.io/app/settings/api-keys>.
2. Put it in a `.env` file in the directory you run termdub from. termdub reads that file on start:

   ```bash
   cp .env.example .env
   # ELEVENLABS_API_KEY=sk_...
   ```

   Exporting it in your shell or setting it as a CI secret works too.
3. Find a voice you like in the [Voice Library](https://elevenlabs.io/app/voice-library) and copy its voice ID.

```yaml
tts:
  provider: elevenlabs
  model: eleven_multilingual_v2   # default; one voice can speak every language
  stability: 0.45                 # optional voice settings
  similarity: 0.8
  style: 0.2
languages:
  en: { voice: JBFqnCBsd6RMkjVDRZzb }
  uk: { voice: JBFqnCBsd6RMkjVDRZzb }
```

The default multilingual model figures out the language from the text, so one voice ID can cover every language.
For `eleven_turbo_*` and `eleven_flash_*` models termdub also sends the language code.

Don't commit `.env`. It's in `.gitignore` already.

### OpenAI

```yaml
tts:
  provider: openai
  model: gpt-4o-mini-tts
  instructions: Speak like a relaxed developer showing a friend a new tool.
languages:
  en: { voice: ash }
```

### Edge (free)

`edge-tts` talks to Microsoft Edge's read-aloud service through an unofficial endpoint. The voices are good
and cost nothing, so it's handy for drafts. The catch is that it sometimes answers 403, and right now it
refuses the `ru-RU-*` voices every time. termdub retries a few times. If that fails on a Mac, it reads that
one line with `say` instead, using the voice you set in `fallback`:

```yaml
languages:
  ru: { voice: ru-RU-DmitryNeural, fallback: Milena }
```

If the video is going out in public, I'd use ElevenLabs or OpenAI.

## Config reference

```yaml
title: ~/code/shop           # text in the window title bar
cwd: ./sandbox               # where commands run (relative to this file)
setup:                       # commands run before the first scene (not shown)
  - git init -q
env: { NO_UPDATE_NOTIFIER: "1" }
replace:                     # rewrite text in the output, e.g. hide absolute paths
  /Users/me/work/shop: ~/code/shop
columns: 100                 # $COLUMNS given to commands

window: { width: 1280, height: 720, fontSize: 17 }
typing: { frames: 10, frameSeconds: 0.09 }      # simulated typing
timing: { lead: 0.6, tail: 0.9, minScene: 2.5 } # silence before/after each line, seconds

tts:
  provider: edge             # edge | elevenlabs | openai | say
  rate: "+4%"                # edge only

languages:                   # the first language is the main video (demo.mp4)
  en: { voice: en-US-BrianNeural }
  uk: { voice: uk-UA-OstapNeural }   # → demo.uk.mp4
  # any per-language key overrides `tts`, e.g. provider, model

output:
  dir: media
  name: demo
  screenshots: true
  poster: true

scenes:
  - name: init               # screenshot file name (default scene-N)
    command: shop init       # what is typed on screen
    run: ./bin/shop init     # what is actually run (default: command)
    say:                     # a string, or one line per language
      en: One command and you're set up.
      uk: Одна команда, і все налаштовано.
  - command: shop --version
    output: "shop 1.0.0\n"   # static output instead of running anything
    hold: 4                  # minimum scene length, seconds
```

Commands run through `sh -c` with `FORCE_COLOR=3` and `CLICOLOR_FORCE=1` set, which keeps colors on in most tools.
If a command exits with an error, termdub prints a warning and still uses its output.

## CLI

```
termdub render [config]     render videos + screenshots (default: demo.yaml)

  -l, --lang <code>     only this language (repeatable)
      --silent          skip narration, render a silent video
```

## Tips

- Write each language's narration on its own and keep it casual. Word-for-word translations sound stiff when read aloud.
- One or two sentences per scene is plenty. A long line keeps the same frame on screen for a long time.
- Build a throwaway sandbox with `setup` and `cwd` so every run starts from the same state.
- In CI, run `npx termdub render` and either commit the videos or upload them as build artifacts.

## License

MIT
