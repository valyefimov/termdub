# termdub

**Narrated terminal demo videos from real command output, in any language.**

You write a short YAML file listing commands and what to say over each one. termdub runs the commands,
draws their real colored output in a terminal window, voices your lines with a neural TTS
(ElevenLabs, OpenAI, Microsoft Edge voices or macOS `say`), and gives you an MP4 for every language,
plus PNG screenshots of each scene and a poster frame.

When your CLI changes, run it again and the demo is up to date. No screen recording and no editing.

```
demo.yaml ──▶ run commands ──▶ ANSI → HTML ──▶ headless Chrome frames ─┐
                                                                       ├─▶ ffmpeg ──▶ demo.mp4, demo.ru.mp4, …
            say: { en, ru, … } ──▶ TTS provider ──▶ voice clips ───────┘
```

## Why

Demos for CLI tools are usually a silent GIF (VHS, asciinema) or a video someone edited by hand.
Both go stale as soon as the output changes. termdub keeps the demo as code:

- **Real output.** The frames come from actually running the commands. Nothing is mocked up.
- **Voice-over in several languages.** One `say:` block per scene, one video per language.
- **Rebuilt with one command.** Works locally or in CI.
- **Timing follows the voice.** Each scene stays on screen as long as its narration lasts.

The typing animation is simulated: the command appears in a few frames, then the real output is shown.

## Requirements

- Node.js 20.12 or newer
- Google Chrome or Chromium. The usual install paths are detected; otherwise set `CHROME=/path/to/chrome`
- `ffmpeg` and `ffprobe` (`brew install ffmpeg`)
- One TTS provider (see below)

## Install

```bash
npm install -D termdub
```

or run it without installing:

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

Output goes to `media/`:

```
media/demo.mp4
media/demo-poster.png
media/screenshots/scene-1.png, scene-2.png
```

A complete example in three languages is in [examples/hello/demo.yaml](examples/hello/demo.yaml).

## Voices (TTS providers)

Set the provider globally with `tts.provider`, or per language with `languages.<code>.provider`.

| Provider     | Quality         | Needs                          | `voice` is                                       |
|--------------|-----------------|--------------------------------|--------------------------------------------------|
| `elevenlabs` | best, most natural | `ELEVENLABS_API_KEY`        | an ElevenLabs voice ID                           |
| `openai`     | very good       | `OPENAI_API_KEY`               | `alloy`, `ash`, `coral`, `sage`, …               |
| `edge`       | good, free      | `pip install edge-tts`, internet | `en-US-BrianNeural` etc. (`edge-tts --list-voices`) |
| `say`        | robotic, offline | macOS                         | a macOS voice name (`say -v '?'`)                |

### ElevenLabs

1. Create an API key at <https://elevenlabs.io/app/settings/api-keys>.
2. Put it in a `.env` file next to where you run termdub. termdub loads `.env` automatically:

   ```bash
   cp .env.example .env
   # ELEVENLABS_API_KEY=sk_...
   ```

   You can also export it in your shell or set it as a CI secret.
3. Pick a voice in the [Voice Library](https://elevenlabs.io/app/voice-library) and copy its **voice ID**.

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

The default multilingual model handles the language by itself, so you can reuse the same voice ID for every language.
With `eleven_turbo_*` or `eleven_flash_*` models, termdub also sends the language code.

Never commit `.env`. It is already listed in `.gitignore`.

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

`edge-tts` uses Microsoft Edge's read-aloud voices through an unofficial endpoint. It is great for drafts,
but it sometimes answers 403, and some voices (currently `ru-RU-*`) are refused completely.
termdub retries, and on macOS it falls back to `say` for the failed line. Set the `say` voice it should use with `fallback`:

```yaml
languages:
  ru: { voice: ru-RU-DmitryNeural, fallback: Milena }
```

For anything public, use ElevenLabs or OpenAI.

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

Commands run through `sh -c` with `FORCE_COLOR=3` and `CLICOLOR_FORCE=1`, so most tools keep their colors.
A command that exits with an error is still captured; termdub prints a warning.

## CLI

```
termdub render [config]     render videos + screenshots (default: demo.yaml)

  -l, --lang <code>     only this language (repeatable)
      --silent          skip narration, render a silent video
```

## Tips

- Write the narration for each language separately, in a conversational tone. Don't translate word for word.
- Keep each line to one or two sentences. The scene lasts as long as its line.
- Use `setup` and `cwd` to build a throwaway sandbox, so the demo is the same on every run.
- Add `npx termdub render` to CI and commit the result, or publish it as a build artifact.

## License

MIT
