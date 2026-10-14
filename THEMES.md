# Creating a theme for 1-5731N

A **theme** is a family ("Clean", …) that offers one or more **versions** ("Light", "Dark", …).
It is **one entry of `themes.js`**; each version is a name and a list of CSS variables. Nothing else to touch:
the 36 symbols (`glyphs.js`, vector) and the layout (`index.html`) contain no hard-coded colour.
(The internal ids are historical and French: `epure` = Clean, `clair` = light, `fonce` = dark.)

```js
// in themes.js, inside the THEMES object:
sepia: {
  label: 'Sepia',                       // name shown in Options → Theme
  variants: {
    clair: {
      label: 'Light',
      vars: { '--bg': '#f3ead8', '--cell-bg': '#fbf5e8', '--row-0': '#8c4a1f' /* … */ }
    },
    fonce: {
      label: 'Dark',
      base: 'clair',                    // optional: inherit from a version of the same family
      vars: { '--bg': '#2a2118' }       // and redefine only what changes
    }
  }
}
```

The displayed names come from the `theme.<id>` and `variant.<id>` keys of `lang/*.js`; failing that, the theme's `label` is used as a fallback.
Provided families: **Clean** (light, dark), **Aurora** (frosted glass), **Brutal** (neo-brutalism), **Terra** (warm natural tones). A version can inherit from another family: `base: 'epure/clair'` (the last three do this and redefine only what changes).
The choice (theme + version) is made in **Options** (home screen); the ☰ menu of the game switches from one version to the other.
It is remembered on the device. A family may have a single version (the "clair" version is the default if it exists).
Fallback values: if a variable is missing, the value of the Clean light theme (copied into the `<style>` of `index.html`) applies.

## Variables

| Group | Variables |
|---|---|
| Page | `--bg` background · `--fg` text · `--muted` quiet text · `--acc` accent colour (titles, timer) · `--theme-color` browser bar |
| Buttons | `--btn-bg` `--btn-fg` `--btn-bd` `--btn-active` `--btn-radius` · `--danger-*` ("Erase" button) · `--mode-excl-bg/fg` (✗ button, red) · `--mode-ok-bg/fg/bd` (✓ button, green) |
| Board | `--board-bg` `--board-radius` `--board-gap` · `--cell-bg` `--cell-def-bg` (solved cell) `--cell-radius` `--cell-bd` · `--cell-err` (error outline) |
| Tiles | `--tile-bg` `--tile-bd` `--tile-radius` `--tile-shadow` · `--tile-def-ring` (width of the coloured ring of a solved cell) |
| Symbols | `--glyph-font` `--glyph-weight` (digits and letters) · `--glyph-stroke` `--glyph-stroke-bold` (strokes: shapes, signs, Roman numerals) · `--icon-stroke` (stroke of the bar pictograms: menu, undo, ✓, ✗) · `--icon-stroke-big` (stroke of the 3 large zoom buttons, thicker because bigger) · `--row-0` … `--row-5` (one colour per row: digits, letters, Roman numerals, dice, shapes, signs) · `--slot-opacity` |
| Clues | `--hint-bg` `--hint-bd` `--hint-radius` `--hint-sym` (↔ arrow and dots) `--hint-sep` (line between the two lists) `--done-opacity` (ticked clue) |
| Cell zoom | `--zoom-veil` veil · `--zoom-bg` · `--zoom-frame` frame · `--zoom-radius` · `--zoom-shadow` |
| Dialogs | `--dialog-bg` `--dialog-bd` `--dialog-veil` · `--toast-bg` `--toast-fg` |
| Tables | `--rule` (statistics rules) |
| Material | `--bg-image` (background: gradient or CSS image) · `--bf` (blur behind the large panels: board, zoom, buttons, dialogs, e.g. `blur(16px) saturate(1.4)`) · `--bw` (border width, e.g. `3px`) · `--btn-shadow` (button shadow, hard or soft) · `--ui-font` (interface font) · `--foot-size` (footer size) |

## Beyond colours

- **A different drawing of the symbols**: `glyphs.js` contains only `currentColor` shapes. For a different symbol set,
  replace this file (same identifiers `g-A1` … `g-F6`, `h-near`, `h-side`); the themes stay valid.
- **A different layout**: the `<style>` of `index.html` (it lives in the page and not in a `.css` file because some
  web servers deliver `.css` as `application/octet-stream`, which the browser refuses).

## Reference theme: Clean, `clair` version (variables and values)

```js
/* page */
'--bg': '#f5f6f8', '--fg': '#1d2330', '--muted': '#6a7385', '--acc': '#2f6fed', '--theme-color': '#f5f6f8',
/* buttons and bar */
'--btn-bg': '#ffffff', '--btn-fg': '#1d2330', '--btn-bd': '#d6dae2', '--btn-active': '#e7ebf4',
'--btn-radius': '12px', '--danger-bg': '#fdecee', '--danger-fg': '#b4233a', '--danger-bd': '#f1b9c1',
'--mode-excl-bg': '#fdecee', '--mode-excl-fg': '#b4233a',
/* board */
'--board-bg': '#dfe3ea', '--board-radius': '12px', '--board-gap': '3px',
'--cell-bg': '#ffffff', '--cell-radius': '7px', '--cell-bd': 'transparent', '--cell-err': '#e5484d',
'--cell-def-bg': '#ffffff',
/* tiles (placed symbol, clues, zoom) */
'--tile-bg': '#ffffff', '--tile-bd': '#d9dde5', '--tile-radius': '8px', '--tile-shadow': '0 1px 2px rgba(20,32,60,.08)',
'--tile-def-ring': '2px',
/* symbols */
'--glyph-font': "'Inter','Segoe UI',Roboto,'Helvetica Neue',system-ui,sans-serif",
'--glyph-weight': '600', '--glyph-stroke': '3.2', '--glyph-stroke-bold': '4.6', '--icon-stroke': '2.4',
'--row-0': '#2f6fed', '--row-1': '#0e9384', '--row-2': '#d9822b', '--row-3': '#7a4fe0', '--row-4': '#d6336c', '--row-5': '#4b5565',
'--slot-opacity': '.9',
/* clues */
'--hint-bg': '#ffffff', '--hint-bd': '#dde1e8', '--hint-radius': '6px', '--hint-sym': '#8a93a6', '--done-opacity': '.34',
'--hint-sep': '#dde1e8',
/* cell zoom */
'--zoom-veil': 'rgba(245,246,248,.9)', '--zoom-bg': '#ffffff', '--zoom-frame': '#2f6fed', '--zoom-radius': '16px',
'--zoom-shadow': '0 12px 40px rgba(20,32,60,.18)',
/* dialogs and messages */
'--dialog-bg': '#ffffff', '--dialog-bd': '#d6dae2', '--dialog-veil': 'rgba(29,35,48,.38)',
'--toast-bg': '#1d2330', '--toast-fg': '#ffffff',
/* tables (statistics) */
'--rule': '#e1e4ea'
```
