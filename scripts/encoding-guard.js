const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = process.cwd();
const ALLOWED_EXT = new Set(['.js', '.mjs', '.cjs', '.json', '.html', '.css', '.md', '.sql']);
const IGNORE_PREFIX = ['node_modules/', '.git/', 'data/records.db', 'data/player_auth.db', 'data/runtime_registry.db'];

function isIgnored(file) {
  return IGNORE_PREFIX.some((p) => file.startsWith(p));
}

function listFiles() {
  try {
    return execSync('git ls-files', { encoding: 'utf8' })
      .split(/\r?\n/)
      .map((x) => x.trim())
      .filter(Boolean)
      .filter((f) => ALLOWED_EXT.has(path.extname(f).toLowerCase()))
      .filter((f) => !isIgnored(f));
  } catch {
    return [];
  }
}

function isUtf8(buffer) {
  try {
    const decoder = new TextDecoder('utf-8', { fatal: true });
    decoder.decode(buffer);
    return true;
  } catch {
    return false;
  }
}

function hasMojibake(text) {
  if (text.includes('\uFFFD')) return 'contains replacement char U+FFFD';
  if (/вЂ|РІвЂ|РЋ|СЏ|С‚|РџР|РЎР|Ð|Ñ/.test(text)) return 'contains common mojibake markers';
  if (/[\u0400\u0402-\u040F\u0450\u0452-\u045F]/u.test(text)) return 'contains uncommon Cyrillic letters typical for mojibake';
  return '';
}

const bad = [];
for (const rel of listFiles()) {
  const abs = path.join(ROOT, rel);
  const buf = fs.readFileSync(abs);
  if (!isUtf8(buf)) {
    bad.push(`${rel}: not valid UTF-8`);
    continue;
  }
  const txt = buf.toString('utf8');
  const reason = hasMojibake(txt);
  if (reason) bad.push(`${rel}: ${reason}`);
}

if (bad.length) {
  console.error('Encoding guard failed:');
  for (const x of bad) console.error(' - ' + x);
  process.exit(1);
}

console.log('Encoding guard: OK');
