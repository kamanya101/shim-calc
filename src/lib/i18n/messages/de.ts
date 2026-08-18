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
