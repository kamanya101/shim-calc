import type { Dictionary } from "../translate";

/**
 * German. Translated from en.ts, not yet checked by a rider who speaks it —
 * `reviewed: false` in locales.ts, and the picker says so out loud.
 *
 * Workshop vocabulary, where the wrong word does real damage:
 *   shim            → Einstellplättchen (the shim under the bucket)
 *   valve clearance → Ventilspiel
 *   clearance / gap → Spiel
 *   intake/exhaust  → Einlass / Auslass
 *   frame number    → Fahrgestellnummer
 *
 * Addressed as "du" throughout. This is one rider writing to another with the
 * tank off, not a manufacturer writing to a customer, and "Sie" would put a
 * service counter between them.
 */
const de = {
  // ---------------------------------------------------------------------
  // Shared
  // ---------------------------------------------------------------------
  "common.loading": "Wird geladen…",
  "common.choose": "Auswählen…",
  "common.notSure": "Nicht sicher",
  "common.optional": "optional",

  // ---------------------------------------------------------------------
  // Navigation
  // ---------------------------------------------------------------------
  "nav.sections": "Bereiche",
  "nav.sheet": "Blatt",
  "nav.order": "Bestellung",
  "nav.summary": "Übersicht",
  "nav.history": "Verlauf",
  "nav.compare": "Vergleich",
  "nav.notes": "Hinweise",

  // ---------------------------------------------------------------------
  // Footer
  // ---------------------------------------------------------------------
  "footer.free":
    "Dieser Rechner ist kostenlos und bleibt es auch. Wer mag, spendiert ein Bier…",
  "footer.donate": "Ein Bier spendieren",

  // ---------------------------------------------------------------------
  // The sheet — bike details
  // ---------------------------------------------------------------------
  "sheet.newService": "Neuer Service",
  "sheet.bike": "Motorrad",
  "sheet.name": "Name",
  "sheet.model": "Modell",
  "sheet.year": "Baujahr",
  "sheet.units": "Einheiten",
  "sheet.addBike": "Weiteres Motorrad hinzufügen",
  "sheet.namePlaceholder": "z. B. Das orange",
  "sheet.nameHint":
    "Name — eindeutig für dieses Motorrad… für alle, die gierig/klug genug sind und mehr als eines haben",
  "sheet.removeBike": "dieses Motorrad entfernen",
  "sheet.removeBikeConfirm": {
    one: "„{name}“ mit seinem einen Service löschen? Das lässt sich nicht rückgängig machen.",
    other:
      "„{name}“ mit allen {count} Services löschen? Das lässt sich nicht rückgängig machen.",
  },

  // ---------------------------------------------------------------------
  // The sheet — this service
  // ---------------------------------------------------------------------
  "sheet.date": "Datum",
  "sheet.odometer": "Tachostand ({unit})",
  "sheet.odometerPlaceholder": "z. B. 47504",
  "sheet.note": "Notiz (optional)",
  "sheet.notePlaceholder": "z. B. gemessen — vor dem Einstellen",

  // ---------------------------------------------------------------------
  // The sheet — status
  // ---------------------------------------------------------------------
  "sheet.measured": "{measured}/{total} gemessen",
  "sheet.good": "{count} in Ordnung",
  "sheet.outOfSpec": "{count} außerhalb der Toleranz",
  "sheet.needShims": {
    one: "{count} braucht ein Einstellplättchen",
    other: "{count} brauchen Einstellplättchen",
  },
  "sheet.seeOrderList": "zur Bestellliste",

  // ---------------------------------------------------------------------
  // The sheet — aim
  // ---------------------------------------------------------------------
  "sheet.aimHeading": "Zielwert im Toleranzband",
  "sheet.aimWhy": "warum?",
  "sheet.aimFor": "Zielwert für {type}",
  "aim.min": "Eng",
  "aim.middle": "Mitte",
  "aim.max": "Weit",
  "valveType.intake": "Einlass",
  "valveType.exhaust": "Auslass",

  "sheet.disclaimer":
    "Wird beim Tippen auf diesem Gerät gespeichert. Die Nutzung dieses Rechners erfolgt auf eigene Gefahr — prüfe alles nach, bevor du den Motor zusammenbaust.",

  // ---------------------------------------------------------------------
  // The valve cards
  //
  // "Plättchen" alone on the narrow field labels, "Einstellplättchen" in
  // prose — the full compound does not fit a 7rem column beside "mm". Flagged
  // for review: German riders very often just say "Shim".
  // ---------------------------------------------------------------------
  "valve.f-ex-l": "Auslass vorn links",
  "valve.f-ex-r": "Auslass vorn rechts",
  "valve.f-in-l": "Einlass vorn links",
  "valve.f-in-r": "Einlass vorn rechts",
  "valve.r-in-l": "Einlass hinten links",
  "valve.r-in-r": "Einlass hinten rechts",
  "valve.r-ex-l": "Auslass hinten links",
  "valve.r-ex-r": "Auslass hinten rechts",

  "valve.clearanceLabel": "Spiel",
  "valve.shimLabel": "Verbautes Plättchen",
  "valve.confirmedLabel": "Bestätigtes Spiel",

  "valve.clearanceBounds":
    "Ventilspiele liegen deutlich unter 1 mm. Meintest du z. B. 0,12?",
  "valve.shimBounds":
    "Plättchen liegen bei etwa 2–3 mm. Meintest du z. B. 2,35?",
  "valve.confirmedBounds": "Ventilspiele liegen deutlich unter 1 mm.",

  "valve.hintClearance":
    "Welche Fühlerlehre hast du zwischen Nocken und Tassenstößel bekommen? Trag dein Messergebnis hier in Millimetern ein.",
  "valve.hintShim":
    "Welches Einstellplättchen hast du unter diesem Tassenstößel herausgeholt? Miss es zur Sicherheit nach und trag das Ergebnis hier in Millimetern ein.",
  "valve.hintIdeal":
    "Das ist die Plättchenstärke, die das Spiel für dieses Ventil genau auf den Zielwert bringen würde. Sie wird selten gefertigt — der Vorschlag darunter ist die nächste echte Größe.",
  "valve.hintNewClearance":
    "Das ist das Spiel, das sich mit dem gewählten Plättchen ergibt. Liegt es innerhalb der Toleranz für dieses Ventil? Wenn nicht, geh eine Größe hoch oder runter.",
  "valve.hintConfirmed":
    "Wenn das neue Plättchen drin ist, miss das Spiel noch einmal und trag den echten Wert hier ein. Er liegt oft leicht über oder unter dem vorhergesagten — das ist normal. Ihn festzuhalten gibt dem nächsten Service einen ehrlichen Ausgangspunkt.",

  "valve.measureFirst":
    "Miss zuerst das Spiel — {min}–{max} mm liegt in der Toleranz.",
  "valve.good": "gut — nichts zu tun",
  "valve.onTarget": "genau auf deinem Zielwert von {target} mm",
  "valve.looserThanTarget":
    "{delta} mm weiter als dein Zielwert von {target} mm",
  "valve.tighterThanTarget":
    "{delta} mm enger als dein Zielwert von {target} mm",
  "valve.tooTightBy": "{by} mm zu eng",
  "valve.tooLooseBy": "{by} mm zu weit",
  "valve.outsideRange":
    "Außerhalb von {min}–{max} mm — dieses Plättchen muss raus.",

  "valve.changeAnyway": "Plättchen trotzdem wechseln",
  "valve.pullShim":
    "Plättchen herausnehmen, messen und hier eintragen, um die Ersatzgröße zu bekommen.",
  "valve.noSuitableShim":
    "Kein Plättchen im Katalog bringt dieses Ventil auf {min}–{max} mm. Prüf deine Messungen — ein Stapelmaß von {stack} mm liegt außerhalb des üblichen Bereichs.",
  "valve.ideal": "Ideal {size} mm",
  "valve.fitThis": "Dieses Plättchen einbauen",
  "valve.thinner": "Dünneres Plättchen",
  "valve.thicker": "Dickeres Plättchen",
  "valve.newClearance": "Neues Spiel {value} mm",
  "valve.inSpec": "in Toleranz",
  "valve.outOfSpec": "außerhalb der Toleranz",
  "valve.sameShimBack": "gleiches Plättchen wieder rein",
  "valve.resetSuggested": "auf Vorschlag zurücksetzen",
  "valve.noSizeMade": "Größe nicht gefertigt",
  "valve.confirmPrompt":
    "Wenn das neue Plättchen drin ist, miss noch einmal und halte fest, was tatsächlich herauskam.",
  "valve.confirmedInSpec": "bestätigt in Toleranz",
  "valve.confirmedOutOfSpec": "bestätigt außerhalb der Toleranz",
  "valve.exactlyPredicted": "genau wie vorhergesagt",
  "valve.vsPredicted": "{delta} gegenüber der Vorhersage",

  // ---------------------------------------------------------------------
  // The sheet — frame number
  // ---------------------------------------------------------------------
  "vin.label": "Fahrgestellnummer (VIN)",
  "vin.hint": "17 Zeichen, am Steuerkopf",
  "vin.placeholder": "VBK…",
  "vin.explain":
    "Öffnet den Verlauf dieses Motorrads, seine Diagramme und den gemeinsamen Vergleich — und ist der Weg, über den eine Werkstatt oder der nächste Besitzer die Maschine wiederfindet. Der Datenpool sieht immer nur eine verschlüsselte Fassung, nie die Nummer selbst.",
  "vin.setYear": "Baujahr auf {year} setzen",

  // ---------------------------------------------------------------------
  // Das Blatt — wo das Motorrad steht
  // ---------------------------------------------------------------------
  "place.city": "Stadt",
  "place.region": "Region",
  "place.country": "Land",
  "place.explain":
    "Wo das Motorrad steht, denn dagegen verschleißen seine Ventile. Nur das Land gelangt jemals in den gemeinsamen Vergleich, und auch dort nur mit anderen zusammengefasst — der Ort bleibt hier, bei dir.",
  "place.use": "{place} übernehmen",

  // ---------------------------------------------------------------------
  // Also replaced
  // ---------------------------------------------------------------------
  "items.heading": "Ebenfalls erneuert",
  "items.ticked": "{count} angehakt",
  "items.hint":
    "Hake an, was bei diesem Service verbaut wurde. Nicht angehakt heißt schlicht „diesmal nicht“ — hier muss nichts ausgefüllt werden.",

  // The parts themselves. Ids are permanent and English; only these move.
  "part.oil": "Öl (jede Viskosität)",
  "part.oil-50w": "Öl 50W",
  "part.oil-60w": "Öl 60W",
  "part.air-filter": "Luftfilter",
  "part.oil-filter": "Ölfilter",
  "part.coolant": "Kühlmittel",
  "part.chain": "Kette",
  "part.front-sprocket": "Ritzel",
  "part.rear-sprocket": "Kettenrad",
  "part.front-pads": "Bremsbeläge vorn",
  "part.rear-pads": "Bremsbeläge hinten",
  "part.battery": "Batterie",
  "part.clutch-plates": "Kupplungsscheiben",
  "part.engine-parts": "Motorteile",
  "part.chassis-parts": "Fahrwerksteile",

  // ---------------------------------------------------------------------
  // Elapsed time
  // ---------------------------------------------------------------------
  "time.never": "noch nicht",
  "time.justNow": "gerade eben",
  "time.minutes": { one: "vor {count} Min.", other: "vor {count} Min." },
  "time.hours": { one: "vor {count} Std.", other: "vor {count} Std." },
  "time.days": { one: "vor {count} Tag", other: "vor {count} Tagen" },

  // ---------------------------------------------------------------------
  // Switching between bikes
  // ---------------------------------------------------------------------
  "bikeTabs.label": "Motorräder",
  "bikeTabs.unnamed": "Unbenanntes Motorrad",

  // ---------------------------------------------------------------------
  // Shims to order
  // ---------------------------------------------------------------------
  "order.heading": "Zu bestellende Plättchen",
  "order.emptyTitle": "Nichts zu bestellen",
  "order.emptyBody":
    "Entweder ist noch kein Ventil gemessen, oder in jedem Ventil sitzt bereits das richtige Plättchen.",
  "order.sizes": { one: "{count} Größe", other: "{count} Größen" },
  "order.total": {
    one: "{count} Plättchen in {sizes}.",
    other: "{count} Plättchen in {sizes}.",
  },
  "order.exportCsv": "Diesen Service exportieren (CSV)",
  "order.backupJson": "Alles sichern (JSON)",
  "order.print": "Drucken",
  "order.ktmNote":
    "KTM fertigt ab 2,30 mm nur 0,05-mm-Schritte. Wo zu einer Größe keine KTM-Nummer steht, ist das Harley-Davidson-Plättchen für diesen Zweck dasselbe Teil — und meist günstiger.",

  // ---------------------------------------------------------------------
  // The summary
  // ---------------------------------------------------------------------
  "summary.heading": "Übersicht",
  "summary.empty":
    "Miss ein paar Ventile auf dem Blatt, dann erscheinen sie hier.",

  "summary.colValve": "Ventil",
  "summary.colShim": "Plättchen",
  "summary.colGap": "Spiel",
  "summary.colPredicted": "Vorhergesagt",

  "summary.foundHeading": "Vorgefundene Plättchen und Spiele",
  "summary.foundCaption":
    "Was aus dem Motor kam, und mit welchem Spiel er lief.",
  "summary.tight": "eng",
  "summary.loose": "weit",

  "summary.setHeading": "Eingestellte Plättchen und Spiele",
  "summary.setCaptionConfirmed":
    "Was eingebaut wurde, und das Spiel, das du danach tatsächlich gemessen hast.",
  "summary.setCaptionPredicted":
    "Was eingebaut wurde, und das Spiel, das die Rechnung vorhersagt. Trag die bestätigten Spiele auf dem Blatt ein, sobald alles zusammen ist.",
  "summary.leftAlone": "unangetastet",
  "summary.confirmed": "bestätigt",
  "summary.predicted": "vorhergesagt",
  "summary.legend":
    "„Unangetastet“ heißt, das Spiel lag in der Toleranz und das Plättchen wurde nie angerührt — das gezeigte Spiel ist also das, mit dem der Motor ohnehin lief. ↺ heißt, das Plättchen kam heraus, aber dieselbe Größe ging wieder hinein. Werte in Klammern sind vorhergesagt, nicht gemessen.",

  "summary.driftHeading": "Bestätigt gegenüber vorhergesagt",
  "summary.driftBody":
    "Normal — die Fertigungstoleranz des Plättchens und wie sich der Tassenstößel setzt, verschieben beides. Es wird festgehalten, damit der nächste Service von dem ausgeht, was der Motor tatsächlich gemacht hat, und nicht von dem, was die Rechnung sagte.",

  // ---------------------------------------------------------------------
  // History
  // ---------------------------------------------------------------------
  "history.heading": "Verlauf",
  "history.forBike": "Services für {name}",
  "history.thisBike": "dieses Motorrad",
  "history.allServices": "Jeder Service, den du auf diesem Gerät gespeichert hast",

  "history.driftHeading": "Plättchenstärke im Zeitverlauf",
  "history.perValveHeading": "Plättchenstärke, Ventil für Ventil",
  "history.servicesHeading": "Services",

  "history.open": "offen",
  "history.importedChip": "importiert",
  "history.nextService": "Nächster Service",
  "history.delete": "Löschen",
  "history.deleteConfirm":
    "Den Service bei {odometer} löschen? Das lässt sich nicht rückgängig machen.",

  "history.accountHeading": "Konto",
  "history.backupHeading": "Sicherung",
  "history.backupBody":
    "Deine Services liegen auf diesem Gerät und auf dem Server unter deinem Konto. Ein Export ist die Kopie, die von beidem unabhängig ist — bewahr eine an einem sicheren Ort auf.",
  "history.exportAll": "Alles exportieren",
  "history.importBackup": "Sicherung importieren",
  "history.imported": "Importiert — {added} neu, {merged} aktualisiert.",

  // ---------------------------------------------------------------------
  // The charts
  // ---------------------------------------------------------------------
  "trend.emptyTitle": "Noch keine Plättchenstärken erfasst",
  "trend.emptyAverage":
    "Sobald bei einem Service die Stärke aller vier Plättchen eingetragen ist, zeigt diese Grafik, wie dünn sie über das Motorleben geworden sind.",
  "trend.emptyPerValve":
    "Trag die Stärke eines ausgebauten Plättchens ein, dann beginnt hier die Darstellung Ventil für Ventil.",

  "trend.averageCaption":
    "Mittlere Plättchenstärke über alle vier Ventile. Zwischen den Services flach, weil dieselben Plättchen noch drin sind; jede Stufe ist eine Änderung von dir. Der Abfall von einem Ende zum anderen zeigt, wie weit sich die Ventile eingearbeitet haben.",
  "trend.averageIntake": {
    one: "Mittelwert über das {count} Einlassventil",
    other: "Mittelwert über alle {count} Einlassventile",
  },
  "trend.averageExhaust": {
    one: "Mittelwert über das {count} Auslassventil",
    other: "Mittelwert über alle {count} Auslassventile",
  },
  "trend.allIntakeValves": {
    one: "das {count} Einlassventil",
    other: "alle {count} Einlassventile",
  },
  "trend.allExhaustValves": {
    one: "das {count} Auslassventil",
    other: "alle {count} Auslassventile",
  },
  "trend.overall": "{delta} mm insgesamt",
  "trend.noneAverage": "keine Plättchenstärken erfasst",
  "trend.nonePerValve": "keine Plättchenstärke erfasst",

  "trend.perValveCaption":
    "Stärke des Plättchens in jedem Ventil. Gefüllt ist, was herauskam, hohl ist, was wieder hineinging.",
  "trend.showTable": "Tabelle zeigen",
  "trend.showCharts": "Grafiken zeigen",

  "trend.panelLabel": {
    one: "{label}: Plättchenstärke über {count} Service, von {from} auf {to} mm",
    other:
      "{label}: Plättchenstärke über {count} Services, von {from} auf {to} mm",
  },
  "trend.pointFound": "{label} — ausgebautes Plättchen {size} mm",
  "trend.pointSet": "{label} — eingebautes Plättchen {size} mm",
  "trend.pointFoundMean":
    "{label} — ausgebautes Plättchen {size} mm (Mittel aus {count})",
  "trend.pointSetMean":
    "{label} — eingebautes Plättchen {size} mm (Mittel aus {count})",

  "trend.tableCaption":
    "Stärke des in jedem Ventil vorgefundenen Plättchens in Millimetern, nach Service",

  // ---------------------------------------------------------------------
  // Signing in
  // ---------------------------------------------------------------------
  "signIn.blurb":
    "Melde dich einmal an, und dein Ventilspiel-Verlauf folgt dir auf jedes Gerät, das du benutzt. Danach läuft die App offline — richte sie zu Hause ein und nutze sie dort, wo das Motorrad steht.",
  "signIn.offline":
    "Du bist offline. Die erste Anmeldung braucht eine Verbindung — alles danach nicht mehr.",
  "signIn.email": "E-Mail",
  "signIn.password": "Passwort",
  "signIn.passwordHint": "Mindestens 8 Zeichen.",
  "signIn.forgotBlurb":
    "Wir schicken dir per E-Mail einen Link, um ein neues zu setzen. Deine Services bleiben genau da, wo sie sind.",
  "signIn.confirmSent":
    "Konto angelegt. Sieh in deinen E-Mails nach dem Bestätigungslink, dann komm zurück und melde dich an.",
  "signIn.resetSent":
    "Falls es zu dieser Adresse ein Konto gibt, ist ein Link unterwegs. Er funktioniert einmal, und nur etwa eine Stunde lang.",
  "signIn.busy": "Einen Moment…",
  "signIn.submitIn": "Anmelden",
  "signIn.submitUp": "Konto anlegen",
  "signIn.submitForgot": "Schick mir einen Link",
  "signIn.toSignUp": "Noch kein Konto? Leg eines an",
  "signIn.toSignIn": "Schon ein Konto? Anmelden",
  "signIn.forgot": "Passwort vergessen?",

  // ---------------------------------------------------------------------
  // Account and sync
  // ---------------------------------------------------------------------
  "account.syncsHere":
    "Deine Services werden mit diesem Konto synchronisiert.",
  "account.syncNow": "Jetzt synchronisieren",
  "account.signOut": "Abmelden",

  "sync.syncing": "Wird synchronisiert…",
  "sync.syncedAgo": "Synchronisiert {ago}",
  "sync.lastSyncedAgo": "Zuletzt synchronisiert {ago}",
  "sync.offline": "Offline",
  "sync.offlineDetail":
    "Deine Änderungen sind hier gespeichert und gehen hoch, sobald du wieder Empfang hast.",
  "sync.authExpired": "Erneut anmelden",
  "sync.authExpiredDetail":
    "Du bist auf diesem Gerät lange genug angemeldet, dass der Server eine frische Anmeldung verlangt. Es geht nichts verloren — deine Aufzeichnungen sind hier und werden synchronisiert, sobald du es getan hast.",
  "sync.noBackend": "Kein Server",
  "sync.noBackendDetail":
    "Für diese Installation ist keine Synchronisierung eingerichtet. Der Export ist deine Sicherung.",
  "sync.failed": "Synchronisierung fehlgeschlagen",
  "sync.failedDetail":
    "Deine Aufzeichnungen sind auf diesem Gerät sicher. Versuch es gleich noch einmal.",

  // ---------------------------------------------------------------------
  // The shared pool
  // ---------------------------------------------------------------------
  "pool.heading": "Gemeinsame Verschleißdaten",
  "pool.subheading": "Woher diese App ihre Durchschnittswerte nimmt.",
  "pool.readings": {
    one: "{formatted} Messwert",
    other: "{formatted} Messwerte",
  },
  "pool.why":
    "Der Verlauf eines einzelnen Motorrads ist eine zu kleine Stichprobe, um zu zeigen, wie diese Motoren verschleißen. Deshalb wandert jedes Spiel, das du misst, in einen gemeinsamen Datenpool neben dem aller anderen, und sobald genug zusammengekommen ist, wird daraus ein Vergleich — wie dein Motor gegenüber dem Durchschnitt deines Modells verschleißt.",
  "pool.whatGoesLabel": "Was hochgeht:",
  "pool.whatGoes":
    "Modell und Baujahr, der Tachostand, der Monat und für jedes Ventil das gefundene Spiel, das ausgebaute Einstellplättchen und das bestätigte Spiel.",
  "pool.whatDoesntLabel": "Was nicht:",
  "pool.whatDoesnt":
    "dein Name, deine E-Mail-Adresse, wie du dein Motorrad nennst, oder irgendetwas, das einen Messwert auf dich zurückführt — diese Verbindung fehlt mit Absicht, und sie lässt sich später von niemandem wiederherstellen, mich eingeschlossen.",
  "pool.retractLabel": "Einen Messwert wieder herausnehmen",
  "pool.retract":
    ": Lösche seinen Service innerhalb eines Monats, dann verlässt er den Pool mit ihm. Danach behalten die Durchschnittswerte ihn, und Löschen entfernt ihn nur noch aus deinem eigenen Verlauf.",
  "pool.lastSent": "Zuletzt gesendet {ago}.",
  "pool.nothingSent":
    "Noch nichts gesendet — es geht beim nächsten Synchronisieren hoch.",

  // ---------------------------------------------------------------------
  // Language picker
  // ---------------------------------------------------------------------
  "language.heading": "Sprache",
  "language.change": "Sprache ändern",
  "language.unreviewed":
    "noch nicht von einem Fahrer geprüft, der diese Sprache spricht",
  "language.unreviewedShort": "ungeprüft",
} satisfies Dictionary;

export default de;
