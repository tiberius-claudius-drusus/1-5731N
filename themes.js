/* ---------------------------------------------------------------------------
 * File      : 1-5731n/themes.js
 * Version   : 1.0.0
 * Role      : Theme registry: theme families, their light/dark versions (CSS variables) and the apply/normalize API.
 * Depends on: none
 * Called by : app.js (window.SteinThemes) ; index.html (script tag)
 * Produces  : CSS custom properties set on the document root ; <meta name="theme-color">
 * Changelog : see CHANGELOG.md
 * ---------------------------------------------------------------------------
 * A THEME is a family ("Clean", "Aurora", ...) offering one or more VERSIONS ("Light", "Dark", ...).
 * Each version = a name and CSS variables. The application sets these variables on the page; the symbols
 * (glyphs.js) and the layout (index.html) never contain a hard-coded colour.
 * To create a theme, add an entry here (see THEMES.md for the full variable list):
 *
 *   my_theme: {
 *     label: 'My theme',                       // name shown in Options -> Theme
 *     variants: {
 *       clair: { label: 'Light', vars: { '--bg': '#fff', ... } },
 *       fonce: { label: 'Dark', base: 'clair', vars: { '--bg': '#000', ... } }   // base: inherit a version of the same
 *     }                                         //   family, or of another one: base: 'epure/clair'
 *   }
 */
(function () {
  'use strict';
  var THEMES = {
   epure: {
    label: 'Épuré',
    variants: {
    /* Clean light: off-white background, white tiles with a thin border, one soft colour per row. */
    clair: {
      label: 'Clair',
      vars: {
        /* page */
        '--bg': '#f5f6f8', '--fg': '#1d2330', '--muted': '#6a7385', '--acc': '#2f6fed', '--theme-color': '#f5f6f8',
        /* buttons and bar */
        '--btn-bg': '#ffffff', '--btn-fg': '#1d2330', '--btn-bd': '#d6dae2', '--btn-active': '#e7ebf4',
        '--btn-radius': '12px', '--danger-bg': '#fdecee', '--danger-fg': '#b4233a', '--danger-bd': '#f1b9c1',
        '--mode-excl-bg': '#fdecee', '--mode-excl-fg': '#b4233a', '--mode-ok-bg': '#e6f6ec', '--mode-ok-fg': '#1b7f45', '--mode-ok-bd': '#b5e0c4',
        /* board */
        '--board-bg': '#dfe3ea', '--board-radius': '12px', '--board-gap': '3px',
        '--cell-bg': '#ffffff', '--cell-radius': '7px', '--cell-bd': 'transparent', '--cell-err': '#e5484d',
        '--cell-def-bg': '#ffffff',
        /* tiles (placed symbol, clues, zoom) */
        '--tile-bg': '#ffffff', '--tile-bd': '#d9dde5', '--tile-radius': '8px', '--tile-shadow': '0 1px 2px rgba(20,32,60,.08)',
        '--tile-def-ring': '2px',
        /* symbols */
        '--glyph-font': "'Inter','Segoe UI',Roboto,'Helvetica Neue',system-ui,sans-serif",
        '--glyph-weight': '600', '--glyph-stroke': '3.2', '--glyph-stroke-bold': '4.6', '--icon-stroke': '2.4', '--icon-stroke-big': '3',
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
        '--rule': '#e1e4ea',
        /* material: gradient background, blur behind the large panels, border width, button shadow, interface font */
        '--bg-image': 'none', '--foot-size': '.72rem', '--bf': 'none', '--bw': '1px', '--btn-shadow': 'none',
        '--ui-font': "system-ui,-apple-system,'Segoe UI',Roboto,sans-serif"
      }
    },

    /* Clean dark: same design, midnight-blue background; only the colours are redefined. */
    fonce: {
      label: 'Foncé',
      base: 'clair',
      vars: {
        '--bg': '#12161f', '--fg': '#e8ebf2', '--muted': '#8d96aa', '--acc': '#6d9bff', '--theme-color': '#12161f',
        '--btn-bg': '#1c2230', '--btn-fg': '#e8ebf2', '--btn-bd': '#2d3548', '--btn-active': '#27304a',
        '--danger-bg': '#3a1d24', '--danger-fg': '#ff9aa5', '--danger-bd': '#6a2f3a',
        '--mode-excl-bg': '#3a1d24', '--mode-excl-fg': '#ff9aa5', '--mode-ok-bg': '#173126', '--mode-ok-fg': '#7be0a5', '--mode-ok-bd': '#2c6a4a',
        '--board-bg': '#0b0e15', '--cell-bg': '#1a2030', '--cell-def-bg': '#1a2030',
        '--tile-bg': '#1a2030', '--tile-bd': '#2d3548', '--tile-shadow': 'none',
        '--row-0': '#6d9bff', '--row-1': '#3ecfb8', '--row-2': '#f0a85b', '--row-3': '#a88bff', '--row-4': '#ff7aa6', '--row-5': '#aab4c8',
        '--hint-bg': '#1a2030', '--hint-bd': '#2d3548', '--hint-sym': '#7d879c', '--hint-sep': '#2d3548',
        '--zoom-veil': 'rgba(8,10,16,.88)', '--zoom-bg': '#1a2030', '--zoom-frame': '#6d9bff', '--zoom-shadow': 'none',
        '--dialog-bg': '#1c2230', '--dialog-bd': '#2d3548', '--dialog-veil': 'rgba(0,0,0,.55)',
        '--toast-bg': '#e8ebf2', '--toast-fg': '#12161f', '--rule': '#2d3548'
      }
    }
    }
   },

   /* Aurora: frosted glass ("glassmorphism") — soft gradient, translucent blurred panels, light border. */
   aurora: {
    label: 'Aurora',
    variants: {
     clair: {
      label: 'Clair', base: 'epure/clair',
      vars: {
        '--bg': '#e8edfb', '--theme-color': '#e8edfb', '--fg': '#1b2142', '--muted': '#5d6791', '--acc': '#5568f2',
        '--bg-image': 'linear-gradient(135deg,#d6e4ff 0%,#ece3ff 48%,#ffe3ee 100%)',
        '--bf': 'blur(16px) saturate(1.4)',
        '--btn-bg': 'rgba(255,255,255,.55)', '--btn-bd': 'rgba(255,255,255,.9)', '--btn-active': 'rgba(255,255,255,.85)', '--btn-radius': '16px',
        '--btn-shadow': '0 4px 18px rgba(80,90,170,.14)',
        '--board-bg': 'rgba(255,255,255,.38)', '--board-radius': '22px', '--board-gap': '4px',
        '--cell-bg': 'rgba(255,255,255,.62)', '--cell-def-bg': 'rgba(255,255,255,.62)', '--cell-radius': '13px', '--cell-bd': 'rgba(255,255,255,.9)',
        '--tile-bg': 'rgba(255,255,255,.66)', '--tile-bd': 'rgba(255,255,255,.95)', '--tile-radius': '14px', '--tile-shadow': '0 3px 14px rgba(80,90,170,.16)',
        '--row-0': '#4a63ff', '--row-1': '#0fb39f', '--row-2': '#f2802f', '--row-3': '#8f55f5', '--row-4': '#ec3f86', '--row-5': '#55627f',
        '--hint-bg': 'rgba(255,255,255,.6)', '--hint-bd': 'rgba(255,255,255,.95)', '--hint-sep': 'rgba(120,130,190,.3)', '--hint-sym': '#7c88b4', '--hint-radius': '9px',
        '--zoom-veil': 'rgba(232,237,251,.7)', '--zoom-bg': 'rgba(255,255,255,.7)', '--zoom-frame': '#7a8cff', '--zoom-radius': '22px', '--zoom-shadow': '0 16px 48px rgba(80,90,170,.25)',
        '--dialog-bg': 'rgba(255,255,255,.82)', '--dialog-bd': 'rgba(255,255,255,.95)', '--dialog-veil': 'rgba(60,70,130,.32)',
        '--toast-bg': '#1b2142', '--rule': 'rgba(120,130,190,.28)'
      }
     },
     fonce: {
      label: 'Foncé', base: 'clair',
      vars: {
        '--bg': '#0a1026', '--theme-color': '#0a1026', '--fg': '#eaf0ff', '--muted': '#93a0cc', '--acc': '#8fa6ff',
        '--bg-image': 'linear-gradient(135deg,#1b1147 0%,#0b1d44 50%,#052a36 100%)',
        '--btn-bg': 'rgba(255,255,255,.08)', '--btn-fg': '#eaf0ff', '--btn-bd': 'rgba(255,255,255,.18)', '--btn-active': 'rgba(255,255,255,.18)',
        '--btn-shadow': '0 4px 20px rgba(0,0,0,.28)',
        '--danger-bg': 'rgba(255,90,110,.16)', '--danger-fg': '#ff9fb0', '--danger-bd': 'rgba(255,120,140,.4)', '--mode-excl-bg': 'rgba(255,90,110,.16)', '--mode-excl-fg': '#ff9fb0', '--mode-ok-bg': 'rgba(60,210,130,.16)', '--mode-ok-fg': '#8ff0b8', '--mode-ok-bd': 'rgba(100,230,160,.4)',
        '--board-bg': 'rgba(255,255,255,.05)',
        '--cell-bg': 'rgba(255,255,255,.07)', '--cell-def-bg': 'rgba(255,255,255,.07)', '--cell-bd': 'rgba(255,255,255,.12)',
        '--tile-bg': 'rgba(255,255,255,.09)', '--tile-bd': 'rgba(255,255,255,.2)', '--tile-shadow': '0 3px 16px rgba(0,0,0,.3)',
        '--row-0': '#7f9bff', '--row-1': '#35e0c6', '--row-2': '#ffb35c', '--row-3': '#b999ff', '--row-4': '#ff78ad', '--row-5': '#b5c2e0',
        '--hint-bg': 'rgba(255,255,255,.07)', '--hint-bd': 'rgba(255,255,255,.16)', '--hint-sep': 'rgba(255,255,255,.14)', '--hint-sym': '#8a99c8',
        '--zoom-veil': 'rgba(5,9,26,.72)', '--zoom-bg': 'rgba(20,28,66,.72)', '--zoom-frame': '#8fa6ff', '--zoom-shadow': '0 16px 48px rgba(0,0,0,.5)',
        '--dialog-bg': 'rgba(24,32,72,.86)', '--dialog-bd': 'rgba(255,255,255,.2)', '--dialog-veil': 'rgba(0,0,10,.58)',
        '--toast-bg': '#eaf0ff', '--toast-fg': '#0a1026', '--rule': 'rgba(255,255,255,.14)'
      }
     }
    }
   },

   /* Brutal: neo-brutalism — thick black borders, hard offset shadows, flat bright colours, monospaced font. */
   brutal: {
    label: 'Brutal',
    variants: {
     clair: {
      label: 'Clair', base: 'epure/clair',
      vars: {
        '--bg': '#fff4cf', '--theme-color': '#fff4cf', '--fg': '#111111', '--muted': '#4a4a4a', '--acc': '#d62839',
        '--ui-font': "ui-monospace,'SF Mono',SFMono-Regular,Menlo,Consolas,'Liberation Mono',monospace",
        '--bw': '3px', '--foot-size': '.6rem',
        '--btn-bg': '#ffd23f', '--btn-fg': '#111111', '--btn-bd': '#111111', '--btn-active': '#ffbe0b', '--btn-radius': '6px',
        '--btn-shadow': '4px 4px 0 #111111',
        '--danger-bg': '#ff6b6b', '--danger-fg': '#111111', '--danger-bd': '#111111', '--mode-excl-bg': '#ff6b6b', '--mode-excl-fg': '#111111', '--mode-ok-bg': '#6bdc8f', '--mode-ok-fg': '#111111', '--mode-ok-bd': '#111111',
        '--board-bg': '#111111', '--board-radius': '8px', '--board-gap': '3px',
        '--cell-bg': '#ffffff', '--cell-def-bg': '#ffffff', '--cell-radius': '3px', '--cell-bd': 'transparent',
        '--tile-bg': '#ffffff', '--tile-bd': '#111111', '--tile-radius': '5px', '--tile-shadow': '3px 3px 0 #111111', '--tile-def-ring': '4px',
        '--glyph-font': "ui-monospace,'SF Mono',Menlo,Consolas,'Liberation Mono',monospace", '--glyph-weight': '800', '--glyph-stroke': '4', '--glyph-stroke-bold': '5.6', '--icon-stroke': '3', '--icon-stroke-big': '3.6',
        '--row-0': '#1d4ed8', '--row-1': '#00875a', '--row-2': '#d97706', '--row-3': '#7e22ce', '--row-4': '#d62839', '--row-5': '#111111',
        '--slot-opacity': '1',
        '--hint-bg': '#ffffff', '--hint-bd': '#111111', '--hint-sep': '#111111', '--hint-sym': '#111111', '--hint-radius': '4px', '--done-opacity': '.38',
        '--zoom-veil': 'rgba(255,244,207,.88)', '--zoom-bg': '#ffffff', '--zoom-frame': '#111111', '--zoom-radius': '10px', '--zoom-shadow': '6px 6px 0 #111111',
        '--dialog-bg': '#ffffff', '--dialog-bd': '#111111', '--dialog-veil': 'rgba(17,17,17,.5)',
        '--toast-bg': '#111111', '--toast-fg': '#ffd23f', '--rule': '#111111'
      }
     },
     fonce: {
      label: 'Foncé', base: 'clair',
      vars: {
        '--bg': '#101014', '--theme-color': '#101014', '--fg': '#f4f4f4', '--muted': '#b8b8b8', '--acc': '#ffd23f',
        '--btn-bg': '#1d1d24', '--btn-fg': '#f4f4f4', '--btn-bd': '#f4f4f4', '--btn-active': '#34343f', '--btn-shadow': '4px 4px 0 #ffd23f',
        '--danger-bg': '#ff5f6d', '--danger-fg': '#101014', '--danger-bd': '#f4f4f4', '--mode-excl-bg': '#ff5f6d', '--mode-excl-fg': '#101014', '--mode-ok-bg': '#4fd67c', '--mode-ok-fg': '#101014', '--mode-ok-bd': '#f4f4f4',
        '--board-bg': '#f4f4f4',
        '--cell-bg': '#1b1b22', '--cell-def-bg': '#1b1b22',
        '--tile-bg': '#1b1b22', '--tile-bd': '#f4f4f4', '--tile-shadow': '3px 3px 0 #000000',
        '--row-0': '#4dd0ff', '--row-1': '#3dffa0', '--row-2': '#ffb02e', '--row-3': '#c58bff', '--row-4': '#ff5fa2', '--row-5': '#e8e8e8',
        '--hint-bg': '#1b1b22', '--hint-bd': '#f4f4f4', '--hint-sep': '#f4f4f4', '--hint-sym': '#e8e8e8',
        '--zoom-veil': 'rgba(16,16,20,.88)', '--zoom-bg': '#1b1b22', '--zoom-frame': '#ffd23f', '--zoom-shadow': '6px 6px 0 #ffd23f',
        '--dialog-bg': '#1b1b22', '--dialog-bd': '#f4f4f4', '--dialog-veil': 'rgba(0,0,0,.65)',
        '--toast-bg': '#ffd23f', '--toast-fg': '#101014', '--rule': '#f4f4f4'
      }
     }
    }
   },

   /* Terra: warm natural tones — cream, terracotta, sage, coffee brown; soft shapes and serifs. */
   terra: {
    label: 'Terra',
    variants: {
     clair: {
      label: 'Clair', base: 'epure/clair',
      vars: {
        '--bg': '#f3eadc', '--theme-color': '#f3eadc', '--fg': '#3a2e28', '--muted': '#8a7765', '--acc': '#b4532a',
        '--ui-font': "'Iowan Old Style','Palatino Linotype',Palatino,'Book Antiqua',Georgia,serif",
        '--btn-bg': '#fbf5ea', '--btn-fg': '#3a2e28', '--btn-bd': '#dccbb2', '--btn-active': '#efe2cc', '--btn-radius': '14px',
        '--danger-bg': '#f7e0d6', '--danger-fg': '#9c3b1b', '--danger-bd': '#e2b9a6', '--mode-excl-bg': '#f7e0d6', '--mode-excl-fg': '#9c3b1b', '--mode-ok-bg': '#e4ecd6', '--mode-ok-fg': '#46692b', '--mode-ok-bd': '#bccfa3',
        '--board-bg': '#e4d5bd', '--board-radius': '18px', '--board-gap': '4px',
        '--cell-bg': '#fbf5ea', '--cell-def-bg': '#fbf5ea', '--cell-radius': '12px',
        '--tile-bg': '#fbf5ea', '--tile-bd': '#e0d0b6', '--tile-radius': '13px', '--tile-shadow': '0 2px 6px rgba(90,60,30,.14)',
        '--glyph-font': "'Iowan Old Style','Palatino Linotype',Palatino,Georgia,serif", '--glyph-weight': '700', '--glyph-stroke': '3', '--icon-stroke': '2.2', '--icon-stroke-big': '2.8',
        '--row-0': '#b4532a', '--row-1': '#587a57', '--row-2': '#bd8420', '--row-3': '#7b5a8c', '--row-4': '#a63d4f', '--row-5': '#5b4a40',
        '--hint-bg': '#fbf5ea', '--hint-bd': '#e0d0b6', '--hint-sep': '#d8c7ab', '--hint-sym': '#9a8470', '--hint-radius': '9px',
        '--zoom-veil': 'rgba(243,234,220,.9)', '--zoom-bg': '#fbf5ea', '--zoom-frame': '#b4532a', '--zoom-radius': '20px', '--zoom-shadow': '0 12px 36px rgba(90,60,30,.2)',
        '--dialog-bg': '#fbf5ea', '--dialog-bd': '#dccbb2', '--dialog-veil': 'rgba(58,46,40,.4)',
        '--toast-bg': '#3a2e28', '--toast-fg': '#fbf5ea', '--rule': '#e0d0b6'
      }
     },
     fonce: {
      label: 'Foncé', base: 'clair',
      vars: {
        '--bg': '#1f1814', '--theme-color': '#1f1814', '--fg': '#f0e6d8', '--muted': '#aa9887', '--acc': '#e58a5c',
        '--btn-bg': '#2c221c', '--btn-fg': '#f0e6d8', '--btn-bd': '#4a3a30', '--btn-active': '#3b2d24',
        '--danger-bg': '#3d2118', '--danger-fg': '#f0a082', '--danger-bd': '#6b3a28', '--mode-excl-bg': '#3d2118', '--mode-excl-fg': '#f0a082', '--mode-ok-bg': '#1f2d1b', '--mode-ok-fg': '#a8d08a', '--mode-ok-bd': '#3b5a2e',
        '--board-bg': '#150f0c', '--cell-bg': '#2c221c', '--cell-def-bg': '#2c221c',
        '--tile-bg': '#2c221c', '--tile-bd': '#4a3a30', '--tile-shadow': 'none',
        '--row-0': '#e58a5c', '--row-1': '#92bd8b', '--row-2': '#e6b95c', '--row-3': '#bf9fd6', '--row-4': '#e87d8f', '--row-5': '#d3c5b8',
        '--hint-bg': '#2c221c', '--hint-bd': '#4a3a30', '--hint-sep': '#4a3a30', '--hint-sym': '#a8978a',
        '--zoom-veil': 'rgba(20,14,11,.88)', '--zoom-bg': '#2c221c', '--zoom-frame': '#e58a5c', '--zoom-shadow': 'none',
        '--dialog-bg': '#2c221c', '--dialog-bd': '#4a3a30', '--dialog-veil': 'rgba(0,0,0,.6)',
        '--toast-bg': '#f0e6d8', '--toast-fg': '#1f1814', '--rule': '#4a3a30'
      }
     }
    }
   }
  };

  /* Effective variables of a version: those of its base, overridden by its own.
   * base: 'clair' = a version of the same family; 'epure/clair' = a version of another family. */
  function resolve(theme, variant, seen) {
    var fam = THEMES[theme], v = fam && fam.variants[variant], id = theme + '/' + variant; seen = seen || {};
    if (!v || seen[id]) return {};
    seen[id] = 1;
    var out = {}, k;
    if (v.base) {
      var bt = theme, bv = v.base;
      if (bv.indexOf('/') >= 0) { bt = bv.split('/')[0]; bv = bv.split('/')[1]; }
      var b = resolve(bt, bv, seen); for (k in b) out[k] = b[k];
    }
    for (k in v.vars) out[k] = v.vars[k];
    return out;
  }
  function firstVariant(theme) { return Object.keys(THEMES[theme].variants)[0]; }

  window.SteinThemes = {
    /* [{ id, label, variants: [{ id, label }] }] */
    list: function () {
      return Object.keys(THEMES).map(function (id) {
        var f = THEMES[id];
        return { id: id, label: f.label || id, variants: Object.keys(f.variants).map(function (vid) { return { id: vid, label: f.variants[vid].label || vid }; }) };
      });
    },
    /* Valid choices closest to the request (unknown theme → first; unknown version → first of the theme). */
    normalize: function (theme, variant) {
      if (!THEMES[theme]) theme = Object.keys(THEMES)[0];
      if (!THEMES[theme].variants[variant]) variant = THEMES[theme].variants.clair ? 'clair' : firstVariant(theme);
      return { theme: theme, variant: variant };
    },
    apply: function (theme, variant) {
      var n = this.normalize(theme, variant), v = resolve(n.theme, n.variant), root = document.documentElement, k;
      for (k in v) root.style.setProperty(k, v[k]);
      root.dataset.theme = n.theme; root.dataset.variant = n.variant;
      var m = document.querySelector('meta[name="theme-color"]');
      if (m && v['--theme-color']) m.setAttribute('content', v['--theme-color']);
      return n;
    }
  };
})();
