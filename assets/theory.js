// Music theory helpers shared by the browser components and tools/check.cjs.
const Theory = (() => {
  const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
  const LETTER_PC = [0, 2, 4, 5, 7, 9, 11];
  const SHARP_NAMES = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
  const FLAT_NAMES = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'G♭', 'G', 'A♭', 'A', 'B♭', 'B'];
  const DEFAULT_LABELS = ['1', '♭2', '2', '♭3', '3', '4', '♭5', '5', '♭6', '6', '♭7', '7'];
  // Standard tuning, 6th string (low E2) to 1st string (high E4), as MIDI numbers.
  const TUNING_LOW_TO_HIGH = [40, 45, 50, 55, 59, 64];

  const LABEL_SEMITONES = {
    '1': 0, '♭2': 1, '♭9': 1, '2': 2, '9': 2, '♯2': 3, '♯9': 3, '♭3': 3, '3': 4,
    '4': 5, '11': 5, '♯4': 6, '♯11': 6, '♭5': 6, '5': 7, '♯5': 8, '♭6': 8, '♭13': 8,
    '6': 9, '13': 9, 'º7': 9, '♭7': 10, '7': 11,
  };

  // Chord suffix (normalised: ♯ ♭ º) → interval formula.
  const CHORD_TYPES = {
    '': '1 3 5', 'm': '1 ♭3 5', 'º': '1 ♭3 ♭5', 'm(♭5)': '1 ♭3 ♭5',
    '+': '1 3 ♯5', 'aug': '1 3 ♯5', '(♯5)': '1 3 ♯5', '5+': '1 3 ♯5',
    '5': '1 5',
    'sus2': '1 2 5', 'sus4': '1 4 5', 'sus': '1 4 5', '4': '1 4 5',
    '6': '1 3 5 6', 'm6': '1 ♭3 5 6',
    'add9': '1 3 5 9', '(add9)': '1 3 5 9', '(9)': '1 3 5 9',
    'madd9': '1 ♭3 5 9', 'm(add9)': '1 ♭3 5 9', 'm(9)': '1 ♭3 5 9',
    '7': '1 3 5 ♭7', '7M': '1 3 5 7', 'maj7': '1 3 5 7',
    'm7': '1 ♭3 5 ♭7', 'm7(♭5)': '1 ♭3 ♭5 ♭7', 'm7♭5': '1 ♭3 ♭5 ♭7', 'ø': '1 ♭3 ♭5 ♭7', 'ø7': '1 ♭3 ♭5 ♭7',
    'º7': '1 ♭3 ♭5 º7',
    'm7M': '1 ♭3 5 7', 'm(7M)': '1 ♭3 5 7', 'mM7': '1 ♭3 5 7',
    '7sus4': '1 4 5 ♭7', '7(4)': '1 4 5 ♭7', '7sus': '1 4 5 ♭7',
    '9': '1 3 5 ♭7 9', '7(9)': '1 3 5 ♭7 9',
    '7M(9)': '1 3 5 7 9', 'maj9': '1 3 5 7 9',
    'm7(9)': '1 ♭3 5 ♭7 9', 'm9': '1 ♭3 5 ♭7 9',
    '6(9)': '1 3 5 6 9', '6/9': '1 3 5 6 9', '69': '1 3 5 6 9', 'm6(9)': '1 ♭3 5 6 9',
    '7(♭9)': '1 3 5 ♭7 ♭9', '7(♯9)': '1 3 5 ♭7 ♯9', '7(13)': '1 3 5 ♭7 13',
    '7(♯5)': '1 3 ♯5 ♭7', '7(♭5)': '1 3 ♭5 ♭7', '7(♯11)': '1 3 5 ♭7 ♯11',
    'm7(11)': '1 ♭3 5 ♭7 11', '7M(♯11)': '1 3 5 7 ♯11',
  };

  const mod12 = (n) => ((n % 12) + 12) % 12;
  const accidental = (offset) => (offset > 0 ? '♯'.repeat(offset) : '♭'.repeat(-offset));
  const normalizeAccidentals = (s) => s.replace(/#/g, '♯').replace(/b/g, '♭').replace(/°/g, 'º');

  function parseNote(text) {
    const m = /^([A-Ga-g])([#♯b♭]*)(-?\d+)?$/.exec(String(text).trim());
    if (!m) return null;
    const letter = m[1].toUpperCase();
    let offset = 0;
    for (const ch of m[2]) offset += ch === '#' || ch === '♯' ? 1 : -1;
    const raw = LETTER_PC[LETTERS.indexOf(letter)] + offset;
    return {
      letter,
      offset,
      pc: mod12(raw),
      midi: m[3] === undefined ? null : (Number(m[3]) + 1) * 12 + raw,
      name: letter + accidental(offset),
    };
  }

  function normalizeLabel(label) {
    return normalizeAccidentals(String(label).trim());
  }

  function labelSemitones(label) {
    return LABEL_SEMITONES[normalizeLabel(label)];
  }

  function parseFormula(text) {
    return String(text).trim().split(/\s+/).map(normalizeLabel);
  }

  // Spell the note that sits `label` above `root`, e.g. (C, 'º7') → 'B♭♭'.
  function spellNote(root, label) {
    const norm = normalizeLabel(label);
    const semis = LABEL_SEMITONES[norm];
    if (semis === undefined) return null;
    const degree = parseInt(norm.replace(/[^0-9]/g, ''), 10);
    const letterIndex = (LETTERS.indexOf(root.letter) + degree - 1) % 7;
    let offset = mod12(root.pc + semis - LETTER_PC[letterIndex]);
    if (offset > 6) offset -= 12;
    return LETTERS[letterIndex] + accidental(offset);
  }

  // Interval label of pitch class `pc` relative to `root`, preferring the formula's spelling.
  function labelFor(root, formula, pc) {
    const dist = mod12(pc - root.pc);
    const fromFormula = formula?.find((l) => mod12(LABEL_SEMITONES[l]) === dist);
    return fromFormula ?? DEFAULT_LABELS[dist];
  }

  function noteFor(root, formula, pc, flats = false) {
    if (!root) return (flats ? FLAT_NAMES : SHARP_NAMES)[pc];
    return spellNote(root, labelFor(root, formula, pc));
  }

  function intervalClass(label) {
    const degree = parseInt(String(label).replace(/[^0-9]/g, ''), 10);
    if (degree === 1 || degree === 8) return 'root';
    if (degree === 3) return 'third';
    if (degree === 5) return 'fifth';
    if (degree === 7) return 'seventh';
    return 'other';
  }

  // "C7M(9)/E" → { root, bass, suffix, formula }. Formula is null for unknown suffixes.
  function parseChord(symbol) {
    const m = /^([A-G][#♯b♭]?)(.*?)(?:\/([A-G][#♯b♭]?))?$/.exec(String(symbol).trim());
    if (!m) return null;
    const root = parseNote(m[1]);
    const suffix = normalizeAccidentals(m[2].replace(/\s+/g, '').replace(/dim/g, 'º'));
    const formulaText = CHORD_TYPES[suffix];
    return {
      root,
      bass: m[3] ? parseNote(m[3]) : null,
      suffix,
      formula: formulaText === undefined ? null : parseFormula(formulaText),
    };
  }

  // "x32010" or "x 10 12 12 11 x" → [null, 3, 2, 0, 1, 0] (6th string first).
  function parseFrets(text) {
    const s = String(text).trim();
    const tokens = /[\s,]/.test(s) ? s.split(/[\s,]+/) : [...s];
    return tokens.map((t) => (/^[xX-]$/.test(t) ? null : Number(t)));
  }

  // String number 1 (high E) … 6 (low E) → open-string MIDI note.
  const openMidi = (stringNumber) => TUNING_LOW_TO_HIGH[6 - stringNumber];

  const midiToFreq = (midi) => 440 * 2 ** ((midi - 69) / 12);

  return {
    LETTERS, SHARP_NAMES, FLAT_NAMES, DEFAULT_LABELS, TUNING_LOW_TO_HIGH, CHORD_TYPES,
    mod12, parseNote, parseChord, parseFormula, parseFrets, labelSemitones, spellNote,
    labelFor, noteFor, intervalClass, openMidi, midiToFreq,
  };
})();

if (typeof module !== 'undefined') module.exports = Theory;
else globalThis.Theory = Theory;
