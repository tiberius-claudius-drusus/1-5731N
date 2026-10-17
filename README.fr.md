[English](README.md) · **Français**

# 1-5+31IV (1-5731N)

*Soulève la pierre…* — un portage en application web installable (PWA) du jeu de logique libre **Einstein Puzzle** 2.0
(Flowix Games, © 2003-2005 Alexander Babichev, GPL v2+). Le nom se lit « 1-STEIN » : le 1 est le *ein* allemand, et une pierre attend d'être soulevée. Le titre est écrit avec les symboles du jeu lui-même (chiffres, signes, chiffres romains), d'où « 1-5+31IV ».

Six lignes de six symboles, six colonnes : les indices permettent de trouver quel symbole va dans chaque case. Chaque puzzle est généré et peut se résoudre par pure déduction.

- Chaque puzzle a un code (`01-AAAA-AAAA`, affiché sous le chronomètre) : le même code donne toujours le même puzzle, ce qui permet de le rejouer ou de le partager. Un **puzzle du jour** est le même pour tout le monde à la même date.
- Jouable au clavier et avec un lecteur d'écran (flèches, Entrée, 1-6, M, U, T, Échap : voir l'écran d'aide).
- 20 langues (anglais par défaut), 4 thèmes × clair/sombre, sons de l'original, fonctionne hors ligne, sans compte, sans pistage.
- Les statistiques restent sur l'appareil ; elles peuvent être exportées vers un fichier `.json` et importées depuis un fichier `.json`.

> Les traductions (sauf le français et l'anglais) ont été écrites avec une IA et **n'ont pas** été relues par des locuteurs natifs. **Locuteurs natifs recherchés** : voir [TRANSLATIONS.md](TRANSLATIONS.md) pour la liste et la manière d'aider (aucune programmation nécessaire : dans le jeu, **Aide → « Une erreur de traduction ? »** ouvre un formulaire prêt à remplir).

## Installer / jouer

Ouvrir **https://tiberius-claudius-drusus.github.io/1-5731N/** sur un téléphone ou un ordinateur et utiliser « Installer l'application » (Android/Chrome, ordinateur) ou « Sur l'écran d'accueil » (iOS Safari). Il fonctionne hors ligne une fois chargé.

## Le lancer en local

Pour des essais locaux seulement (`python3 -m http.server` n'a pas HTTPS et n'envoie aucun en-tête de sécurité ; pour un vrai usage, utiliser un hébergeur statique en HTTPS). Un service worker demande une origine sécurisée ; `localhost` en est une :

```bash
python3 -m http.server 8080      # puis ouvrir http://localhost:8080
```

Sur un téléphone : ouvrir la page dans le navigateur, puis « Sur l'écran d'accueil » (iOS : Safari → Partager → *Sur l'écran d'accueil*).

## Fichiers

- `engine.js` — générateur, solveur et règles, portés de `puzgen.cpp` / `rules.cpp` (test : `node test_engine.js`).
- `test_code.js` — codes de puzzle (même code = même puzzle, puzzles figés, puzzle du jour ; `STEIN_HEAVY=1` pour les grands échantillons). `test_version.js` — contrôle de publication (version de l'application = nom du cache = journal des changements). Les tests s'exécutent à chaque envoi (`.github/workflows/test.yml`).
- `app.js`, `index.html` — interface ; partie sauvegardée dans `localStorage` (clés `stein.*`). Le CSS est intégré à `index.html`.
- `glyphs.js` — les 36 symboles du jeu et les caractères du titre, dessinés en SVG.
- `themes.js`, `THEMES.md` — thèmes (comment en ajouter un).
- `library.js`, `lib_base.js`, `worker.js`, `addons/` — niveaux et paquets de puzzles. `engine.js` note un puzzle (`gradeSolve` : la déduction d'un joueur méthodique, l'indice le plus facile d'abord) et transforme le score en une note de 0 à 20 et en l'un des cinq niveaux (facile, normal, difficile, expert, extrême = les 0,5 % du haut). `lib_base.js` est le paquet de base (2 500 codes de puzzle, 500 par niveau) ; le puzzle du jour est un puzzle d'un niveau tiré d'après la date. Un paquet est une liste JSON de codes (`{format, id, name, gen, scale, puzzles: [[code, score], ...]}`) : le jeu reconstruit chaque puzzle à partir de son code et recalcule le niveau, de sorte que le niveau affiché dans le jeu est toujours le vrai ; le score écrit dans un paquet ne décide que de l'endroit où un puzzle est rangé, et un puzzle qui ne correspond pas au niveau demandé est écarté au moment du tirage ; un paquet fait pour un autre générateur ou une autre échelle est refusé. Les modules complémentaires se placent dans `addons/` (listés dans `addons/index.json`) ou s'installent depuis un fichier dans les Options. Tant qu'une partie est à l'écran, `worker.js` fabrique un puzzle toutes les 10 s et le garde pour son niveau. Outils : `tools/grade_distribution.js` (répartition des scores), `tools/make_pack.js` (bibliothèque de base et paquets complémentaires). Test : `node test_library.js`.
- `TRANSLATIONS.md`, `.github/ISSUE_TEMPLATE/translation.yml` — état de relecture des langues et formulaire de correction.
- `i18n.js`, `lang/<code>.js` — les textes ; `node test_lang.js` vérifie que chaque langue a les mêmes clés, les mêmes `{paramètres}` et les mêmes balises que le français. `tools/gen_lang.py` est l'aide à la rédaction initiale ; les fichiers `lang/*.js` sont la source.
- `logo.js`, `icon-*.png` — logo (nuage de points) et icônes, générés par `tools/logo/` (`pebble.py` → `build_data.py` / `icon.py` ; demande `numpy scipy pillow`).
- `snd/` — sons du jeu d'origine.
- `sw.js`, `manifest.webmanifest` — cache hors ligne et installabilité.

## Aider à traduire / relire

Dix-huit des vingt langues n'ont jamais été lues par un locuteur natif, et un jeu ne vaut que par ses mots. Si vous parlez l'une d'elles (l'hindi, l'arabe, le coréen, le turc, le japonais, le portugais et le latin sont les moins sûrs), quelques minutes suffisent : ouvrir le jeu, aller dans **Aide**, toucher **« Une erreur de traduction ? »** et dire quel texte devrait dire quoi. Il n'est pas nécessaire de connaître GitHub ni la programmation. Détails, tableau des langues et voie par demande de fusion : [TRANSLATIONS.md](TRANSLATIONS.md). *Aide en français dans le même fichier.*

## Questions et signalements

Merci d'ouvrir un **ticket** (*issue*) sur le dépôt GitHub de ce projet (questions, signalements de bogues, corrections de traduction, idées).
Le projet est maintenu par Claudius, un agent d'IA, sous supervision humaine : les réponses peuvent prendre quelques jours.
Merci de ne pas publier d'informations personnelles dans un ticket (ils sont publics).

## Licence

GNU GPL v2 ou ultérieure (voir `LICENSE`), comme le jeu d'origine *Einstein Puzzle*. Les sons viennent du jeu d'origine.
Développé par Claudius.
