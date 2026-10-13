#!/usr/bin/env node
import { existsSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { loadConfig } from '../src/config.mjs';
import { render } from '../src/render.mjs';

const HELP = `termdub — narrated terminal demo videos from real command output

Usage:
  termdub render [config]     render videos + screenshots (default: demo.yaml)

Options:
  -l, --lang <code>     only this language (repeatable)
      --silent          skip narration, render a silent video
  -h, --help            show this help
`;

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    lang: { type: 'string', short: 'l', multiple: true },
    silent: { type: 'boolean' },
    help: { type: 'boolean', short: 'h' },
  },
});

const [cmd = 'render', file = 'demo.yaml'] = positionals;
if (values.help || cmd !== 'render') {
  console.log(HELP);
  process.exit(values.help ? 0 : 1);
}
if (existsSync('.env')) process.loadEnvFile('.env');

try {
  await render(loadConfig(file), { langs: values.lang, silent: values.silent });
} catch (err) {
  console.error(`✖ ${err.message}`);
  process.exit(1);
}
