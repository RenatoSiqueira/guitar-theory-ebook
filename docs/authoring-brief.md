# Authoring brief — chapters

Project root: /home/renato-siqueira/.t3/scratch/2026-10-13-estou-estudando-viol-o-teoria-562df0c5

Personal ebook, **pt-BR**, for Renato: a guitarist at a *basic* level (plays open
and barre chords, never studied theory). Goal: understand *why* each chord has
its notes and be able to build any chord without memorising.

## Read first
- `pages/01-notes.html` — the reference chapter. Copy its exact page skeleton
  (head, `data-root="../"`, `data-page="<slug>"`, `<main>`, chapter-head with
  kicker/h1/lede, exercises section). Match its tone, length, density.
- `assets/theory.js` — supported chord suffixes (`CHORD_TYPES`) and labels.
- `assets/ebook.js` — TOC (slugs/titles) and components.
- **Do not edit anything in `assets/`, `index.html`, or other agents' pages.**
  If you need a component feature, work around it and mention it in your report.

## Components
- `<chord-diagram name="C7M" frets="x32000" fingers="x32000"></chord-diagram>`
  - `frets`: 6 entries, 6th string (low E) → 1st; `x` = muted. Use spaces for
    frets ≥ 10: `frets="x 10 12 12 12 10"`.
  - `fingers`: same order, 0 for open/muted. Same finger on same fret on ≥2
    strings draws a barre automatically.
  - Root/notes/intervals come from `name` (Brazilian cifra: `C`, `Cm`, `Cº`,
    `C+`, `C7`, `C7M`, `Cm7`, `Cm7(b5)`, `Cº7`, `C6`, `Csus4`, `C7(9)`, `C/E`…).
    Slash chords: lowest sounding note must equal the bass.
  - Optional: `caption="…"`, `label="interval|note|finger"` (initial mode),
    `title="…"` (display text instead of name), `base="5"` (force start fret),
    `allow-inversion` (silence the warning when the lowest note isn't the root
    on purpose), `root="C" formula="1 3 5"` instead of name.
- `<fret-board …></fret-board>` horizontal neck, 1st string on top. Pick one:
  - `positions="6:8 5:7 5:10"` (string:fret, strings 1–6), optionally with
    `root="C"` (+ `formula`/`chord`) to label intervals. Gets a play button.
  - `chord="Am"` or `root="G" formula="1 2 3 4 5 6 7"` → marks every
    occurrence in range.
  - `notes="C E G"` / `notes="all"` / `notes="naturals"`.
  - `from="0" to="12"` (range; positions must lie inside), `caption`, `label`,
    `flats`.
- `<play-notes notes="C4 E4 G4" mode="seq|strum|chord|both" gap="0.45">texto do botão</play-notes>`
  — notes need octave numbers. Guitar range: E2 (6th open) … ~E5.
  Inline inside `<p>`.
- Containers/classes: `<div class="diagram-row">` (row of chord diagrams),
  `<div class="tip|key|warn"><span class="callout-title">…</span><p>…</p></div>`,
  `<div class="table-wrap"><table>…</table></div>` (`td class="c"` centres),
  inline interval tag `<span class="iv iv-third">3</span>` (classes iv-root,
  iv-third, iv-fifth, iv-seventh, iv-other), exercises with
  `<details class="answer"><summary>Resposta</summary><p>…</p></details>`.

## Conventions (all chapters must agree)
- Notes: letter names (C D E F G A B) with ♯/♭ characters in text; mention
  Portuguese names (Dó, Ré…) when helpful.
- Interval names in prose: "3ª maior (3M)", "3ª menor (3m)", "5ª justa (5J)",
  "4ª aumentada / 5ª diminuta (trítono)", "7ª menor (7m)", "7ª maior (7M)".
  Abbreviations: 2m 2M 3m 3M 4J 4aum 5dim 5J 5aum 6m 6M 7m 7M 8J.
- Formula labels in diagrams/tables: 1 ♭2 2 ♭3 3 4 ♭5 5 ♯5 6 ♭7 7, 9 11 13, º7.
  Colours: 1 = root, 3 = third, 5 = fifth, 7 = seventh, others grey.
- Cifra style: Brazilian (`7M`, `m7(♭5)`, `º`, `º7`, `7(9)`), mention the
  international alternative (`maj7`, `ø`, `dim`) once where relevant.
- Semitone = 1 casa, tom = 2 casas. String numbers: 1ª corda = Mi agudo,
  6ª corda = Mi grave.
- Songs as examples: only name the song/artist; never quote lyrics.
- Code (file names, attributes) in English; all visible text in Portuguese.

## Each chapter
- Short explanation, built step by step from what earlier chapters taught (see
  the TOC). Don't re-teach earlier chapters; link back when useful
  (`<a href="03-intervals.html">capítulo 3</a>`).
- Interactive diagrams on the neck for every concept; at least a few
  `play-notes` / diagrams to hear.
- A `key` callout ("Guarde isto") with the essential takeaway.
- 4–5 exercises with collapsible answers, mixing theory and "no violão".

## Accuracy — mandatory
- Every fingering must be a real, playable, standard shape. Double-check frets
  and fingers string by string.
- Run `node tools/check.cjs pages/<your files>` until **0 errors**; review every
  warning (fix or justify with `allow-inversion`). `--list` prints the notes of
  every diagram — read it and confirm each chord.
- Screenshot to eyeball layout:
  `google-chrome --headless=new --disable-gpu --no-sandbox --window-size=1300,4000 --virtual-time-budget=2000 --screenshot=/tmp/<slug>.png "file://$PWD/pages/<slug>.html"`
  then view the PNG.

Report back: files written, check output summary, anything you couldn't do.
