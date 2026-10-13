/**
 * ANSI (SGR) colored text → HTML, plus a terminal-window page around it.
 */

const BASE16 = [
  '#1e1e2e', '#f38ba8', '#a6e3a1', '#f9e2af', '#89b4fa', '#cba6f7', '#94e2d5', '#bac2de',
  '#585b70', '#f38ba8', '#a6e3a1', '#f9e2af', '#89b4fa', '#cba6f7', '#94e2d5', '#cdd6f4',
];

const xterm256 = (n) => {
  if (n < 16) return BASE16[n];
  if (n >= 232) {
    const v = 8 + (n - 232) * 10;
    return `rgb(${v},${v},${v})`;
  }
  const i = n - 16;
  const c = (x) => (x === 0 ? 0 : 55 + x * 40);
  return `rgb(${c(Math.floor(i / 36))},${c(Math.floor(i / 6) % 6)},${c(i % 6)})`;
};

const escapeHtml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Reads an extended color (5;n or 2;r;g;b) starting at codes[i]; returns [color, consumed]. */
const extended = (codes, i) => {
  if (codes[i] === 5) return [xterm256(codes[i + 1] ?? 0), 2];
  if (codes[i] === 2) return [`rgb(${codes[i + 1] ?? 0},${codes[i + 2] ?? 0},${codes[i + 3] ?? 0})`, 4];
  return [null, 0];
};

export function ansiToHtml(input) {
  // drop non-SGR escapes (cursor moves, OSC links, etc.)
  const text = input
    .replace(/\x1b\][^\x07\x1b]*(\x07|\x1b\\)/g, '')
    .replace(/\x1b\[[0-9;?]*[A-Za-ln-z]/g, '');
  const state = { fg: null, bg: null, bold: false, dim: false, italic: false, underline: false };
  let html = '';
  let open = false;

  const style = () => {
    const css = [];
    if (state.fg) css.push(`color:${state.fg}`);
    if (state.bg) css.push(`background:${state.bg}`);
    if (state.bold) css.push('font-weight:700');
    if (state.dim) css.push('opacity:.6');
    if (state.italic) css.push('font-style:italic');
    if (state.underline) css.push('text-decoration:underline');
    return css.join(';');
  };

  for (const part of text.split(/(\x1b\[[0-9;]*m)/)) {
    const m = part.match(/^\x1b\[([0-9;]*)m$/);
    if (!m) {
      html += escapeHtml(part);
      continue;
    }
    const codes = m[1] === '' ? [0] : m[1].split(';').map(Number);
    for (let i = 0; i < codes.length; i++) {
      const c = codes[i];
      if (c === 0) Object.assign(state, { fg: null, bg: null, bold: false, dim: false, italic: false, underline: false });
      else if (c === 1) state.bold = true;
      else if (c === 2) state.dim = true;
      else if (c === 3) state.italic = true;
      else if (c === 4) state.underline = true;
      else if (c === 22) state.bold = state.dim = false;
      else if (c === 23) state.italic = false;
      else if (c === 24) state.underline = false;
      else if (c >= 30 && c <= 37) state.fg = BASE16[c - 30];
      else if (c >= 90 && c <= 97) state.fg = BASE16[c - 90 + 8];
      else if (c >= 40 && c <= 47) state.bg = BASE16[c - 40];
      else if (c >= 100 && c <= 107) state.bg = BASE16[c - 100 + 8];
      else if (c === 39) state.fg = null;
      else if (c === 49) state.bg = null;
      else if (c === 38 || c === 48) {
        const [color, used] = extended(codes, i + 1);
        if (c === 38) state.fg = color;
        else state.bg = color;
        i += used;
      }
    }
    if (open) html += '</span>';
    const css = style();
    open = css !== '';
    if (open) html += `<span style="${css}">`;
  }
  if (open) html += '</span>';
  return html;
}

export function terminalPage(body, { title = '', width = 1280, height = 720, fontSize = 17 } = {}) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>
  html,body{margin:0;width:${width}px;height:${height}px;overflow:hidden;
    background:linear-gradient(135deg,#3b2f63 0%,#1f3b5a 100%);}
  .win{position:absolute;inset:36px 48px;background:#1e1e2e;border-radius:12px;
    box-shadow:0 24px 60px rgba(0,0,0,.45);overflow:hidden;display:flex;flex-direction:column}
  .bar{height:38px;flex:none;display:flex;align-items:center;gap:8px;padding:0 16px;background:#181825;position:relative}
  .dot{width:13px;height:13px;border-radius:50%}
  .title{position:absolute;left:0;right:0;text-align:center;color:#7f849c;
    font:13px -apple-system,BlinkMacSystemFont,sans-serif;pointer-events:none}
  pre{margin:0;padding:20px 24px;flex:1;color:#cdd6f4;white-space:pre-wrap;word-break:break-word;
    font:${fontSize}px/1.45 "JetBrains Mono","SF Mono",Menlo,Consolas,monospace;overflow:hidden;
    display:flex;flex-direction:column;justify-content:flex-end}
  .prompt{color:#a6e3a1;font-weight:700}
  .cursor{display:inline-block;width:.6em;height:1.1em;background:#cdd6f4;vertical-align:text-bottom}
</style></head><body><div class="win">
  <div class="bar"><span class="dot" style="background:#ff5f57"></span><span class="dot" style="background:#febc2e"></span><span class="dot" style="background:#28c840"></span><span class="title">${escapeHtml(title)}</span></div>
  <pre><div>${body}</div></pre>
</div></body></html>`;
}
