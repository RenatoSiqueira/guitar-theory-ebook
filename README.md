# Violão: do intervalo ao acorde

Personal guitar-theory ebook (pt-BR): intervals → major scale → chord construction → harmonic field.
Static site, no build step — open `index.html` in a browser.

## Structure

- `index.html` — cover and table of contents
- `pages/` — chapters and appendices
- `assets/theory.js` — music theory helpers (also used by the checker)
- `assets/ebook.js` — navigation and web components (`<chord-diagram>`, `<fret-board>`, `<play-notes>`)
- `assets/style.css` — typography, components, print styles
- `docs/authoring-brief.md` — conventions for writing new chapters

## Checking

```sh
node tools/check.cjs          # validates every chord diagram, component attribute and link
node tools/check.cjs --list   # also prints the notes of every chord diagram
```

## PDF

Print from the browser (Save as PDF); answers open automatically and navigation is hidden.
