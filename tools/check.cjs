#!/usr/bin/env node
// Validates the ebook: chord diagrams vs. their symbols, component attributes, local links.
// Usage: node tools/check.cjs [--list] [file.html ...]
const fs = require('fs');
const path = require('path');
const T = require('../assets/theory.js');

const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const list = args.includes('--list');
const targets = args.filter((a) => !a.startsWith('--'));
const files = targets.length
  ? targets.map((f) => path.resolve(f))
  : [path.join(ROOT, 'index.html'), ...fs.readdirSync(path.join(ROOT, 'pages')).filter((f) => f.endsWith('.html')).sort().map((f) => path.join(ROOT, 'pages', f))];

let errors = 0, warnings = 0;
const report = (level, file, msg) => {
  if (level === 'ERROR') errors++; else warnings++;
  console.log(`${level.padEnd(5)} ${path.relative(ROOT, file)}: ${msg}`);
};

const attrsOf = (tag) => Object.fromEntries([...tag.matchAll(/([\w-]+)(?:="([^"]*)")?/g)].slice(1).map((m) => [m[1], m[2] ?? '']));
const lineOf = (src, index) => src.slice(0, index).split('\n').length;

function checkChord(file, line, a) {
  const where = `L${line} <chord-diagram name="${a.name ?? ''}">`;
  const frets = T.parseFrets(a.frets ?? '');
  if (frets.length !== 6 || frets.some((f) => f !== null && !(Number.isInteger(f) && f >= 0 && f <= 22))) {
    return report('ERROR', file, `${where}: frets "${a.frets}" must have 6 entries (x or 0–22)`);
  }
  if (a.fingers !== undefined) {
    const fingers = T.parseFrets(a.fingers);
    if (fingers.length !== 6) report('ERROR', file, `${where}: fingers "${a.fingers}" must have 6 entries`);
    frets.forEach((f, s) => {
      const fg = fingers[s];
      if (f > 0 && !(fg >= 1 && fg <= 4)) report('WARN', file, `${where}: string ${6 - s} fretted at ${f} has no finger 1–4`);
    });
  }
  const sounding = frets.map((f, s) => (f == null ? null : T.TUNING_LOW_TO_HIGH[s] + f)).filter((m) => m != null);
  if (!sounding.length) return report('ERROR', file, `${where}: no sounding strings`);

  const chord = a.name ? T.parseChord(a.name) : null;
  const root = a.root ? T.parseNote(a.root) : chord?.root;
  const formula = a.formula ? T.parseFormula(a.formula) : chord?.formula;
  if (!root) return report('ERROR', file, `${where}: cannot determine root (name/root)`);
  if (!formula) return report('WARN', file, `${where}: unknown chord suffix "${chord?.suffix}" — notes not verified`);

  const allowed = new Map(formula.map((l) => [T.mod12(root.pc + T.labelSemitones(l)), l]));
  // A slash bass may lie outside the chord (F/G, Am/G).
  if (chord?.bass && !allowed.has(chord.bass.pc)) allowed.set(chord.bass.pc, 'bass');
  const pcs = new Set(sounding.map(T.mod12));
  const notes = sounding.map((m) => `${T.noteFor(root, formula, T.mod12(m))}(${T.labelFor(root, formula, T.mod12(m))})`);
  if (list) console.log(`      ${path.relative(ROOT, file)} ${where}: ${notes.join(' ')}`);

  for (const pc of pcs) {
    if (!allowed.has(pc)) report('ERROR', file, `${where}: note ${T.noteFor(root, formula, pc)} is not in formula ${formula.join(' ')} → ${notes.join(' ')}`);
  }
  if (!pcs.has(root.pc)) report('ERROR', file, `${where}: root ${root.name} missing → ${notes.join(' ')}`);
  for (const l of formula) {
    if (['3', '♭3'].includes(l) && !pcs.has(T.mod12(root.pc + T.labelSemitones(l)))) report('WARN', file, `${where}: third missing → ${notes.join(' ')}`);
    if (['♭7', '7', 'º7'].includes(l) && !pcs.has(T.mod12(root.pc + T.labelSemitones(l)))) report('WARN', file, `${where}: seventh missing → ${notes.join(' ')}`);
  }
  const bassPc = T.mod12(sounding[0]);
  if (chord?.bass) {
    if (bassPc !== chord.bass.pc) report('ERROR', file, `${where}: slash bass should be ${chord.bass.name}, lowest note is ${T.noteFor(root, formula, bassPc)}`);
  } else if (bassPc !== root.pc && a['allow-inversion'] === undefined) {
    report('WARN', file, `${where}: lowest note ${T.noteFor(root, formula, bassPc)} is not the root (add allow-inversion if intended)`);
  }
}

function checkFretboard(file, line, a) {
  const where = `L${line} <fret-board>`;
  if (a.chord !== undefined && !T.parseChord(a.chord)?.formula) report('ERROR', file, `${where}: chord "${a.chord}" not understood`);
  if (a.root !== undefined && !T.parseNote(a.root)) report('ERROR', file, `${where}: root "${a.root}" invalid`);
  if (a.formula !== undefined && T.parseFormula(a.formula).some((l) => T.labelSemitones(l) === undefined)) report('ERROR', file, `${where}: formula "${a.formula}" has unknown labels`);
  if (a.notes !== undefined && !['all', 'naturals'].includes(a.notes) && a.notes.trim().split(/\s+/).some((n) => !T.parseNote(n))) report('ERROR', file, `${where}: notes "${a.notes}" invalid`);
  if (a.positions !== undefined) {
    for (const tok of a.positions.trim().split(/\s+/)) {
      const [s, f] = tok.split(':').map(Number);
      if (!(s >= 1 && s <= 6 && f >= 0 && f <= 22)) report('ERROR', file, `${where}: position "${tok}" invalid`);
      const from = Number(a.from ?? 0), to = Number(a.to ?? 12);
      if (f < from || f > to) report('ERROR', file, `${where}: position "${tok}" outside from/to range ${from}–${to}`);
    }
  }
  if (a.positions === undefined && a.notes === undefined && !(a.chord || (a.root && a.formula))) report('ERROR', file, `${where}: nothing to mark (positions / notes / chord / root+formula)`);
}

function checkPlay(file, line, a) {
  const bad = (a.notes ?? '').trim().split(/\s+/).filter((n) => T.parseNote(n)?.midi == null);
  if (!a.notes || bad.length) report('ERROR', file, `L${line} <play-notes>: notes need octave numbers (e.g. C4) — bad: ${bad.join(' ') || '(empty)'}`);
}

for (const file of files) {
  const src = fs.readFileSync(file, 'utf8');
  for (const m of src.matchAll(/<chord-diagram\b[^>]*>/g)) checkChord(file, lineOf(src, m.index), attrsOf(m[0]));
  for (const m of src.matchAll(/<fret-board\b[^>]*>/g)) checkFretboard(file, lineOf(src, m.index), attrsOf(m[0]));
  for (const m of src.matchAll(/<play-notes\b[^>]*>/g)) checkPlay(file, lineOf(src, m.index), attrsOf(m[0]));
  for (const m of src.matchAll(/\b(?:href|src)="([^"#:]+)(?:#[^"]*)?"/g)) {
    if (!fs.existsSync(path.resolve(path.dirname(file), m[1]))) report('ERROR', file, `L${lineOf(src, m.index)} broken link ${m[1]}`);
  }
  if (!/<body[^>]*data-page="/.test(src)) report('WARN', file, 'body has no data-page');
  const opens = (src.match(/<(chord-diagram|fret-board|play-notes)\b/g) || []).length;
  const closes = (src.match(/<\/(chord-diagram|fret-board|play-notes)>/g) || []).length;
  if (opens !== closes) report('ERROR', file, `custom elements opened ${opens} vs closed ${closes} (they are not self-closing)`);
}

// Every TOC entry must exist.
const ebook = fs.readFileSync(path.join(ROOT, 'assets/ebook.js'), 'utf8');
for (const m of ebook.matchAll(/slug: '([^']+)'/g)) {
  if (!fs.existsSync(path.join(ROOT, 'pages', `${m[1]}.html`))) report('WARN', path.join(ROOT, 'assets/ebook.js'), `TOC page missing: pages/${m[1]}.html`);
}

console.log(`\n${files.length} file(s) checked — ${errors} error(s), ${warnings} warning(s)`);
process.exit(errors ? 1 : 0);
