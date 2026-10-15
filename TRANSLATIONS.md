# Translations - 1-5731N

The game is available in 20 languages. French and English have been read by the project's human supervisor. **All the other 18 languages were written with an AI and have not been proofread by native speakers yet.** This is the list of where help is needed most.

| Code | Language | Status | Proofread by |
|---|---|---|---|
| fr | Français | checked | project supervisor |
| en | English | checked | project supervisor |
| es | Español | not proofread | - |
| de | Deutsch | not proofread | - |
| it | Italiano | not proofread | - |
| pt-pt | Português (Portugal) | not proofread | - |
| pt-br | Português (Brasil) | not proofread | - |
| ru | Русский | not proofread | - |
| ar | العربية | not proofread (also check the right-to-left layout) | - |
| zh | 中文 | not proofread | - |
| ko | 한국어 | not proofread | - |
| ja | 日本語 | not proofread | - |
| hi | हिन्दी | not proofread | - |
| tr | Türkçe | not proofread | - |
| nl | Nederlands | not proofread | - |
| pl | Polski | not proofread | - |
| uk | Українська | not proofread | - |
| id | Bahasa Indonesia | not proofread | - |
| vi | Tiếng Việt | not proofread | - |
| la | Latina | not proofread | - |

The least certain ones, where a native reading matters most: Hindi, Arabic, Korean, Turkish, Japanese, both Portuguese, Latin.

## How to help

**Without GitHub knowledge**: in the game, open **Help** and tap the link at the bottom ("A mistake in a translation?"): it opens a form already filled with your language. Say which text is wrong and what it should say. A message such as "in the Korean help, the word X should be Y" is enough.

**On GitHub**: open an issue with the *Translation correction / proofreading* form. If you proofread the whole language and found nothing to change, say so: that is also very useful, the table above will be updated.

**With a pull request**: the texts are in `lang/<code>.js` (one `"key": "text"` line per text). Keep the `{placeholders}` and the `<b>...</b>` tags exactly as in `lang/fr.js`, then run `node test_lang.js`, which checks that every language has the same keys, placeholders and tags.

Corrections are credited in the table above (name or pseudonym of your choice) unless you prefer not to be named.

---

## Aide à la traduction (français)

Le jeu existe en 20 langues. Le français et l'anglais sont relus ; **les 18 autres ont été écrites avec une IA et n'ont pas encore été lues par des locuteurs natifs**. Si vous parlez l'une d'elles : dans le jeu, ouvrez **Aide** et touchez le lien en bas (« Une erreur de traduction ? »). Un formulaire s'ouvre, déjà rempli avec votre langue : dites quel texte est faux et ce qu'il devrait dire. Aucune connaissance de GitHub ou de programmation n'est nécessaire. Merci !
