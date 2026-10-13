# Guitar ebook — design

Personal ebook (pt-BR) for a basic-level guitarist: intervals → major scale →
chord construction → harmonic field. Delivered as a local static site (open
`index.html` in a browser, no server), printable to PDF.

## Structure

```
index.html            cover, how to use, colour legend, full TOC
assets/theory.js      pure music theory (also loaded by Node check script)
assets/ebook.js       navigation + web components + plucked-string synth
assets/style.css      book typography, components, print styles
pages/NN-slug.html    one chapter per page; appendices too
tools/check.cjs       validates every chord diagram / link / attribute
```

## Components (custom elements, no build step)

- `<chord-diagram name="C7M" frets="x32000" fingers="x32000">` — vertical
  chord box. Root and formula come from the chord symbol, so notes and
  intervals are spelled correctly. Click toggles fingers / notes / intervals;
  ▶ strums it.
- `<fret-board>` — horizontal neck map. Marks come from `positions`
  (`string:fret`), `chord`, `root` + `formula`, or `notes`
  (`all` / `naturals` / list). Dots are clickable (play the note).
- `<play-notes notes="C4 E4 G4" mode="seq|strum|chord">` — listen button.

Interval colours are constant across the book: root, 3rd, 5th, 7th, other.

## Content

15 chapters in 5 parts + 2 appendices (chord formulas, harmonic fields in all
keys). Each chapter: short explanation, interactive diagrams, playable
examples, 3–5 exercises with collapsible answers.

## Verification

`node tools/check.cjs` — every chord diagram must contain only notes from its
symbol's formula, include the root, and have the right bass for slash chords;
every local link must resolve.
