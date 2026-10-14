#!/usr/bin/env python3
"""
---------------------------------------------------------------------------
File      : 1-5731n/tools/gen_lang.py
Version   : 1.0.0
Role      : Authoring aid: writes lang/<code>.js from the translation table below and checks keys, placeholders and tags against French.
Depends on: Python 3 (standard library only)
Called by : by hand: python3 tools/gen_lang.py [--force]
Produces  : lang/<code>.js (never overwrites an existing file unless --force)
Changelog : see CHANGELOG.md
---------------------------------------------------------------------------
Authoring tool; the lang/*.js files are the source read by the app and may be corrected by hand.
Checks that every language has exactly the keys of French and the same {placeholders}.
Since 1.0.0 it refuses to overwrite an existing language file (--force to regenerate).
"""
import json, re, sys, os

KEYS = """home.sub home.new home.continue home.help home.stats home.options foot.build foot.inspired common.back common.cancel
dlg.no dlg.abandon dlg.yesNew menu.title menu.resume menu.sound state.yes state.no menu.version menu.new menu.home
toast.error toast.version cap.choose cap.excl win.title win.time win.errors win.clean win.menu win.new
tt.menu tt.undo tt.mode tt.close tt.hand logo.alt
stats.title stats.none stats.won stats.started stats.best stats.avg stats.clean stats.last stats.err stats.reset stats.resetConfirm
stats.export stats.import stats.exported stats.importOk stats.importBad stats.merge stats.replace stats.importAsk
opt.title opt.sound opt.on opt.off opt.theme opt.version opt.lang theme.epure variant.clair variant.fonce
help.title help.p1 help.p2 help.p3 help.ex1 help.ex2 help.ex3 help.ex4 help.p4""".split()

L = {}
def lang(code, name, dir_, vals):
    vals = [v for v in vals]
    assert len(vals) == len(KEYS), (code, len(vals), len(KEYS))
    L[code] = (name, dir_, dict(zip(KEYS, vals)))

lang('fr', 'Français', 'ltr', [
 "Soulevez la pierre…", "Nouvelle partie", "Continuer", "Aide", "Statistiques", "Options",
 "v{v} - développé par Claudius - {date} - GPL2+", "Inspiré d'<i>Einstein Puzzle</i> de Flowix Games", "Retour", "Annuler",
 "Non", "Abandonner la partie en cours ?", "Oui, nouvelle partie", "Menu", "Reprendre", "Son : {state}", "oui", "non", "Version : {name}", "Nouvelle partie", "Accueil",
 "Erreur : ce coup contredit la solution", "Version : {name}", "Appui <b>court</b> : choisir · Appui <b>long</b> : exclure", "Appui <b>court</b> : exclure · Appui <b>long</b> : choisir",
 "Bravo, c'est gagné !", "Temps : {time}", "Erreurs : {n}", "Sans erreur", "Menu", "Nouvelle partie",
 "Menu", "Annuler le dernier coup", "Choisir / exclure", "Revenir au plateau", "Boutons à gauche / à droite", "Un galet soulevé qui laisse voir un 1 lumineux",
 "Statistiques", "Aucune partie gagnée pour l'instant.", "Parties gagnées", "Parties commencées", "Meilleur temps", "Temps moyen", "Sans erreur", "Dernières parties", "{n} err.", "Effacer", "Effacer toutes les statistiques ?",
 "Exporter", "Importer", "Statistiques exportées", "Import terminé : {n} partie(s) ajoutée(s)", "Fichier invalide", "Fusionner", "Remplacer", "Importer {n} partie(s) :\nles fusionner avec les statistiques actuelles ou les remplacer ?",
 "Options", "Son", "Activé", "Coupé", "Thème", "Version", "Langue", "Épuré", "Clair", "Foncé",
 "Aide",
 "Le plateau comporte <b>6 colonnes</b> et <b>6 rangées</b>. Chaque rangée contient les mêmes six éléments (digits, lettres, chiffres romains, dés, formes, signes), répartis sans répétition dans les six colonnes. Il faut retrouver leur place grâce aux indices.",
 "<b>Sur le plateau</b> : dans une case non résolue, les éléments encore possibles sont affichés en petit. <b>Un appui sur une case l'agrandit en bas de l'écran, à la place des indices</b> : ses éléments possibles s'y affichent en grand, et le plateau reste actif (un appui sur une autre case déplace le zoom ; un second appui sur la même case le ferme). Dans le zoom, <b>un appui court</b> choisit un élément (la case est résolue et l'élément disparaît des autres cases de la rangée) ; <b>un appui long</b> l'exclut. Trois boutons accompagnent la tuile : {up} revient au plateau ; {ok}/{no} inverse les deux gestes (choisir / exclure) ; la flèche latérale place les boutons à gauche ou à droite (gaucher / droitier).",
 "<b>Les indices</b> (deux listes : d'abord ceux à trois cases, dessous ceux à deux cases). Un appui coche un indice, un second le décoche ; un indice coché est grisé et remonte en tête de sa liste :",
 "sont dans des colonnes voisines (dans un sens ou dans l'autre)", "le premier est à gauche du second, pas forcément à côté", "celui du milieu est exactement entre les deux autres", "l'un au-dessus de l'autre : même colonne",
 "Toute partie se résout par pure déduction, sans jamais deviner. Un coup contraire à la solution est refusé avec un message et compté comme erreur. {undo} annule le dernier coup.",
])

lang('en', 'English', 'ltr', [
 "Lift the stone…", "New game", "Continue", "Help", "Statistics", "Options",
 "v{v} - developed by Claudius - {date} - GPL2+", "Inspired by <i>Einstein Puzzle</i> by Flowix Games", "Back", "Cancel",
 "No", "Abandon the current game?", "Yes, new game", "Menu", "Resume", "Sound: {state}", "on", "off", "Version: {name}", "New game", "Home",
 "Error: that move contradicts the solution", "Version: {name}", "<b>Short</b> tap: choose · <b>Long</b> press: exclude", "<b>Short</b> tap: exclude · <b>Long</b> press: choose",
 "Well done, you won!", "Time: {time}", "Errors: {n}", "No errors", "Menu", "New game",
 "Menu", "Undo last move", "Choose / exclude", "Back to the board", "Buttons left / right", "A lifted pebble revealing a glowing 1",
 "Statistics", "No games won yet.", "Games won", "Games started", "Best time", "Average time", "Without errors", "Latest games", "{n} err.", "Erase", "Erase all statistics?",
 "Export", "Import", "Statistics exported", "Import done: {n} game(s) added", "Invalid file", "Merge", "Replace", "Import {n} game(s):\nmerge them with the current statistics or replace them?",
 "Options", "Sound", "On", "Off", "Theme", "Version", "Language", "Clean", "Light", "Dark",
 "Help",
 "The board has <b>6 columns</b> and <b>6 rows</b>. Each row contains the same six elements (digits, letters, Roman numerals, dice, shapes, signs), spread without repetition across the six columns. Use the clues to find where each one goes.",
 "<b>On the board</b>: in an unsolved cell, the elements that are still possible are shown small. <b>Tapping a cell enlarges it at the bottom of the screen, in place of the clues</b>: its possible elements appear large and the board stays active (tapping another cell moves the zoom; tapping the same cell again closes it). In the zoom, a <b>short tap</b> chooses an element (the cell is solved and the element disappears from the other cells of the row); a <b>long press</b> excludes it. Three buttons sit next to the tile: {up} goes back to the board; {ok}/{no} swaps the two gestures (choose / exclude); the side arrow moves the buttons to the left or right (left-handed / right-handed).",
 "<b>The clues</b> (two lists: first those with three cells, below those with two). A tap checks a clue, a second tap unchecks it; a checked clue is greyed out and moves to the top of its list:",
 "are in neighbouring columns (in either direction)", "the first is to the left of the second, not necessarily next to it", "the middle one is exactly between the other two", "one above the other: same column",
 "Every game can be solved by pure deduction, with no guessing. A move that contradicts the solution is refused with a message and counted as an error. {undo} undoes the last move.",
])

lang('es', 'Español', 'ltr', [
 "Levanta la piedra…", "Nueva partida", "Continuar", "Ayuda", "Estadísticas", "Opciones",
 "v{v} - desarrollado por Claudius - {date} - GPL2+", "Inspirado en <i>Einstein Puzzle</i> de Flowix Games", "Volver", "Cancelar",
 "No", "¿Abandonar la partida en curso?", "Sí, nueva partida", "Menú", "Reanudar", "Sonido: {state}", "sí", "no", "Versión: {name}", "Nueva partida", "Inicio",
 "Error: esa jugada contradice la solución", "Versión: {name}", "Toque <b>corto</b>: elegir · Pulsación <b>larga</b>: excluir", "Toque <b>corto</b>: excluir · Pulsación <b>larga</b>: elegir",
 "¡Enhorabuena, has ganado!", "Tiempo: {time}", "Errores: {n}", "Sin errores", "Menú", "Nueva partida",
 "Menú", "Deshacer la última jugada", "Elegir / excluir", "Volver al tablero", "Botones a la izquierda / derecha", "Un guijarro levantado que deja ver un 1 luminoso",
 "Estadísticas", "Aún no has ganado ninguna partida.", "Partidas ganadas", "Partidas empezadas", "Mejor tiempo", "Tiempo medio", "Sin errores", "Últimas partidas", "{n} err.", "Borrar", "¿Borrar todas las estadísticas?",
 "Exportar", "Importar", "Estadísticas exportadas", "Importación terminada: {n} partida(s) añadida(s)", "Archivo no válido", "Combinar", "Reemplazar", "Importar {n} partida(s):\n¿combinarlas con las estadísticas actuales o reemplazarlas?",
 "Opciones", "Sonido", "Activado", "Desactivado", "Tema", "Versión", "Idioma", "Limpio", "Claro", "Oscuro",
 "Ayuda",
 "El tablero tiene <b>6 columnas</b> y <b>6 filas</b>. Cada fila contiene los mismos seis elementos (números, letras, números romanos, dados, formas, signos), repartidos sin repetición en las seis columnas. Hay que encontrar su lugar con ayuda de las pistas.",
 "<b>En el tablero</b>: en una casilla sin resolver se muestran en pequeño los elementos aún posibles. <b>Al tocar una casilla se amplía en la parte inferior de la pantalla, en lugar de las pistas</b>: sus elementos posibles aparecen en grande y el tablero sigue activo (tocar otra casilla mueve el zoom; tocar de nuevo la misma lo cierra). En el zoom, un <b>toque corto</b> elige un elemento (la casilla queda resuelta y el elemento desaparece de las demás casillas de la fila); una <b>pulsación larga</b> lo excluye. Tres botones acompañan la ficha: {up} vuelve al tablero; {ok}/{no} intercambia los dos gestos (elegir / excluir); la flecha lateral coloca los botones a la izquierda o a la derecha (zurdos / diestros).",
 "<b>Las pistas</b> (dos listas: primero las de tres casillas y debajo las de dos). Un toque marca una pista y otro la desmarca; una pista marcada se atenúa y sube al principio de su lista:",
 "están en columnas contiguas (en un sentido u otro)", "el primero está a la izquierda del segundo, no necesariamente al lado", "el del medio está exactamente entre los otros dos", "uno encima del otro: misma columna",
 "Cada partida se resuelve por pura deducción, sin adivinar. Una jugada contraria a la solución se rechaza con un mensaje y cuenta como error. {undo} deshace la última jugada.",
])

lang('de', 'Deutsch', 'ltr', [
 "Heb den Stein hoch…", "Neues Spiel", "Fortsetzen", "Hilfe", "Statistik", "Optionen",
 "v{v} - entwickelt von Claudius - {date} - GPL2+", "Inspiriert von <i>Einstein Puzzle</i> von Flowix Games", "Zurück", "Abbrechen",
 "Nein", "Laufendes Spiel abbrechen?", "Ja, neues Spiel", "Menü", "Fortsetzen", "Ton: {state}", "an", "aus", "Version: {name}", "Neues Spiel", "Startseite",
 "Fehler: Dieser Zug widerspricht der Lösung", "Version: {name}", "<b>Kurz</b> tippen: wählen · <b>Lang</b> drücken: ausschließen", "<b>Kurz</b> tippen: ausschließen · <b>Lang</b> drücken: wählen",
 "Bravo, gewonnen!", "Zeit: {time}", "Fehler: {n}", "Fehlerfrei", "Menü", "Neues Spiel",
 "Menü", "Letzten Zug zurücknehmen", "Wählen / ausschließen", "Zurück zum Spielfeld", "Tasten links / rechts", "Ein angehobener Kiesel, unter dem eine leuchtende 1 erscheint",
 "Statistik", "Noch kein Spiel gewonnen.", "Gewonnene Spiele", "Begonnene Spiele", "Beste Zeit", "Durchschnittszeit", "Fehlerfrei", "Letzte Spiele", "{n} Fehler", "Löschen", "Alle Statistiken löschen?",
 "Exportieren", "Importieren", "Statistik exportiert", "Import abgeschlossen: {n} Spiel(e) hinzugefügt", "Ungültige Datei", "Zusammenführen", "Ersetzen", "{n} Spiel(e) importieren:\nmit der aktuellen Statistik zusammenführen oder sie ersetzen?",
 "Optionen", "Ton", "An", "Aus", "Design", "Version", "Sprache", "Schlicht", "Hell", "Dunkel",
 "Hilfe",
 "Das Spielfeld hat <b>6 Spalten</b> und <b>6 Zeilen</b>. Jede Zeile enthält dieselben sechs Elemente (Ziffern, Buchstaben, römische Zahlen, Würfel, Formen, Zeichen), ohne Wiederholung auf die sechs Spalten verteilt. Mithilfe der Hinweise muss man ihre Plätze finden.",
 "<b>Auf dem Spielfeld</b>: In einem ungelösten Feld werden die noch möglichen Elemente klein angezeigt. <b>Ein Tipp auf ein Feld vergrößert es am unteren Bildschirmrand, anstelle der Hinweise</b>: Seine möglichen Elemente erscheinen groß, und das Spielfeld bleibt aktiv (ein Tipp auf ein anderes Feld verschiebt die Vergrößerung, ein zweiter Tipp auf dasselbe Feld schließt sie). In der Vergrößerung wählt <b>kurzes Tippen</b> ein Element (das Feld ist gelöst, und das Element verschwindet aus den anderen Feldern der Zeile); <b>langes Drücken</b> schließt es aus. Drei Tasten gehören zur Kachel: {up} geht zurück zum Spielfeld; {ok}/{no} vertauscht die beiden Gesten (wählen / ausschließen); der seitliche Pfeil setzt die Tasten nach links oder rechts (Linkshänder / Rechtshänder).",
 "<b>Die Hinweise</b> (zwei Listen: zuerst die mit drei Feldern, darunter die mit zwei Feldern). Ein Tipp hakt einen Hinweis ab, ein zweiter nimmt es zurück; ein abgehakter Hinweis wird ausgegraut und rückt an den Anfang seiner Liste:",
 "stehen in benachbarten Spalten (in beliebiger Richtung)", "das erste steht links vom zweiten, nicht unbedingt direkt daneben", "das mittlere steht genau zwischen den beiden anderen", "eins über dem anderen: dieselbe Spalte",
 "Jedes Spiel lässt sich rein durch Schlussfolgern lösen, ganz ohne Raten. Ein Zug, der der Lösung widerspricht, wird mit einer Meldung abgelehnt und als Fehler gezählt. {undo} nimmt den letzten Zug zurück.",
])

lang('it', 'Italiano', 'ltr', [
 "Solleva la pietra…", "Nuova partita", "Continua", "Aiuto", "Statistiche", "Opzioni",
 "v{v} - sviluppato da Claudius - {date} - GPL2+", "Ispirato a <i>Einstein Puzzle</i> di Flowix Games", "Indietro", "Annulla",
 "No", "Abbandonare la partita in corso?", "Sì, nuova partita", "Menu", "Riprendi", "Suono: {state}", "sì", "no", "Versione: {name}", "Nuova partita", "Home",
 "Errore: questa mossa contraddice la soluzione", "Versione: {name}", "Tocco <b>breve</b>: scegliere · Pressione <b>lunga</b>: escludere", "Tocco <b>breve</b>: escludere · Pressione <b>lunga</b>: scegliere",
 "Bravo, hai vinto!", "Tempo: {time}", "Errori: {n}", "Nessun errore", "Menu", "Nuova partita",
 "Menu", "Annulla l'ultima mossa", "Scegliere / escludere", "Torna alla tavola", "Pulsanti a sinistra / destra", "Un sasso sollevato che rivela un 1 luminoso",
 "Statistiche", "Nessuna partita vinta per ora.", "Partite vinte", "Partite iniziate", "Miglior tempo", "Tempo medio", "Senza errori", "Ultime partite", "{n} err.", "Cancella", "Cancellare tutte le statistiche?",
 "Esporta", "Importa", "Statistiche esportate", "Importazione completata: {n} partita/e aggiunta/e", "File non valido", "Unisci", "Sostituisci", "Importare {n} partita/e:\nunirle alle statistiche attuali o sostituirle?",
 "Opzioni", "Suono", "Attivo", "Disattivo", "Tema", "Versione", "Lingua", "Essenziale", "Chiaro", "Scuro",
 "Aiuto",
 "La tavola ha <b>6 colonne</b> e <b>6 righe</b>. Ogni riga contiene gli stessi sei elementi (numeri, lettere, numeri romani, dadi, forme, segni), distribuiti senza ripetizioni nelle sei colonne. Bisogna ritrovare il loro posto grazie agli indizi.",
 "<b>Sulla tavola</b>: in una casella non risolta gli elementi ancora possibili sono mostrati in piccolo. <b>Toccando una casella la si ingrandisce nella parte bassa dello schermo, al posto degli indizi</b>: i suoi elementi possibili compaiono in grande e la tavola resta attiva (toccare un'altra casella sposta l'ingrandimento; toccare di nuovo la stessa lo chiude). Nell'ingrandimento, un <b>tocco breve</b> sceglie un elemento (la casella è risolta e l'elemento scompare dalle altre caselle della riga); una <b>pressione lunga</b> lo esclude. Tre pulsanti accompagnano la tessera: {up} torna alla tavola; {ok}/{no} inverte i due gesti (scegliere / escludere); la freccia laterale sposta i pulsanti a sinistra o a destra (mancini / destrimani).",
 "<b>Gli indizi</b> (due elenchi: prima quelli a tre caselle, sotto quelli a due). Un tocco spunta un indizio, un secondo tocco lo deseleziona; un indizio spuntato diventa grigio e sale in cima al suo elenco:",
 "sono in colonne vicine (in un senso o nell'altro)", "il primo è a sinistra del secondo, non necessariamente accanto", "quello al centro è esattamente tra gli altri due", "uno sopra l'altro: stessa colonna",
 "Ogni partita si risolve per pura deduzione, senza mai tirare a indovinare. Una mossa contraria alla soluzione viene rifiutata con un messaggio e conteggiata come errore. {undo} annulla l'ultima mossa.",
])

lang('ru', 'Русский', 'ltr', [
 "Поднимите камень…", "Новая игра", "Продолжить", "Помощь", "Статистика", "Настройки",
 "v{v} - разработал Claudius - {date} - GPL2+", "По мотивам <i>Einstein Puzzle</i> от Flowix Games", "Назад", "Отмена",
 "Нет", "Прервать текущую игру?", "Да, новая игра", "Меню", "Продолжить", "Звук: {state}", "вкл.", "выкл.", "Версия: {name}", "Новая игра", "Главная",
 "Ошибка: этот ход противоречит решению", "Версия: {name}", "<b>Короткое</b> нажатие: выбрать · <b>Долгое</b>: исключить", "<b>Короткое</b> нажатие: исключить · <b>Долгое</b>: выбрать",
 "Поздравляем, вы выиграли!", "Время: {time}", "Ошибок: {n}", "Без ошибок", "Меню", "Новая игра",
 "Меню", "Отменить последний ход", "Выбрать / исключить", "Вернуться к полю", "Кнопки слева / справа", "Приподнятый камешек, под которым светится цифра 1",
 "Статистика", "Выигранных игр пока нет.", "Выиграно игр", "Начато игр", "Лучшее время", "Среднее время", "Без ошибок", "Последние игры", "ошибок: {n}", "Стереть", "Стереть всю статистику?",
 "Экспорт", "Импорт", "Статистика экспортирована", "Импорт завершён: добавлено игр — {n}", "Недопустимый файл", "Объединить", "Заменить", "Импортировать игр: {n}.\nОбъединить с текущей статистикой или заменить её?",
 "Настройки", "Звук", "Вкл.", "Выкл.", "Тема", "Версия", "Язык", "Минимализм", "Светлая", "Тёмная",
 "Помощь",
 "На поле <b>6 столбцов</b> и <b>6 строк</b>. В каждой строке одни и те же шесть элементов (цифры, буквы, римские цифры, кости, фигуры, знаки), расположенные без повторов в шести столбцах. По подсказкам нужно найти место каждого.",
 "<b>На поле</b>: в нерешённой клетке мелко показаны ещё возможные элементы. <b>Нажатие на клетку увеличивает её в нижней части экрана, на месте подсказок</b>: её возможные элементы показываются крупно, а поле остаётся активным (нажатие на другую клетку переносит увеличение, повторное нажатие на ту же клетку закрывает его). В увеличении <b>короткое нажатие</b> выбирает элемент (клетка решена, а элемент исчезает из других клеток строки); <b>долгое нажатие</b> исключает его. Рядом с плиткой три кнопки: {up} возвращает к полю; {ok}/{no} меняет местами два жеста (выбрать / исключить); боковая стрелка переносит кнопки влево или вправо (для левшей / правшей).",
 "<b>Подсказки</b> (два списка: сначала из трёх клеток, ниже из двух). Нажатие отмечает подсказку, повторное снимает отметку; отмеченная подсказка тускнеет и поднимается в начало своего списка:",
 "находятся в соседних столбцах (в любую сторону)", "первый левее второго, необязательно рядом", "средний находится точно между двумя другими", "один над другим: тот же столбец",
 "Любая партия решается чистой логикой, без угадывания. Ход, противоречащий решению, отклоняется с сообщением и считается ошибкой. {undo} отменяет последний ход.",
])

lang('ar', 'العربية', 'rtl', [
 "ارفع الحجر…", "لعبة جديدة", "متابعة", "مساعدة", "الإحصائيات", "الخيارات",
 "v{v} - تطوير Claudius - {date} - GPL2+", "مستوحاة من <i>Einstein Puzzle</i> من Flowix Games", "رجوع", "إلغاء",
 "لا", "هل تريد التخلي عن اللعبة الحالية؟", "نعم، لعبة جديدة", "القائمة", "استئناف", "الصوت: {state}", "مفعّل", "متوقف", "النسخة: {name}", "لعبة جديدة", "الرئيسية",
 "خطأ: هذه الحركة تناقض الحل", "النسخة: {name}", "نقرة <b>قصيرة</b>: اختيار · ضغطة <b>طويلة</b>: استبعاد", "نقرة <b>قصيرة</b>: استبعاد · ضغطة <b>طويلة</b>: اختيار",
 "أحسنت، لقد فزت!", "الوقت: {time}", "الأخطاء: {n}", "بلا أخطاء", "القائمة", "لعبة جديدة",
 "القائمة", "تراجع عن آخر حركة", "اختيار / استبعاد", "العودة إلى اللوحة", "الأزرار يسارًا / يمينًا", "حصاة مرفوعة تكشف عن الرقم 1 المضيء",
 "الإحصائيات", "لم تفز بأي لعبة بعد.", "الألعاب الفائزة", "الألعاب المبدوءة", "أفضل وقت", "متوسط الوقت", "بلا أخطاء", "آخر الألعاب", "{n} أخطاء", "مسح", "هل تريد مسح كل الإحصائيات؟",
 "تصدير", "استيراد", "تم تصدير الإحصائيات", "اكتمل الاستيراد: أُضيفت {n} لعبة", "ملف غير صالح", "دمج", "استبدال", "استيراد {n} لعبة:\nدمجها مع إحصائياتك الحالية أم استبدالها؟",
 "الخيارات", "الصوت", "مفعّل", "متوقف", "المظهر", "النسخة", "اللغة", "بسيط", "فاتح", "داكن",
 "مساعدة",
 "تتكوّن اللوحة من <b>6 أعمدة</b> و<b>6 صفوف</b>. يحتوي كل صف على العناصر الستة نفسها (أرقام وحروف وأرقام رومانية ونرد وأشكال ورموز) موزعة دون تكرار على الأعمدة الستة. المطلوب إيجاد مكان كل عنصر بمساعدة التلميحات.",
 "<b>على اللوحة</b>: تظهر في الخانة غير المحلولة العناصر الممكنة بحجم صغير. <b>لمس خانة يكبّرها أسفل الشاشة بدل التلميحات</b>: تظهر عناصرها الممكنة بحجم كبير وتبقى اللوحة فعّالة (لمس خانة أخرى ينقل التكبير، ولمس الخانة نفسها مرة ثانية يغلقه). في التكبير، <b>النقرة القصيرة</b> تختار عنصرًا (تُحلّ الخانة ويختفي العنصر من بقية خانات الصف)، و<b>الضغطة الطويلة</b> تستبعده. ثلاثة أزرار بجانب البلاطة: {up} للعودة إلى اللوحة؛ {ok}/{no} يبدّل الإيماءتين (اختيار / استبعاد)؛ والسهم الجانبي ينقل الأزرار إلى اليسار أو اليمين (للأعسر / للأيمن).",
 "<b>التلميحات</b> (قائمتان: الأولى بثلاث خانات وتحتها التي بخانتين). لمسة واحدة تحدّد التلميح ولمسة ثانية تلغي تحديده؛ يصبح التلميح المحدّد باهتًا ويصعد إلى رأس قائمته:",
 "في عمودين متجاورين (في أي اتجاه)", "الأول على يسار الثاني، وليس بالضرورة بجانبه", "الأوسط يقع تمامًا بين العنصرين الآخرين", "أحدهما فوق الآخر: العمود نفسه",
 "كل لعبة تُحَلّ بالاستنتاج الخالص دون تخمين. الحركة المخالفة للحل تُرفض مع رسالة وتُحتسب خطأً. {undo} يتراجع عن آخر حركة.",
])

lang('zh', '中文（简体）', 'ltr', [
 "掀起那块石头…", "新游戏", "继续", "帮助", "统计", "选项",
 "v{v} - 由 Claudius 开发 - {date} - GPL2+", "灵感来自 Flowix Games 的 <i>Einstein Puzzle</i>", "返回", "取消",
 "否", "放弃当前的游戏吗？", "是，开始新游戏", "菜单", "继续", "声音：{state}", "开", "关", "版本：{name}", "新游戏", "主页",
 "错误：这一步与答案矛盾", "版本：{name}", "<b>短</b>按：选择 · <b>长</b>按：排除", "<b>短</b>按：排除 · <b>长</b>按：选择",
 "太棒了，你赢了！", "用时：{time}", "错误：{n}", "无错误", "菜单", "新游戏",
 "菜单", "撤销上一步", "选择 / 排除", "返回棋盘", "按钮在左 / 在右", "被掀起的鹅卵石，下面露出发光的数字 1",
 "统计", "还没有获胜的对局。", "获胜局数", "开始局数", "最佳用时", "平均用时", "无错误", "最近对局", "{n} 个错误", "清除", "清除所有统计数据吗？",
 "导出", "导入", "统计数据已导出", "导入完成：新增 {n} 局", "文件无效", "合并", "替换", "导入 {n} 局：\n与当前统计合并，还是替换？",
 "选项", "声音", "开", "关", "主题", "版本", "语言", "简约", "浅色", "深色",
 "帮助",
 "棋盘有 <b>6 列</b>和 <b>6 行</b>。每一行都包含相同的六个元素（数字、字母、罗马数字、骰子、图形、符号），在六列中各出现一次。需要借助提示找出它们的位置。",
 "<b>在棋盘上</b>：未解开的格子里，仍然可能的元素以小图显示。<b>点一下格子，它会在屏幕下方放大，取代提示区</b>：可能的元素以大图显示，棋盘仍可操作（点另一个格子会移动放大区，再点同一个格子则关闭）。在放大区里，<b>短按</b>选择一个元素（该格解开，该元素从同一行的其他格子中消失）；<b>长按</b>则排除它。方块旁有三个按钮：{up} 返回棋盘；{ok}/{no} 互换两种手势（选择 / 排除）；侧向箭头把按钮移到左边或右边（左手 / 右手）。",
 "<b>提示</b>（两个列表：先是占三格的，下面是占两格的）。点一下勾选提示，再点一下取消；已勾选的提示变灰并移到列表最前面：",
 "位于相邻的列（左右均可）", "前者在后者左边，不一定紧挨着", "中间的恰好位于另外两个之间", "上下相对：同一列",
 "每一局都能纯靠推理解开，无需猜测。与答案矛盾的一步会被拒绝并提示，同时记为一次错误。{undo} 撤销上一步。",
])

lang('ko', '한국어', 'ltr', [
 "돌을 들어 올려 보세요…", "새 게임", "계속하기", "도움말", "통계", "설정",
 "v{v} - Claudius 개발 - {date} - GPL2+", "Flowix Games의 <i>Einstein Puzzle</i>에서 영감을 받았습니다", "뒤로", "취소",
 "아니요", "진행 중인 게임을 포기할까요?", "예, 새 게임", "메뉴", "계속", "소리: {state}", "켜짐", "꺼짐", "버전: {name}", "새 게임", "홈",
 "오류: 이 수는 정답과 모순됩니다", "버전: {name}", "<b>짧게</b> 누르기: 선택 · <b>길게</b> 누르기: 제외", "<b>짧게</b> 누르기: 제외 · <b>길게</b> 누르기: 선택",
 "축하합니다, 승리했습니다!", "시간: {time}", "오류: {n}", "오류 없음", "메뉴", "새 게임",
 "메뉴", "마지막 수 취소", "선택 / 제외", "판으로 돌아가기", "버튼 왼쪽 / 오른쪽", "들어 올린 조약돌 아래로 빛나는 1이 보입니다",
 "통계", "아직 이긴 게임이 없습니다.", "이긴 게임", "시작한 게임", "최고 기록", "평균 시간", "오류 없음", "최근 게임", "오류 {n}", "지우기", "모든 통계를 지울까요?",
 "내보내기", "가져오기", "통계를 내보냈습니다", "가져오기 완료: {n}게임 추가됨", "올바르지 않은 파일", "병합", "바꾸기", "{n}게임을 가져옵니다.\n현재 통계와 병합할까요, 바꿀까요?",
 "설정", "소리", "켜짐", "꺼짐", "테마", "버전", "언어", "미니멀", "밝게", "어둡게",
 "도움말",
 "판은 <b>6개의 열</b>과 <b>6개의 행</b>으로 이루어져 있습니다. 각 행에는 같은 여섯 개의 요소(숫자, 문자, 로마 숫자, 주사위, 도형, 기호)가 여섯 열에 중복 없이 놓입니다. 힌트를 이용해 각 요소의 자리를 찾아야 합니다.",
 "<b>판 위에서</b>: 풀리지 않은 칸에는 아직 가능한 요소가 작게 표시됩니다. <b>칸을 한 번 누르면 힌트 대신 화면 아래쪽에 확대됩니다</b>. 가능한 요소가 크게 보이고 판은 계속 사용할 수 있습니다(다른 칸을 누르면 확대가 옮겨 가고, 같은 칸을 다시 누르면 닫힙니다). 확대 화면에서 <b>짧게 누르면</b> 요소를 선택하고(칸이 확정되고 같은 행의 다른 칸에서 그 요소가 사라집니다), <b>길게 누르면</b> 제외합니다. 타일 옆에는 버튼 세 개가 있습니다. {up}는 판으로 돌아가고, {ok}/{no}는 두 동작(선택 / 제외)을 바꾸며, 옆 화살표는 버튼을 왼쪽이나 오른쪽으로 옮깁니다(왼손잡이 / 오른손잡이).",
 "<b>힌트</b>(두 목록: 세 칸짜리가 먼저, 아래에 두 칸짜리). 한 번 누르면 힌트에 체크하고 다시 누르면 해제합니다. 체크한 힌트는 흐려지고 목록 맨 앞으로 올라갑니다:",
 "서로 이웃한 열에 있다(어느 쪽이든)", "첫 번째가 두 번째의 왼쪽에 있다(바로 옆일 필요는 없음)", "가운데 것이 다른 둘의 정확히 사이에 있다", "위아래로 있다: 같은 열",
 "모든 게임은 추측 없이 순수한 추리만으로 풀 수 있습니다. 정답과 모순되는 수는 메시지와 함께 거부되고 오류로 집계됩니다. {undo}는 마지막 수를 취소합니다.",
])

lang('ja', '日本語', 'ltr', [
 "石を持ち上げてみよう…", "新しいゲーム", "続きから", "ヘルプ", "統計", "オプション",
 "v{v} - 開発: Claudius - {date} - GPL2+", "Flowix Games の <i>Einstein Puzzle</i> に着想を得ています", "戻る", "キャンセル",
 "いいえ", "進行中のゲームをやめますか？", "はい、新しいゲーム", "メニュー", "再開", "サウンド：{state}", "オン", "オフ", "バージョン：{name}", "新しいゲーム", "ホーム",
 "エラー：この手は答えと矛盾します", "バージョン：{name}", "<b>短く</b>タップ：選ぶ · <b>長</b>押し：除外", "<b>短く</b>タップ：除外 · <b>長</b>押し：選ぶ",
 "おめでとう、勝ちました！", "タイム：{time}", "エラー：{n}", "エラーなし", "メニュー", "新しいゲーム",
 "メニュー", "最後の手を取り消す", "選ぶ / 除外", "盤面に戻る", "ボタンを左 / 右に", "持ち上げた小石の下に光る「1」が見える",
 "統計", "まだ勝ったゲームがありません。", "勝ったゲーム", "始めたゲーム", "ベストタイム", "平均タイム", "エラーなし", "最近のゲーム", "エラー{n}", "消去", "すべての統計を消去しますか？",
 "エクスポート", "インポート", "統計をエクスポートしました", "インポート完了：{n}ゲーム追加", "無効なファイルです", "統合", "置き換え", "{n}ゲームをインポートします。\n現在の統計と統合しますか、置き換えますか？",
 "オプション", "サウンド", "オン", "オフ", "テーマ", "バージョン", "言語", "シンプル", "ライト", "ダーク",
 "ヘルプ",
 "盤面は<b>6列</b>×<b>6行</b>です。各行には同じ6つの要素（数字、文字、ローマ数字、サイコロ、図形、記号）が入り、6つの列に重複なく並びます。ヒントを手がかりに、それぞれの位置を見つけます。",
 "<b>盤面では</b>：未確定のマスには、まだ可能な要素が小さく表示されます。<b>マスをタップすると、ヒントの代わりに画面下部に拡大表示されます</b>。可能な要素が大きく表示され、盤面は操作できたままです（別のマスをタップすると拡大が移動し、同じマスをもう一度タップすると閉じます）。拡大表示では、<b>短くタップ</b>すると要素を選びます（そのマスが確定し、同じ行の他のマスからその要素が消えます）。<b>長押し</b>すると除外します。タイルの横には3つのボタンがあります。{up} は盤面に戻り、{ok}/{no} は2つの操作（選ぶ / 除外）を入れ替え、横向きの矢印はボタンを左右に移します（左利き / 右利き）。",
 "<b>ヒント</b>（2つのリスト：3マスのものが先、その下に2マスのもの）。タップでチェック、もう一度タップで解除します。チェックしたヒントは薄くなり、リストの先頭に移ります：",
 "隣り合う列にある（どちら側でも）", "前者は後者の左にある（隣とは限らない）", "真ん中のものは、他の2つのちょうど間にある", "上下に並ぶ：同じ列",
 "どのゲームも、推測なしで推理だけで解けます。答えと矛盾する手は、メッセージとともに拒否され、エラーとして数えられます。{undo} で最後の手を取り消せます。",
])

lang('hi', 'हिन्दी', 'ltr', [
 "पत्थर उठाइए…", "नया खेल", "जारी रखें", "सहायता", "आँकड़े", "विकल्प",
 "v{v} - Claudius द्वारा विकसित - {date} - GPL2+", "Flowix Games की <i>Einstein Puzzle</i> से प्रेरित", "वापस", "रद्द करें",
 "नहीं", "चल रहा खेल छोड़ दें?", "हाँ, नया खेल", "मेनू", "जारी रखें", "ध्वनि: {state}", "चालू", "बंद", "संस्करण: {name}", "नया खेल", "मुख्य पृष्ठ",
 "त्रुटि: यह चाल हल के विपरीत है", "संस्करण: {name}", "<b>छोटा</b> टैप: चुनें · <b>लंबा</b> दबाव: हटाएँ", "<b>छोटा</b> टैप: हटाएँ · <b>लंबा</b> दबाव: चुनें",
 "बधाई, आप जीत गए!", "समय: {time}", "त्रुटियाँ: {n}", "कोई त्रुटि नहीं", "मेनू", "नया खेल",
 "मेनू", "पिछली चाल वापस लें", "चुनें / हटाएँ", "बोर्ड पर लौटें", "बटन बाएँ / दाएँ", "उठाया हुआ कंकड़, जिसके नीचे चमकता हुआ 1 दिखता है",
 "आँकड़े", "अभी तक कोई खेल नहीं जीता।", "जीते हुए खेल", "शुरू किए खेल", "सर्वश्रेष्ठ समय", "औसत समय", "बिना त्रुटि", "हाल के खेल", "{n} त्रुटि", "मिटाएँ", "सभी आँकड़े मिटा दें?",
 "निर्यात", "आयात", "आँकड़े निर्यात हो गए", "आयात पूर्ण: {n} खेल जोड़े गए", "अमान्य फ़ाइल", "मिलाएँ", "बदलें", "{n} खेल आयात करें:\nवर्तमान आँकड़ों में मिलाएँ या उन्हें बदल दें?",
 "विकल्प", "ध्वनि", "चालू", "बंद", "थीम", "संस्करण", "भाषा", "सरल", "हल्का", "गहरा",
 "सहायता",
 "बोर्ड में <b>6 स्तंभ</b> और <b>6 पंक्तियाँ</b> हैं। हर पंक्ति में वही छह तत्व हैं (अंक, अक्षर, रोमन अंक, पासे, आकृतियाँ, चिह्न), जो छह स्तंभों में बिना दोहराव के रखे जाते हैं। संकेतों की मदद से उनकी जगह ढूँढनी है।",
 "<b>बोर्ड पर</b>: अनसुलझे खाने में जो तत्व अब भी संभव हैं, वे छोटे आकार में दिखते हैं। <b>किसी खाने को छूने पर वह संकेतों की जगह स्क्रीन के निचले हिस्से में बड़ा दिखता है</b>: उसके संभव तत्व बड़े दिखते हैं और बोर्ड चालू रहता है (दूसरे खाने को छूने पर ज़ूम वहाँ चला जाता है; उसी खाने को फिर छूने पर बंद हो जाता है)। ज़ूम में <b>छोटा टैप</b> किसी तत्व को चुनता है (खाना हल हो जाता है और वह तत्व पंक्ति के बाकी खानों से हट जाता है); <b>लंबा दबाव</b> उसे हटा देता है। टाइल के साथ तीन बटन हैं: {up} बोर्ड पर लौटाता है; {ok}/{no} दोनों इशारों को आपस में बदलता है (चुनें / हटाएँ); बगल का तीर बटनों को बाएँ या दाएँ रखता है (बाएँ हाथ / दाएँ हाथ वालों के लिए)।",
 "<b>संकेत</b> (दो सूचियाँ: पहले तीन खानों वाले, उनके नीचे दो खानों वाले)। एक टैप संकेत पर निशान लगाता है, दूसरा टैप हटा देता है; निशान लगा संकेत फीका हो जाता है और अपनी सूची में सबसे ऊपर चला जाता है:",
 "पास-पास के स्तंभों में हैं (किसी भी ओर)", "पहला दूसरे के बाएँ है, ज़रूरी नहीं कि बिल्कुल बगल में हो", "बीच वाला बाकी दोनों के ठीक बीच में है", "एक के ऊपर दूसरा: एक ही स्तंभ",
 "हर खेल बिना अंदाज़ा लगाए, केवल तर्क से हल हो जाता है। हल के विपरीत चाल संदेश के साथ अस्वीकार हो जाती है और त्रुटि गिनी जाती है। {undo} पिछली चाल वापस लेता है।",
])

lang('tr', 'Türkçe', 'ltr', [
 "Taşı kaldır…", "Yeni oyun", "Devam et", "Yardım", "İstatistikler", "Seçenekler",
 "v{v} - Claudius tarafından geliştirildi - {date} - GPL2+", "Flowix Games'in <i>Einstein Puzzle</i> oyunundan esinlenilmiştir", "Geri", "İptal",
 "Hayır", "Devam eden oyundan vazgeçilsin mi?", "Evet, yeni oyun", "Menü", "Devam", "Ses: {state}", "açık", "kapalı", "Sürüm: {name}", "Yeni oyun", "Ana sayfa",
 "Hata: bu hamle çözümle çelişiyor", "Sürüm: {name}", "<b>Kısa</b> dokunuş: seç · <b>Uzun</b> basış: ele", "<b>Kısa</b> dokunuş: ele · <b>Uzun</b> basış: seç",
 "Tebrikler, kazandınız!", "Süre: {time}", "Hata: {n}", "Hatasız", "Menü", "Yeni oyun",
 "Menü", "Son hamleyi geri al", "Seç / ele", "Tahtaya dön", "Düğmeler solda / sağda", "Kaldırılmış bir çakıl taşı, altında parlayan bir 1",
 "İstatistikler", "Henüz kazanılan oyun yok.", "Kazanılan oyunlar", "Başlanan oyunlar", "En iyi süre", "Ortalama süre", "Hatasız", "Son oyunlar", "{n} hata", "Sil", "Tüm istatistikler silinsin mi?",
 "Dışa aktar", "İçe aktar", "İstatistikler dışa aktarıldı", "İçe aktarma tamam: {n} oyun eklendi", "Geçersiz dosya", "Birleştir", "Değiştir", "{n} oyun içe aktarılacak:\nmevcut istatistiklerle birleştirilsin mi, yoksa değiştirilsin mi?",
 "Seçenekler", "Ses", "Açık", "Kapalı", "Tema", "Sürüm", "Dil", "Sade", "Açık", "Koyu",
 "Yardım",
 "Tahtada <b>6 sütun</b> ve <b>6 satır</b> vardır. Her satırda aynı altı öğe bulunur (rakamlar, harfler, Romen rakamları, zarlar, şekiller, işaretler) ve bunlar altı sütuna tekrarsız dağıtılır. Öğelerin yerini ipuçları sayesinde bulmak gerekir.",
 "<b>Tahtada</b>: çözülmemiş bir karede hâlâ mümkün olan öğeler küçük gösterilir. <b>Bir kareye dokunmak, onu ipuçlarının yerine ekranın alt kısmında büyütür</b>: mümkün öğeler büyük görünür ve tahta etkin kalır (başka bir kareye dokunmak büyütmeyi oraya taşır, aynı kareye tekrar dokunmak kapatır). Büyütmede <b>kısa dokunuş</b> bir öğeyi seçer (kare çözülür ve öğe satırdaki diğer karelerden kalkar); <b>uzun basış</b> onu eler. Karonun yanında üç düğme vardır: {up} tahtaya döner; {ok}/{no} iki hareketi (seç / ele) değiştirir; yan ok düğmeleri sola ya da sağa koyar (solak / sağlak).",
 "<b>İpuçları</b> (iki liste: önce üç kareli olanlar, altında iki kareli olanlar). Bir dokunuş ipucunu işaretler, ikincisi işareti kaldırır; işaretli ipucu soluklaşır ve listesinin başına çıkar:",
 "yan yana sütunlarda (herhangi bir yönde)", "birincisi ikincinin solunda, yan yana olması şart değil", "ortadaki, diğer ikisinin tam arasında", "biri diğerinin üstünde: aynı sütun",
 "Her oyun tahmin yürütmeden, yalnızca çıkarımla çözülür. Çözümle çelişen bir hamle mesajla reddedilir ve hata sayılır. {undo} son hamleyi geri alır.",
])

lang('pt-pt', 'Português (Portugal)', 'ltr', [
 "Levante a pedra…", "Novo jogo", "Continuar", "Ajuda", "Estatísticas", "Definições",
 "v{v} - desenvolvido por Claudius - {date} - GPL2+", "Inspirado em <i>Einstein Puzzle</i> da Flowix Games", "Voltar", "Cancelar",
 "Não", "Abandonar o jogo em curso?", "Sim, novo jogo", "Menu", "Retomar", "Som: {state}", "ligado", "desligado", "Versão: {name}", "Novo jogo", "Início",
 "Erro: esta jogada contradiz a solução", "Versão: {name}", "Toque <b>curto</b>: escolher · Toque <b>longo</b>: excluir", "Toque <b>curto</b>: excluir · Toque <b>longo</b>: escolher",
 "Parabéns, ganhou!", "Tempo: {time}", "Erros: {n}", "Sem erros", "Menu", "Novo jogo",
 "Menu", "Anular a última jogada", "Escolher / excluir", "Voltar ao tabuleiro", "Botões à esquerda / à direita", "Uma pedra levantada que revela um 1 luminoso",
 "Estatísticas", "Ainda não ganhou nenhum jogo.", "Jogos ganhos", "Jogos iniciados", "Melhor tempo", "Tempo médio", "Sem erros", "Últimos jogos", "{n} erro(s)", "Apagar", "Apagar todas as estatísticas?",
 "Exportar", "Importar", "Estatísticas exportadas", "Importação concluída: {n} jogo(s) adicionado(s)", "Ficheiro inválido", "Juntar", "Substituir", "Importar {n} jogo(s):\njuntá-los às estatísticas atuais ou substituí-las?",
 "Definições", "Som", "Ligado", "Desligado", "Tema", "Versão", "Idioma", "Limpo", "Claro", "Escuro",
 "Ajuda",
 "O tabuleiro tem <b>6 colunas</b> e <b>6 linhas</b>. Cada linha contém os mesmos seis elementos (algarismos, letras, números romanos, dados, formas, sinais), distribuídos sem repetição pelas seis colunas. É preciso descobrir o lugar de cada um com a ajuda das pistas.",
 "<b>No tabuleiro</b>: numa casa por resolver, os elementos ainda possíveis aparecem em ponto pequeno. <b>Tocar numa casa amplia-a na parte inferior do ecrã, no lugar das pistas</b>: os elementos possíveis aparecem em grande e o tabuleiro continua ativo (tocar noutra casa desloca a ampliação; tocar de novo na mesma fecha-a). Na ampliação, um <b>toque curto</b> escolhe um elemento (a casa fica resolvida e o elemento desaparece das outras casas da linha); um <b>toque longo</b> exclui-o. Três botões acompanham a peça: {up} volta ao tabuleiro; {ok}/{no} troca os dois gestos (escolher / excluir); a seta lateral coloca os botões à esquerda ou à direita (canhotos / destros).",
 "<b>As pistas</b> (duas listas: primeiro as de três casas e, por baixo, as de duas). Um toque assinala uma pista e um segundo toque retira a marca; uma pista assinalada fica esbatida e sobe para o início da sua lista:",
 "estão em colunas vizinhas (num sentido ou noutro)", "o primeiro está à esquerda do segundo, não necessariamente ao lado", "o do meio está exatamente entre os outros dois", "um por cima do outro: mesma coluna",
 "Cada jogo resolve-se por pura dedução, sem adivinhar. Uma jogada contrária à solução é recusada com uma mensagem e conta como erro. {undo} anula a última jogada.",
])

lang('pt-br', 'Português (Brasil)', 'ltr', [
 "Levante a pedra…", "Novo jogo", "Continuar", "Ajuda", "Estatísticas", "Configurações",
 "v{v} - desenvolvido por Claudius - {date} - GPL2+", "Inspirado em <i>Einstein Puzzle</i> da Flowix Games", "Voltar", "Cancelar",
 "Não", "Abandonar o jogo em andamento?", "Sim, novo jogo", "Menu", "Retomar", "Som: {state}", "ligado", "desligado", "Versão: {name}", "Novo jogo", "Início",
 "Erro: essa jogada contradiz a solução", "Versão: {name}", "Toque <b>curto</b>: escolher · Toque <b>longo</b>: excluir", "Toque <b>curto</b>: excluir · Toque <b>longo</b>: escolher",
 "Parabéns, você ganhou!", "Tempo: {time}", "Erros: {n}", "Sem erros", "Menu", "Novo jogo",
 "Menu", "Desfazer a última jogada", "Escolher / excluir", "Voltar ao tabuleiro", "Botões à esquerda / à direita", "Uma pedra levantada revelando um 1 luminoso",
 "Estatísticas", "Você ainda não ganhou nenhum jogo.", "Jogos ganhos", "Jogos iniciados", "Melhor tempo", "Tempo médio", "Sem erros", "Últimos jogos", "{n} erro(s)", "Apagar", "Apagar todas as estatísticas?",
 "Exportar", "Importar", "Estatísticas exportadas", "Importação concluída: {n} jogo(s) adicionado(s)", "Arquivo inválido", "Mesclar", "Substituir", "Importar {n} jogo(s):\nmesclá-los com as estatísticas atuais ou substituí-las?",
 "Configurações", "Som", "Ligado", "Desligado", "Tema", "Versão", "Idioma", "Minimalista", "Claro", "Escuro",
 "Ajuda",
 "O tabuleiro tem <b>6 colunas</b> e <b>6 linhas</b>. Cada linha contém os mesmos seis elementos (algarismos, letras, números romanos, dados, formas, sinais), distribuídos sem repetição pelas seis colunas. É preciso descobrir o lugar de cada um com a ajuda das dicas.",
 "<b>No tabuleiro</b>: em uma casa não resolvida, os elementos ainda possíveis aparecem em tamanho pequeno. <b>Tocar em uma casa a amplia na parte de baixo da tela, no lugar das dicas</b>: os elementos possíveis aparecem em tamanho grande e o tabuleiro continua ativo (tocar em outra casa move a ampliação; tocar de novo na mesma a fecha). Na ampliação, um <b>toque curto</b> escolhe um elemento (a casa fica resolvida e o elemento some das outras casas da linha); um <b>toque longo</b> o exclui. Três botões acompanham a peça: {up} volta ao tabuleiro; {ok}/{no} troca os dois gestos (escolher / excluir); a seta lateral coloca os botões à esquerda ou à direita (canhotos / destros).",
 "<b>As dicas</b> (duas listas: primeiro as de três casas e, abaixo, as de duas). Um toque marca uma dica e um segundo toque desmarca; uma dica marcada fica esmaecida e sobe para o início da sua lista:",
 "estão em colunas vizinhas (em um sentido ou no outro)", "o primeiro está à esquerda do segundo, não necessariamente ao lado", "o do meio está exatamente entre os outros dois", "um em cima do outro: mesma coluna",
 "Cada jogo se resolve por pura dedução, sem adivinhar. Uma jogada contrária à solução é recusada com uma mensagem e conta como erro. {undo} desfaz a última jogada.",
])

lang('nl', 'Nederlands', 'ltr', [
 "Til de steen op…", "Nieuw spel", "Doorgaan", "Help", "Statistieken", "Opties",
 "v{v} - ontwikkeld door Claudius - {date} - GPL2+", "Geïnspireerd op <i>Einstein Puzzle</i> van Flowix Games", "Terug", "Annuleren",
 "Nee", "Het lopende spel opgeven?", "Ja, nieuw spel", "Menu", "Hervatten", "Geluid: {state}", "aan", "uit", "Versie: {name}", "Nieuw spel", "Start",
 "Fout: deze zet is in strijd met de oplossing", "Versie: {name}", "<b>Kort</b> tikken: kiezen · <b>Lang</b> drukken: uitsluiten", "<b>Kort</b> tikken: uitsluiten · <b>Lang</b> drukken: kiezen",
 "Gefeliciteerd, je hebt gewonnen!", "Tijd: {time}", "Fouten: {n}", "Zonder fouten", "Menu", "Nieuw spel",
 "Menu", "Laatste zet ongedaan maken", "Kiezen / uitsluiten", "Terug naar het bord", "Knoppen links / rechts", "Een opgetild kiezelsteentje met een oplichtende 1 eronder",
 "Statistieken", "Nog geen spel gewonnen.", "Gewonnen spellen", "Gestarte spellen", "Beste tijd", "Gemiddelde tijd", "Zonder fouten", "Laatste spellen", "{n} fout(en)", "Wissen", "Alle statistieken wissen?",
 "Exporteren", "Importeren", "Statistieken geëxporteerd", "Import voltooid: {n} spel(len) toegevoegd", "Ongeldig bestand", "Samenvoegen", "Vervangen", "{n} spel(len) importeren:\nsamenvoegen met de huidige statistieken of ze vervangen?",
 "Opties", "Geluid", "Aan", "Uit", "Thema", "Versie", "Taal", "Minimalistisch", "Licht", "Donker",
 "Help",
 "Het bord heeft <b>6 kolommen</b> en <b>6 rijen</b>. Elke rij bevat dezelfde zes elementen (cijfers, letters, Romeinse cijfers, dobbelstenen, vormen, tekens), zonder herhaling verdeeld over de zes kolommen. Met behulp van de aanwijzingen moet je de plaats van elk element vinden.",
 "<b>Op het bord</b>: in een nog niet opgelost vakje worden de nog mogelijke elementen klein getoond. <b>Tik op een vakje om het onderaan het scherm te vergroten, in plaats van de aanwijzingen</b>: de mogelijke elementen verschijnen groot en het bord blijft actief (tik op een ander vakje om de vergroting te verplaatsen, tik nogmaals op hetzelfde vakje om te sluiten). In de vergroting kies je met een <b>korte tik</b> een element (het vakje is opgelost en het element verdwijnt uit de andere vakjes van de rij); een <b>lange druk</b> sluit het uit. Naast de tegel staan drie knoppen: {up} gaat terug naar het bord; {ok}/{no} wisselt de twee gebaren om (kiezen / uitsluiten); de zijpijl zet de knoppen links of rechts (linkshandig / rechtshandig).",
 "<b>De aanwijzingen</b> (twee lijsten: eerst die met drie vakjes, daaronder die met twee). Eén tik vinkt een aanwijzing aan, een tweede tik haalt het vinkje weg; een aangevinkte aanwijzing wordt grijs en schuift naar het begin van haar lijst:",
 "staan in naburige kolommen (in beide richtingen)", "de eerste staat links van de tweede, niet per se ernaast", "de middelste staat precies tussen de andere twee", "de een boven de ander: dezelfde kolom",
 "Elk spel is op te lossen met pure deductie, zonder te gokken. Een zet die in strijd is met de oplossing wordt met een melding geweigerd en als fout geteld. {undo} maakt de laatste zet ongedaan.",
])

lang('pl', 'Polski', 'ltr', [
 "Podnieś kamień…", "Nowa gra", "Kontynuuj", "Pomoc", "Statystyki", "Opcje",
 "v{v} - stworzył Claudius - {date} - GPL2+", "Zainspirowane grą <i>Einstein Puzzle</i> od Flowix Games", "Wstecz", "Anuluj",
 "Nie", "Porzucić trwającą grę?", "Tak, nowa gra", "Menu", "Wznów", "Dźwięk: {state}", "włączony", "wyłączony", "Wersja: {name}", "Nowa gra", "Strona główna",
 "Błąd: ten ruch jest sprzeczny z rozwiązaniem", "Wersja: {name}", "<b>Krótkie</b> dotknięcie: wybierz · <b>Długie</b> przytrzymanie: wyklucz", "<b>Krótkie</b> dotknięcie: wyklucz · <b>Długie</b> przytrzymanie: wybierz",
 "Brawo, wygrana!", "Czas: {time}", "Błędy: {n}", "Bez błędów", "Menu", "Nowa gra",
 "Menu", "Cofnij ostatni ruch", "Wybierz / wyklucz", "Wróć do planszy", "Przyciski z lewej / z prawej", "Podniesiony kamyk odsłaniający świecącą jedynkę",
 "Statystyki", "Nie wygrano jeszcze żadnej gry.", "Wygrane gry", "Rozpoczęte gry", "Najlepszy czas", "Średni czas", "Bez błędów", "Ostatnie gry", "błędy: {n}", "Wyczyść", "Wyczyścić wszystkie statystyki?",
 "Eksportuj", "Importuj", "Statystyki wyeksportowane", "Import zakończony: dodano gier — {n}", "Nieprawidłowy plik", "Połącz", "Zastąp", "Importowanie gier: {n}.\nPołączyć z obecnymi statystykami czy je zastąpić?",
 "Opcje", "Dźwięk", "Włączony", "Wyłączony", "Motyw", "Wersja", "Język", "Minimalistyczny", "Jasny", "Ciemny",
 "Pomoc",
 "Plansza ma <b>6 kolumn</b> i <b>6 wierszy</b>. Każdy wiersz zawiera te same sześć elementów (cyfry, litery, cyfry rzymskie, kości, kształty, znaki), rozmieszczone bez powtórzeń w sześciu kolumnach. Za pomocą wskazówek trzeba odnaleźć miejsce każdego z nich.",
 "<b>Na planszy</b>: w nierozwiązanym polu małymi znakami pokazane są elementy, które nadal są możliwe. <b>Dotknięcie pola powiększa je u dołu ekranu, w miejscu wskazówek</b>: możliwe elementy pojawiają się w dużym rozmiarze, a plansza pozostaje aktywna (dotknięcie innego pola przenosi powiększenie, ponowne dotknięcie tego samego pola je zamyka). W powiększeniu <b>krótkie dotknięcie</b> wybiera element (pole zostaje rozwiązane, a element znika z pozostałych pól wiersza); <b>długie przytrzymanie</b> go wyklucza. Obok kafelka są trzy przyciski: {up} wraca do planszy; {ok}/{no} zamienia oba gesty (wybierz / wyklucz); strzałka boczna przesuwa przyciski na lewo lub na prawo (dla leworęcznych / praworęcznych).",
 "<b>Wskazówki</b> (dwie listy: najpierw te z trzema polami, pod nimi te z dwoma). Dotknięcie zaznacza wskazówkę, kolejne odznacza; zaznaczona wskazówka szarzeje i przesuwa się na początek swojej listy:",
 "znajdują się w sąsiednich kolumnach (w którąkolwiek stronę)", "pierwszy jest na lewo od drugiego, niekoniecznie obok", "środkowy leży dokładnie między dwoma pozostałymi", "jeden nad drugim: ta sama kolumna",
 "Każdą grę można rozwiązać czystą dedukcją, bez zgadywania. Ruch sprzeczny z rozwiązaniem zostaje odrzucony z komunikatem i liczy się jako błąd. {undo} cofa ostatni ruch.",
])

lang('uk', 'Українська', 'ltr', [
 "Підніміть камінь…", "Нова гра", "Продовжити", "Довідка", "Статистика", "Налаштування",
 "v{v} - розробив Claudius - {date} - GPL2+", "За мотивами <i>Einstein Puzzle</i> від Flowix Games", "Назад", "Скасувати",
 "Ні", "Перервати поточну гру?", "Так, нова гра", "Меню", "Продовжити", "Звук: {state}", "увімк.", "вимк.", "Версія: {name}", "Нова гра", "Головна",
 "Помилка: цей хід суперечить розв'язку", "Версія: {name}", "<b>Коротке</b> натискання: вибрати · <b>Довге</b>: виключити", "<b>Коротке</b> натискання: виключити · <b>Довге</b>: вибрати",
 "Вітаємо, ви виграли!", "Час: {time}", "Помилок: {n}", "Без помилок", "Меню", "Нова гра",
 "Меню", "Скасувати останній хід", "Вибрати / виключити", "Повернутися до поля", "Кнопки ліворуч / праворуч", "Піднятий камінець, під яким світиться цифра 1",
 "Статистика", "Виграних ігор поки немає.", "Виграно ігор", "Розпочато ігор", "Найкращий час", "Середній час", "Без помилок", "Останні ігри", "помилок: {n}", "Стерти", "Стерти всю статистику?",
 "Експорт", "Імпорт", "Статистику експортовано", "Імпорт завершено: додано ігор — {n}", "Недійсний файл", "Об'єднати", "Замінити", "Імпортувати ігор: {n}.\nОб'єднати з поточною статистикою чи замінити її?",
 "Налаштування", "Звук", "Увімк.", "Вимк.", "Тема", "Версія", "Мова", "Мінімалізм", "Світла", "Темна",
 "Довідка",
 "На полі <b>6 стовпців</b> і <b>6 рядків</b>. У кожному рядку однакові шість елементів (цифри, літери, римські цифри, кості, фігури, знаки), розміщені без повторів у шести стовпцях. За підказками потрібно знайти місце кожного.",
 "<b>На полі</b>: у нерозв'язаній клітинці дрібно показано елементи, які ще можливі. <b>Дотик до клітинки збільшує її в нижній частині екрана, на місці підказок</b>: її можливі елементи показуються великими, а поле залишається активним (дотик до іншої клітинки переносить збільшення, повторний дотик до тієї самої закриває його). У збільшенні <b>короткий дотик</b> вибирає елемент (клітинку розв'язано, а елемент зникає з інших клітинок рядка); <b>довге натискання</b> виключає його. Поруч із плиткою три кнопки: {up} повертає до поля; {ok}/{no} міняє місцями два жести (вибрати / виключити); бічна стрілка переносить кнопки ліворуч або праворуч (для шульг / правшів).",
 "<b>Підказки</b> (два списки: спочатку з трьох клітинок, нижче з двох). Дотик позначає підказку, повторний знімає позначку; позначена підказка тьмяніє й піднімається на початок свого списку:",
 "стоять у сусідніх стовпцях (в будь-який бік)", "перший лівіше від другого, не обов'язково поруч", "середній стоїть точно між двома іншими", "один над одним: той самий стовпець",
 "Будь-яку гру можна розв'язати чистою дедукцією, без вгадування. Хід, що суперечить розв'язку, відхиляється з повідомленням і вважається помилкою. {undo} скасовує останній хід.",
])

lang('id', 'Bahasa Indonesia', 'ltr', [
 "Angkat batunya…", "Permainan baru", "Lanjutkan", "Bantuan", "Statistik", "Opsi",
 "v{v} - dikembangkan oleh Claudius - {date} - GPL2+", "Terinspirasi dari <i>Einstein Puzzle</i> karya Flowix Games", "Kembali", "Batal",
 "Tidak", "Tinggalkan permainan yang sedang berjalan?", "Ya, permainan baru", "Menu", "Lanjutkan", "Suara: {state}", "hidup", "mati", "Versi: {name}", "Permainan baru", "Beranda",
 "Kesalahan: langkah ini bertentangan dengan solusi", "Versi: {name}", "Ketuk <b>singkat</b>: pilih · Tekan <b>lama</b>: kecualikan", "Ketuk <b>singkat</b>: kecualikan · Tekan <b>lama</b>: pilih",
 "Selamat, Anda menang!", "Waktu: {time}", "Kesalahan: {n}", "Tanpa kesalahan", "Menu", "Permainan baru",
 "Menu", "Batalkan langkah terakhir", "Pilih / kecualikan", "Kembali ke papan", "Tombol kiri / kanan", "Kerikil yang diangkat memperlihatkan angka 1 yang bercahaya",
 "Statistik", "Belum ada permainan yang dimenangkan.", "Permainan dimenangkan", "Permainan dimulai", "Waktu terbaik", "Waktu rata-rata", "Tanpa kesalahan", "Permainan terakhir", "{n} salah", "Hapus", "Hapus semua statistik?",
 "Ekspor", "Impor", "Statistik diekspor", "Impor selesai: {n} permainan ditambahkan", "Berkas tidak valid", "Gabungkan", "Ganti", "Impor {n} permainan:\ngabungkan dengan statistik saat ini atau ganti?",
 "Opsi", "Suara", "Hidup", "Mati", "Tema", "Versi", "Bahasa", "Minimalis", "Terang", "Gelap",
 "Bantuan",
 "Papan memiliki <b>6 kolom</b> dan <b>6 baris</b>. Setiap baris berisi enam elemen yang sama (angka, huruf, angka Romawi, dadu, bentuk, tanda), tersebar tanpa pengulangan di keenam kolom. Dengan bantuan petunjuk, temukan tempat masing-masing.",
 "<b>Di papan</b>: pada kotak yang belum terpecahkan, elemen yang masih mungkin ditampilkan kecil. <b>Mengetuk sebuah kotak memperbesarnya di bagian bawah layar, menggantikan petunjuk</b>: elemen yang mungkin tampil besar dan papan tetap aktif (mengetuk kotak lain memindahkan pembesaran; mengetuk kotak yang sama lagi menutupnya). Pada pembesaran, <b>ketukan singkat</b> memilih sebuah elemen (kotak terpecahkan dan elemen itu hilang dari kotak lain di baris tersebut); <b>tekan lama</b> mengecualikannya. Tiga tombol mendampingi ubin: {up} kembali ke papan; {ok}/{no} menukar kedua gestur (pilih / kecualikan); panah samping memindahkan tombol ke kiri atau kanan (kidal / tidak kidal).",
 "<b>Petunjuk</b> (dua daftar: yang tiga kotak lebih dulu, di bawahnya yang dua kotak). Satu ketukan mencentang petunjuk, ketukan kedua membatalkannya; petunjuk yang dicentang memudar dan naik ke awal daftarnya:",
 "berada di kolom bersebelahan (ke arah mana pun)", "yang pertama di sebelah kiri yang kedua, tidak harus bersebelahan", "yang di tengah tepat berada di antara dua lainnya", "satu di atas yang lain: kolom yang sama",
 "Setiap permainan dapat dipecahkan dengan deduksi murni, tanpa menebak. Langkah yang bertentangan dengan solusi ditolak dengan pesan dan dihitung sebagai kesalahan. {undo} membatalkan langkah terakhir.",
])

lang('vi', 'Tiếng Việt', 'ltr', [
 "Hãy nhấc hòn đá lên…", "Ván mới", "Tiếp tục", "Trợ giúp", "Thống kê", "Tùy chọn",
 "v{v} - phát triển bởi Claudius - {date} - GPL2+", "Lấy cảm hứng từ <i>Einstein Puzzle</i> của Flowix Games", "Quay lại", "Hủy",
 "Không", "Bỏ ván đang chơi?", "Có, ván mới", "Menu", "Tiếp tục", "Âm thanh: {state}", "bật", "tắt", "Phiên bản: {name}", "Ván mới", "Trang chủ",
 "Lỗi: nước đi này mâu thuẫn với lời giải", "Phiên bản: {name}", "Chạm <b>nhanh</b>: chọn · Nhấn <b>giữ</b>: loại", "Chạm <b>nhanh</b>: loại · Nhấn <b>giữ</b>: chọn",
 "Chúc mừng, bạn đã thắng!", "Thời gian: {time}", "Lỗi: {n}", "Không lỗi", "Menu", "Ván mới",
 "Menu", "Hoàn tác nước đi cuối", "Chọn / loại", "Quay lại bàn cờ", "Nút bên trái / phải", "Viên sỏi được nhấc lên, để lộ số 1 phát sáng",
 "Thống kê", "Chưa thắng ván nào.", "Ván đã thắng", "Ván đã bắt đầu", "Thời gian tốt nhất", "Thời gian trung bình", "Không lỗi", "Các ván gần đây", "{n} lỗi", "Xóa", "Xóa toàn bộ thống kê?",
 "Xuất", "Nhập", "Đã xuất thống kê", "Nhập xong: đã thêm {n} ván", "Tệp không hợp lệ", "Gộp", "Thay thế", "Nhập {n} ván:\ngộp với thống kê hiện tại hay thay thế?",
 "Tùy chọn", "Âm thanh", "Bật", "Tắt", "Chủ đề", "Phiên bản", "Ngôn ngữ", "Tối giản", "Sáng", "Tối",
 "Trợ giúp",
 "Bàn cờ có <b>6 cột</b> và <b>6 hàng</b>. Mỗi hàng chứa sáu phần tử giống nhau (chữ số, chữ cái, số La Mã, xúc xắc, hình khối, ký hiệu), phân bố không lặp lại trong sáu cột. Hãy dựa vào các gợi ý để tìm vị trí của từng phần tử.",
 "<b>Trên bàn cờ</b>: trong ô chưa giải, các phần tử còn khả dĩ được hiển thị nhỏ. <b>Chạm vào một ô sẽ phóng to nó ở cuối màn hình, thay cho khu vực gợi ý</b>: các phần tử khả dĩ hiện lớn và bàn cờ vẫn dùng được (chạm ô khác sẽ chuyển vùng phóng to; chạm lại cùng ô sẽ đóng). Trong vùng phóng to, <b>chạm nhanh</b> sẽ chọn một phần tử (ô được giải và phần tử đó biến mất khỏi các ô khác trong hàng); <b>nhấn giữ</b> sẽ loại nó. Ba nút nằm cạnh ô: {up} quay lại bàn cờ; {ok}/{no} đổi chỗ hai thao tác (chọn / loại); mũi tên bên chuyển các nút sang trái hoặc phải (người thuận tay trái / phải).",
 "<b>Các gợi ý</b> (hai danh sách: trước hết loại ba ô, bên dưới là loại hai ô). Chạm một lần để đánh dấu gợi ý, chạm lần nữa để bỏ dấu; gợi ý đã đánh dấu sẽ mờ đi và lên đầu danh sách của nó:",
 "nằm ở các cột kề nhau (theo hướng nào cũng được)", "phần tử đầu ở bên trái phần tử thứ hai, không nhất thiết liền kề", "phần tử ở giữa nằm đúng giữa hai phần tử còn lại", "cái này nằm trên cái kia: cùng một cột",
 "Mọi ván đều giải được bằng suy luận thuần túy, không cần đoán. Nước đi mâu thuẫn với lời giải sẽ bị từ chối kèm thông báo và tính là một lỗi. {undo} hoàn tác nước đi cuối cùng.",
])

lang('la', 'Latina', 'ltr', [
 "Lapidem tolle…", "Ludus novus", "Perge", "Auxilium", "Statistica", "Optiones",
 "v{v} - a Claudio conditum - {date} - GPL2+", "Ex <i>Einstein Puzzle</i> Flowix Games inspiratum", "Redi", "Omitte",
 "Non", "Ludum currentem relinquere?", "Ita, ludus novus", "Elenchus", "Continua", "Sonus: {state}", "accensus", "extinctus", "Versio: {name}", "Ludus novus", "Domus",
 "Error: hic motus solutioni repugnat", "Versio: {name}", "Tactus <b>brevis</b>: eligere · Pressio <b>longa</b>: excludere", "Tactus <b>brevis</b>: excludere · Pressio <b>longa</b>: eligere",
 "Euge, vicisti!", "Tempus: {time}", "Errores: {n}", "Sine erroribus", "Elenchus", "Ludus novus",
 "Elenchus", "Ultimum motum revoca", "Eligere / excludere", "Ad tabulam redi", "Claves ad sinistram / ad dextram", "Lapillus sublatus numerum 1 lucentem ostendens",
 "Statistica", "Nondum ullus ludus victus est.", "Ludi victi", "Ludi incepti", "Optimum tempus", "Tempus medium", "Sine erroribus", "Ludi novissimi", "{n} err.", "Dele", "Omnem statisticam delere?",
 "Exporta", "Importa", "Statistica exportata", "Importatio perfecta: {n} ludi additi", "Tabella invalida", "Coniunge", "Substitue", "{n} ludos importare:\nconiungere cum statistica praesenti an substituere?",
 "Optiones", "Sonus", "Accensus", "Extinctus", "Thema", "Versio", "Lingua", "Simplex", "Clarum", "Obscurum",
 "Auxilium",
 "Tabula habet <b>6 columnas</b> et <b>6 ordines</b>. Quisque ordo eadem sex elementa continet (numeros, litteras, numeros Romanos, tesseras, figuras, signa), sine repetitione per sex columnas distributa. Locus cuiusque indiciis invenienda est.",
 "<b>In tabula</b>: in loculo nondum soluto elementa adhuc possibilia parva monstrantur. <b>Loculum tangere eum in ima parte scaenae amplificat, loco indiciorum</b>: elementa possibilia magna apparent et tabula activa manet (alium loculum tangere amplificationem movet; eundem iterum tangere claudit). In amplificatione, <b>tactus brevis</b> elementum eligit (loculus solvitur et elementum ex ceteris loculis ordinis evanescit); <b>pressio longa</b> id excludit. Tres claves tessellam comitantur: {up} ad tabulam redit; {ok}/{no} duos gestus permutat (eligere / excludere); sagitta lateralis claves ad sinistram vel dextram ponit (sinistrimanibus / dextrimanibus).",
 "<b>Indicia</b> (duo indices: primum quae tres loculos habent, infra quae duos). Tactus indicium notat, alter notam tollit; indicium notatum pallescit et ad caput sui indicis ascendit:",
 "in columnis vicinis sunt (in utramque partem)", "prius ad sinistram posterioris est, non necessario iuxta", "medium inter duo alia exacte est", "alterum supra alterum: eadem columna",
 "Omnis ludus pura deductione solvitur, sine coniectura. Motus solutioni contrarius cum nuntio repudiatur et pro errore numeratur. {undo} ultimum motum revocat.",
])

# checks
ph = lambda s: sorted(re.findall(r'\{(\w+)\}', s))
tags = lambda s: sorted(re.findall(r'</?[a-z]+>', s))
ref = L['fr'][2]
bad = 0
for code, (name, d, tr) in L.items():
    for k in KEYS:
        if ph(tr[k]) != ph(ref[k]):
            print('PLACEHOLDERS', code, k, ph(tr[k]), ph(ref[k])); bad += 1
        if tags(tr[k]) != tags(ref[k]):
            print('TAGS', code, k, tags(tr[k]), tags(ref[k])); bad += 1
if bad: sys.exit(1)

out = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'lang')
os.makedirs(out, exist_ok=True)
FORCE = '--force' in sys.argv
for code, (name, d, tr) in L.items():
    target = os.path.join(out, code + '.js')
    if os.path.exists(target) and not FORCE:       # the lang files are hand-corrected sources: never overwrite them silently
        print('kept (exists) :', code)
        continue
    body = ',\n'.join('    %s: %s' % (json.dumps(k), json.dumps(tr[k], ensure_ascii=False)) for k in KEYS)
    head = (
        "/* " + "-" * 75 + "\n"
        " * File      : 1-5731n/lang/%(code)s.js\n"
        " * Version   : 1.0.0\n"
        " * Role      : User-interface texts in %(en)s (%(n)d keys): home, menus, help, options, statistics, messages.\n"
        " * Depends on: i18n.js (SteinI18n.add)\n"
        " * Called by : index.html (script tag) ; i18n.js ; test_lang.js\n"
        " * Produces  : texts registered under the language code \"%(code)s\"\n"
        " * Changelog : see CHANGELOG.md\n"
        " * " + "-" * 75 + "\n"
        " * Texts in %(en)s. Translation by Claudius (to be proofread by a native speaker; corrections welcome).\n"
        " * Keys and {placeholders} are those of fr.js. <b>...</b> = bold.\n"
        " */\n") % dict(code=code, en=name, n=len(KEYS))
    open(target, 'w', encoding='utf-8').write(
        head + "SteinI18n.add(%s, {\n  name: %s, dir: %s,\n  s: {\n%s\n  }\n});\n" % (json.dumps(code), json.dumps(name, ensure_ascii=False), json.dumps(d), body))
print('ok :', ', '.join(L), '|', len(KEYS), 'keys')
