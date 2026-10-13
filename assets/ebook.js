// Ebook UI: navigation, chord diagrams, fretboard maps and a small plucked-string synth.
(() => {
  const T = window.Theory;

  const BOOK_TITLE = 'Violão: do intervalo ao acorde';

  const TOC = [
    { title: 'Parte 1 — Fundamentos', items: [
      { slug: '01-notes', title: '1. As 12 notas' },
      { slug: '02-fretboard', title: '2. O braço do violão' },
    ] },
    { title: 'Parte 2 — Intervalos', items: [
      { slug: '03-intervals', title: '3. O que é intervalo' },
      { slug: '04-intervals-on-the-neck', title: '4. Intervalos no braço' },
    ] },
    { title: 'Parte 3 — Escala maior', items: [
      { slug: '05-major-scale', title: '5. A fórmula da escala maior' },
      { slug: '06-major-scale-on-the-neck', title: '6. Escala maior no braço' },
    ] },
    { title: 'Parte 4 — Formação de acordes', items: [
      { slug: '07-triads', title: '7. Tríades' },
      { slug: '08-open-chords', title: '8. Por que o Dó aberto é assim' },
      { slug: '09-caged', title: '9. O sistema CAGED' },
      { slug: '10-seventh-chords', title: '10. Tétrades' },
      { slug: '11-inversions', title: '11. Inversões e baixo invertido' },
      { slug: '12-chord-symbols', title: '12. Lendo cifras' },
    ] },
    { title: 'Parte 5 — Harmonia', items: [
      { slug: '13-harmonic-field', title: '13. Campo harmônico maior' },
      { slug: '14-progressions', title: '14. Funções e progressões' },
      { slug: '15-transposition', title: '15. Transposição' },
    ] },
    { title: 'Apêndices', items: [
      { slug: 'appendix-a-chord-formulas', title: 'A. Fórmulas de acordes' },
      { slug: 'appendix-b-harmonic-fields', title: 'B. Campo harmônico em todos os tons' },
    ] },
  ];

  // ---------- Audio: Karplus–Strong plucked string ----------

  const Sound = (() => {
    let ctx = null;
    const cache = new Map();

    function context() {
      ctx ??= new (window.AudioContext || window.webkitAudioContext)();
      if (ctx.state === 'suspended') ctx.resume();
      return ctx;
    }

    function buffer(midi) {
      if (cache.has(midi)) return cache.get(midi);
      const ac = context();
      const rate = ac.sampleRate;
      const period = Math.max(2, Math.round(rate / T.midiToFreq(midi)));
      const length = Math.floor(rate * 2.6);
      const buf = ac.createBuffer(1, length, rate);
      const out = buf.getChannelData(0);
      const ring = new Float32Array(period);
      for (let i = 0; i < period; i++) ring[i] = Math.random() * 2 - 1;
      let idx = 0;
      for (let i = 0; i < length; i++) {
        const next = (idx + 1) % period;
        out[i] = ring[idx] * 0.5;
        ring[idx] = 0.996 * 0.5 * (ring[idx] + ring[next]);
        idx = next;
      }
      cache.set(midi, buf);
      return buf;
    }

    function pluck(midi, delay = 0, gain = 0.55) {
      const ac = context();
      const src = ac.createBufferSource();
      src.buffer = buffer(midi);
      const g = ac.createGain();
      const t = ac.currentTime + delay + 0.02;
      g.gain.setValueAtTime(gain, t);
      g.gain.setTargetAtTime(0, t + 2.2, 0.08);
      src.connect(g).connect(ac.destination);
      src.start(t);
    }

    const chord = (midis, strum = 0.04, delay = 0) =>
      midis.forEach((m, i) => pluck(m, delay + i * strum, 0.45));
    const sequence = (midis, gap = 0.45, delay = 0) =>
      midis.forEach((m, i) => pluck(m, delay + i * gap));

    return { pluck, chord, sequence };
  })();

  // ---------- Helpers ----------

  const SVG_NS = 'http://www.w3.org/2000/svg';
  function svg(tag, attrs = {}, text) {
    const el = document.createElementNS(SVG_NS, tag);
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
    if (text != null) el.textContent = text;
    return el;
  }

  function html(tag, className, text) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text != null) el.textContent = text;
    return el;
  }

  const MODE_LABELS = { finger: 'dedos', note: 'notas', interval: 'intervalos' };

  function modeSwitch(host) {
    const wrap = html('div', 'mode-switch');
    if (host.modes.length < 2) return wrap;
    for (const mode of host.modes) {
      const b = html('button', null, MODE_LABELS[mode]);
      b.type = 'button';
      b.setAttribute('aria-pressed', String(mode === host.mode));
      b.addEventListener('click', () => { host.mode = mode; host.render(); });
      wrap.append(b);
    }
    return wrap;
  }

  function playButton(label, onClick) {
    const b = html('button', 'play-btn');
    b.type = 'button';
    b.append(html('span', 'play-icon', '▶'), document.createTextNode(` ${label}`));
    b.addEventListener('click', onClick);
    return b;
  }

  const nextMode = (host) => {
    host.mode = host.modes[(host.modes.indexOf(host.mode) + 1) % host.modes.length];
    host.render();
  };

  // ---------- <chord-diagram> ----------

  class ChordDiagram extends HTMLElement {
    connectedCallback() {
      if (this.dataset.ready) return;
      this.dataset.ready = '1';
      const name = this.getAttribute('name') || '';
      const chord = name ? T.parseChord(name) : null;
      this.frets = T.parseFrets(this.getAttribute('frets') || 'xxxxxx');
      this.fingers = this.hasAttribute('fingers') ? T.parseFrets(this.getAttribute('fingers')) : null;
      this.root = this.hasAttribute('root') ? T.parseNote(this.getAttribute('root')) : chord?.root ?? null;
      this.formula = this.hasAttribute('formula') ? T.parseFormula(this.getAttribute('formula')) : chord?.formula ?? null;
      this.modes = [...(this.fingers ? ['finger'] : []), 'note', ...(this.root ? ['interval'] : [])];
      const start = this.getAttribute('label');
      this.mode = this.modes.includes(start) ? start : this.modes[0];
      this.render();
    }

    stringInfo(s) {
      const fret = this.frets[s];
      if (fret == null) return null;
      const midi = T.TUNING_LOW_TO_HIGH[s] + fret;
      const pc = T.mod12(midi);
      const interval = this.root ? T.labelFor(this.root, this.formula, pc) : null;
      return {
        fret, midi, interval,
        note: T.noteFor(this.root, this.formula, pc, this.hasAttribute('flats')),
        finger: this.fingers?.[s] || '',
        cls: interval ? `iv-${T.intervalClass(interval)}` : 'iv-plain',
      };
    }

    labelOf(info) {
      if (this.mode === 'finger') return String(info.finger || '');
      return this.mode === 'note' ? info.note : info.interval;
    }

    render() {
      const infos = [0, 1, 2, 3, 4, 5].map((s) => this.stringInfo(s));
      const fretted = infos.filter((i) => i && i.fret > 0).map((i) => i.fret);
      const maxFret = Math.max(0, ...fretted);
      const minFret = fretted.length ? Math.min(...fretted) : 1;
      const base = Number(this.getAttribute('base')) || (maxFret <= 4 ? 1 : minFret);
      const rows = Math.max(4, maxFret - base + 1);
      const left = 30, gap = 20, top = 36, rowH = 26;
      const width = left * 2 + gap * 5, height = top + rows * rowH + 10;
      const xOf = (s) => left + s * gap;
      const yOf = (fret) => top + (fret - base + 0.5) * rowH;

      const box = svg('svg', { viewBox: `0 0 ${width} ${height}`, class: 'chord-svg', role: 'img',
        'aria-label': `Diagrama do acorde ${this.getAttribute('name') || ''}` });
      for (let r = 0; r <= rows; r++) {
        box.append(svg('line', { x1: left, x2: xOf(5), y1: top + r * rowH, y2: top + r * rowH,
          class: r === 0 && base === 1 ? 'nut' : 'fret' }));
      }
      for (let s = 0; s < 6; s++) box.append(svg('line', { x1: xOf(s), x2: xOf(s), y1: top, y2: top + rows * rowH, class: 'string' }));
      if (base > 1) box.append(svg('text', { x: left - 9, y: yOf(base) + 4, class: 'base-fret', 'text-anchor': 'end' }, `${base}ª`));

      // Barres: the same finger pressing the same fret on two or more strings.
      if (this.fingers) {
        const groups = new Map();
        infos.forEach((info, s) => {
          if (!info || info.fret === 0 || !info.finger) return;
          const key = `${info.finger}@${info.fret}`;
          groups.set(key, [...(groups.get(key) || []), s]);
        });
        for (const [key, strings] of groups) {
          if (strings.length < 2) continue;
          const fret = Number(key.split('@')[1]);
          const x1 = xOf(Math.min(...strings)), x2 = xOf(Math.max(...strings));
          box.append(svg('rect', { x: x1 - 9, y: yOf(fret) - 9, width: x2 - x1 + 18, height: 18, rx: 9, class: 'barre' }));
        }
      }

      infos.forEach((info, s) => {
        const x = xOf(s);
        if (!info) {
          box.append(svg('text', { x, y: top - 10, class: 'muted', 'text-anchor': 'middle' }, '×'));
          return;
        }
        const label = this.labelOf(info);
        const colored = this.mode !== 'finger';
        if (info.fret === 0) {
          const y = top - 15;
          box.append(svg('circle', { cx: x, cy: y, r: colored ? 8 : 5.5, class: colored ? `dot ${info.cls}` : 'open' }));
          if (colored) box.append(svg('text', { x, y: y + 3.5, class: 'dot-label small', 'text-anchor': 'middle' }, label));
          return;
        }
        const y = yOf(info.fret);
        box.append(svg('circle', { cx: x, cy: y, r: 9, class: colored ? `dot ${info.cls}` : 'dot finger' }));
        box.append(svg('text', { x, y: y + 3.8, class: `dot-label${label.length > 2 ? ' small' : ''}`, 'text-anchor': 'middle' }, label));
      });

      box.addEventListener('click', () => nextMode(this));

      const figure = html('figure', 'chord');
      figure.append(html('figcaption', 'chord-name', this.getAttribute('title') || this.getAttribute('name') || ''));
      figure.append(box);
      if (this.hasAttribute('caption')) figure.append(html('p', 'chord-caption', this.getAttribute('caption')));
      const controls = html('div', 'controls');
      controls.append(modeSwitch(this), playButton('ouvir', () =>
        Sound.chord(infos.filter(Boolean).map((i) => i.midi))));
      figure.append(controls);
      this.replaceChildren(figure);
    }
  }

  // ---------- <fret-board> ----------

  const INLAYS = [3, 5, 7, 9, 15, 17, 19, 21];

  class FretBoard extends HTMLElement {
    connectedCallback() {
      if (this.dataset.ready) return;
      this.dataset.ready = '1';
      this.from = Number(this.getAttribute('from') ?? 0);
      this.to = Number(this.getAttribute('to') ?? 12);
      this.flats = this.hasAttribute('flats');

      let root = null, formula = null;
      if (this.hasAttribute('chord')) {
        const chord = T.parseChord(this.getAttribute('chord'));
        root = chord?.root ?? null;
        formula = chord?.formula ?? null;
      }
      if (this.hasAttribute('root')) root = T.parseNote(this.getAttribute('root'));
      if (this.hasAttribute('formula')) formula = T.parseFormula(this.getAttribute('formula'));
      this.root = root;
      this.formula = formula;

      this.marks = [];
      const positions = this.getAttribute('positions');
      if (positions) {
        for (const token of positions.trim().split(/\s+/)) {
          const [s, f] = token.split(':').map(Number);
          this.marks.push({ s, f });
        }
      } else {
        const notes = this.getAttribute('notes');
        let pcs = null;
        if (notes === 'all') pcs = [...Array(12).keys()];
        else if (notes === 'naturals') pcs = [0, 2, 4, 5, 7, 9, 11];
        else if (notes) pcs = notes.trim().split(/\s+/).map((n) => T.parseNote(n).pc);
        else if (root && formula) pcs = formula.map((l) => T.mod12(root.pc + T.labelSemitones(l)));
        for (let s = 1; s <= 6; s++) {
          for (let f = this.from; f <= this.to; f++) {
            if (pcs?.includes(T.mod12(T.openMidi(s) + f))) this.marks.push({ s, f });
          }
        }
      }

      this.modes = root ? ['interval', 'note'] : ['note'];
      const start = this.getAttribute('label');
      this.mode = this.modes.includes(start) ? start : this.modes[0];
      this.render();
    }

    render() {
      const { from, to } = this;
      const hasOpen = from === 0;
      const firstCell = hasOpen ? 1 : from;
      const cells = to - firstCell + 1;
      const fw = 46, rowH = 24, top = 16;
      const x0 = hasOpen ? 42 : 14;
      const width = x0 + cells * fw + 12, height = top + rowH * 5 + 30;
      const yOf = (s) => top + (s - 1) * rowH;
      const xOf = (f) => (f === 0 ? x0 - 22 : x0 + (f - firstCell + 0.5) * fw);

      const box = svg('svg', { viewBox: `0 0 ${width} ${height}`, width, height, class: 'fretboard-svg', role: 'img',
        'aria-label': 'Mapa do braço do violão' });
      const midY = top + rowH * 2.5;
      for (let f = firstCell; f <= to; f++) {
        const cx = xOf(f);
        if (INLAYS.includes(f)) box.append(svg('circle', { cx, cy: midY, r: 5, class: 'inlay' }));
        if (f === 12 || f === 24) {
          box.append(svg('circle', { cx, cy: top + rowH * 1.5, r: 5, class: 'inlay' }));
          box.append(svg('circle', { cx, cy: top + rowH * 3.5, r: 5, class: 'inlay' }));
        }
        box.append(svg('text', { x: cx, y: height - 8, class: 'fret-number', 'text-anchor': 'middle' }, f));
      }
      for (let i = 0; i <= cells; i++) {
        const x = x0 + i * fw;
        box.append(svg('line', { x1: x, x2: x, y1: top, y2: yOf(6), class: i === 0 && hasOpen ? 'nut' : 'fret' }));
      }
      for (let s = 1; s <= 6; s++) {
        box.append(svg('line', { x1: hasOpen ? x0 - 34 : x0, x2: x0 + cells * fw, y1: yOf(s), y2: yOf(s),
          class: 'string', 'stroke-width': 0.8 + (s - 1) * 0.25 }));
      }
      if (hasOpen) box.append(svg('text', { x: xOf(0), y: height - 8, class: 'fret-number', 'text-anchor': 'middle' }, 'solta'));

      for (const { s, f } of this.marks) {
        const midi = T.openMidi(s) + f;
        const pc = T.mod12(midi);
        const interval = this.root ? T.labelFor(this.root, this.formula, pc) : null;
        const label = this.mode === 'interval' ? interval : T.noteFor(this.root, this.formula, pc, this.flats);
        const cls = interval ? `iv-${T.intervalClass(interval)}` : 'iv-plain';
        const g = svg('g', { class: 'mark' });
        g.append(svg('circle', { cx: xOf(f), cy: yOf(s), r: 10, class: `dot ${cls}` }));
        g.append(svg('text', { x: xOf(f), y: yOf(s) + 4, class: `dot-label${label.length > 2 ? ' small' : ''}`, 'text-anchor': 'middle' }, label));
        g.addEventListener('click', (e) => { e.stopPropagation(); Sound.pluck(midi); });
        box.append(g);
      }
      box.addEventListener('click', () => nextMode(this));

      const figure = html('figure', 'fretboard');
      const scroller = html('div', 'fretboard-scroll');
      scroller.append(box);
      figure.append(scroller);
      if (this.hasAttribute('caption')) figure.append(html('figcaption', 'fretboard-caption', this.getAttribute('caption')));
      const controls = html('div', 'controls');
      controls.append(modeSwitch(this));
      if (this.hasAttribute('positions')) {
        const midis = [...new Set(this.marks.map(({ s, f }) => T.openMidi(s) + f))].sort((a, b) => a - b);
        controls.append(playButton('ouvir em ordem', () => Sound.sequence(midis, 0.32)));
      }
      figure.append(controls);
      this.replaceChildren(figure);
    }
  }

  // ---------- <play-notes> ----------

  class PlayNotes extends HTMLElement {
    connectedCallback() {
      if (this.dataset.ready) return;
      this.dataset.ready = '1';
      const label = this.textContent.trim() || 'ouvir';
      const midis = (this.getAttribute('notes') || '').trim().split(/\s+/)
        .map((n) => T.parseNote(n)?.midi).filter((m) => m != null);
      const mode = this.getAttribute('mode') || 'seq';
      const gap = Number(this.getAttribute('gap') || 0.45);
      this.replaceChildren(playButton(label, () => {
        if (mode === 'chord') Sound.chord(midis, 0);
        else if (mode === 'strum') Sound.chord(midis);
        else if (mode === 'both') { Sound.sequence(midis, gap); Sound.chord(midis, 0.04, midis.length * gap + 0.3); }
        else Sound.sequence(midis, gap);
      }));
    }
  }

  // ---------- Navigation ----------

  function buildNavigation() {
    const body = document.body;
    const root = body.dataset.root ?? './';
    const current = body.dataset.page;
    const href = (slug) => `${root}pages/${slug}.html`;

    const tocHtml = TOC.map((part) => `
      <div class="toc-part"><p>${part.title}</p><ol>${part.items.map((it) =>
        `<li><a href="${href(it.slug)}"${it.slug === current ? ' aria-current="page"' : ''}>${it.title}</a></li>`).join('')}</ol></div>`).join('');

    const nav = html('nav', 'toc');
    nav.setAttribute('aria-label', 'Sumário');
    nav.innerHTML = `<a class="toc-title" href="${root}index.html">${BOOK_TITLE}</a>${tocHtml}`;
    const toggle = html('button', 'toc-toggle', '☰ Sumário');
    toggle.type = 'button';
    toggle.addEventListener('click', () => body.classList.toggle('toc-open'));
    body.prepend(toggle, nav);

    const full = document.getElementById('toc-full');
    if (full) full.innerHTML = tocHtml;

    const flat = TOC.flatMap((p) => p.items);
    const i = flat.findIndex((it) => it.slug === current);
    const main = document.querySelector('main');
    if (i < 0 || !main) return;
    const prev = flat[i - 1], next = flat[i + 1];
    const pager = html('nav', 'pager');
    pager.innerHTML =
      (prev ? `<a class="prev" href="${href(prev.slug)}"><span>← Anterior</span>${prev.title}</a>` : '<span></span>') +
      (next ? `<a class="next" href="${href(next.slug)}"><span>Próximo →</span>${next.title}</a>`
            : `<a class="next" href="${root}index.html"><span>Fim</span>Voltar ao início</a>`);
    main.append(pager);
  }

  customElements.define('chord-diagram', ChordDiagram);
  customElements.define('fret-board', FretBoard);
  customElements.define('play-notes', PlayNotes);

  window.addEventListener('beforeprint', () => document.querySelectorAll('details').forEach((d) => { d.open = true; }));
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', buildNavigation);
  else buildNavigation();
})();
