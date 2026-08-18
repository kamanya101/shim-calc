import type { Dictionary } from "../translate";

/**
 * Afrikaans. Translated from en.ts, not yet checked by a rider who speaks it —
 * `reviewed: false` in locales.ts, and the picker says so out loud.
 *
 * This is the one language in the list that is not there on KTM's sales
 * figures. It is there because the riders this app actually has are South
 * African, which also makes it the first one likely to get a real review.
 *
 * Workshop vocabulary, where the wrong word does real damage:
 *   shim            → stelplaatjie (the shim under the bucket)
 *   valve clearance → klepspeling
 *   clearance / gap → speling
 *   intake/exhaust  → inlaat / uitlaat
 *   frame number    → raamnommer
 *
 * Note for whoever reviews this: South African workshops mix a good deal of
 * English into Afrikaans on the bench — "shim" is said far more often than
 * "stelplaatjie". Written Afrikaans is used here throughout, but if the riders
 * reading it would rather see the bench words, that is a change worth making
 * and not a mistake being corrected.
 */
const af = {
  // ---------------------------------------------------------------------
  // Shared
  // ---------------------------------------------------------------------
  "common.loading": "Laai tans…",
  "common.choose": "Kies…",
  "common.notSure": "Nie seker nie",
  "common.optional": "opsioneel",

  // ---------------------------------------------------------------------
  // Navigation
  // ---------------------------------------------------------------------
  "nav.sections": "Afdelings",
  "nav.sheet": "Blad",
  "nav.order": "Bestel",
  "nav.summary": "Opsomming",
  "nav.history": "Geskiedenis",
  "nav.compare": "Vergelyk",
  "nav.notes": "Notas",

  // ---------------------------------------------------------------------
  // Footer
  // ---------------------------------------------------------------------
  "footer.free":
    "Hierdie sakrekenaar is gratis, en sal altyd wees. As jy ’n bier wil koop…",
  "footer.donate": "Koop ’n bier",

  // ---------------------------------------------------------------------
  // The sheet — bike details
  // ---------------------------------------------------------------------
  "sheet.newService": "Nuwe diens",
  "sheet.bike": "Fiets",
  "sheet.name": "Naam",
  "sheet.model": "Model",
  "sheet.year": "Jaar",
  "sheet.units": "Eenhede",
  "sheet.addBike": "Voeg nog ’n fiets by",
  "sheet.namePlaceholder": "bv. Die oranje een",
  "sheet.nameHint":
    "Naam — uniek aan hierdie fiets… vir dié wat gulsig/slim genoeg is om meer as een te hê",
  "sheet.removeBike": "verwyder hierdie fiets",
  "sheet.removeBikeConfirm": {
    one: "Skrap “{name}” en sy een diens? Dit kan nie ongedaan gemaak word nie.",
    other:
      "Skrap “{name}” en al {count} sy dienste? Dit kan nie ongedaan gemaak word nie.",
  },

  // ---------------------------------------------------------------------
  // The sheet — this service
  // ---------------------------------------------------------------------
  "sheet.date": "Datum",
  "sheet.odometer": "Odometer ({unit})",
  "sheet.odometerPlaceholder": "bv. 47504",
  "sheet.note": "Nota (opsioneel)",
  "sheet.notePlaceholder": "bv. gemeet — voor verstelling",

  // ---------------------------------------------------------------------
  // The sheet — status
  // ---------------------------------------------------------------------
  "sheet.measured": "{measured}/{total} gemeet",
  "sheet.good": "{count} reg",
  "sheet.outOfSpec": "{count} buite spesifikasie",
  "sheet.needShims": {
    one: "{count} kort ’n stelplaatjie",
    other: "{count} kort stelplaatjies",
  },
  "sheet.seeOrderList": "sien bestellys",

  // ---------------------------------------------------------------------
  // The sheet — aim
  // ---------------------------------------------------------------------
  "sheet.aimHeading": "Mik binne die band",
  "sheet.aimWhy": "hoekom?",
  "sheet.aimFor": "Mik vir {type}",
  "aim.min": "Nou",
  "aim.middle": "Middel",
  "aim.max": "Wyd",
  "valveType.intake": "inlaat",
  "valveType.exhaust": "uitlaat",

  "sheet.disclaimer":
    "Word op hierdie toestel gestoor soos jy tik. Gebruik van hierdie sakrekenaar is heeltemal op eie risiko — kontroleer alles voordat jy weer opbou.",

  // ---------------------------------------------------------------------
  // The sheet — frame number
  // ---------------------------------------------------------------------
  "vin.label": "Raamnommer (VIN)",
  "vin.hint": "17 karakters, op die stuurkop",
  "vin.placeholder": "VBK…",
  "vin.explain":
    "Maak hierdie fiets se geskiedenis, sy grafieke en die gedeelde vergelyking oop — en is hoe ’n werkswinkel, of wie dit volgende besit, die masjien weer opspoor. Die poel sien net ooit ’n deurmekaar weergawe, nooit die nommer self nie.",
  "vin.setYear": "Stel jaar op {year}",

  // ---------------------------------------------------------------------
  // Also replaced
  // ---------------------------------------------------------------------
  "items.heading": "Ook vervang",
  "items.ticked": "{count} gemerk",
  "items.hint":
    "Merk wat by hierdie diens opgesit is. Onaangeraak beteken eenvoudig “nie hierdie keer nie” — niks hier hoef ingevul te word nie.",

  // The parts themselves. Ids are permanent and English; only these move.
  "part.oil-50w": "Olie 50W",
  "part.oil-60w": "Olie 60W",
  "part.air-filter": "Lugfilter",
  "part.oil-filter": "Oliefilter",
  "part.coolant": "Verkoelvloeistof",
  "part.brake-pads": "Remblokke",
  "part.chain": "Ketting",
  "part.front-sprocket": "Voorste rondsel",
  "part.rear-sprocket": "Agterste rondsel",
  "part.front-pads": "Voorste remblokke",
  "part.rear-pads": "Agterste remblokke",
  "part.battery": "Battery",
  "part.clutch-plates": "Koppelaarplate",
  "part.engine-parts": "Enjinonderdele",
  "part.chassis-parts": "Onderstelonderdele",

  // ---------------------------------------------------------------------
  // Elapsed time
  // ---------------------------------------------------------------------
  "time.never": "nog nie",
  "time.justNow": "nou net",
  "time.minutes": { one: "{count} min gelede", other: "{count} min gelede" },
  "time.hours": { one: "{count} uur gelede", other: "{count} uur gelede" },
  "time.days": { one: "{count} dag gelede", other: "{count} dae gelede" },

  // ---------------------------------------------------------------------
  // Signing in
  // ---------------------------------------------------------------------
  "signIn.blurb":
    "Teken een keer in en jou spelingsgeskiedenis volg jou na elke toestel wat jy gebruik. Daarna werk die program aflyn — stel dit tuis op en gebruik dit waar die fiets ook al staan.",
  "signIn.offline":
    "Jy is aflyn. Die eerste keer inteken kort ’n verbinding — alles daarna nie.",
  "signIn.email": "E-pos",
  "signIn.password": "Wagwoord",
  "signIn.passwordHint": "Ten minste 8 karakters.",
  "signIn.forgotBlurb":
    "Ons stuur jou ’n skakel per e-pos om ’n nuwe een te stel. Jou dienste bly presies waar hulle is.",
  "signIn.confirmSent":
    "Rekening geskep. Kyk in jou e-pos vir ’n bevestigingskakel, kom dan terug en teken in.",
  "signIn.resetSent":
    "As daardie adres ’n rekening het, is ’n skakel op pad. Dit werk een keer, en net vir omtrent ’n uur.",
  "signIn.busy": "Net ’n oomblik…",
  "signIn.submitIn": "Teken in",
  "signIn.submitUp": "Skep rekening",
  "signIn.submitForgot": "Stuur my ’n skakel",
  "signIn.toSignUp": "Nog geen rekening nie? Skep een",
  "signIn.toSignIn": "Het jy reeds ’n rekening? Teken in",
  "signIn.forgot": "Wagwoord vergeet?",

  // ---------------------------------------------------------------------
  // Account and sync
  // ---------------------------------------------------------------------
  "account.syncsHere": "Jou dienste sinkroniseer na hierdie rekening.",
  "account.syncNow": "Sinkroniseer nou",
  "account.signOut": "Teken uit",

  "sync.syncing": "Sinkroniseer tans…",
  "sync.syncedAgo": "Gesinkroniseer {ago}",
  "sync.lastSyncedAgo": "Laas gesinkroniseer {ago}",
  "sync.offline": "Aflyn",
  "sync.offlineDetail":
    "Jou veranderinge is hier gestoor en gaan op sodra jy sein het.",
  "sync.authExpired": "Teken weer in",
  "sync.authExpiredDetail":
    "Jy is lank genoeg op hierdie toestel ingeteken dat die bediener ’n vars inteken wil hê. Niks gaan verlore nie — jou rekords is hier, en hulle sinkroniseer sodra jy dit doen.",
  "sync.noBackend": "Geen bediener",
  "sync.noBackendDetail":
    "Hierdie kopie het geen sinkronisasie opgestel nie. Uitvoer is jou rugsteun.",
  "sync.failed": "Sinkronisasie het misluk",
  "sync.failedDetail":
    "Jou rekords is veilig op hierdie toestel. Probeer oor ’n oomblik weer.",

  // ---------------------------------------------------------------------
  // The shared pool
  // ---------------------------------------------------------------------
  "pool.heading": "Gedeelde slytasiedata",
  "pool.subheading": "Hoe hierdie program sy gemiddeldes bou.",
  "pool.readings": {
    one: "{formatted} lesing",
    other: "{formatted} lesings",
  },
  "pool.why":
    "Een fiets se geskiedenis is ’n te klein steekproef om te wys hoe hierdie enjins slyt. Daarom sluit elke speling wat jy meet by ’n gedeelde poel aan langs almal anders s’n, en sodra genoeg ingekom het, word dit ’n vergelyking — hoe jou enjin slyt teenoor die gemiddeld vir jou model.",
  "pool.whatGoesLabel": "Wat gaan:",
  "pool.whatGoes":
    "die model en jaar, die odometer, die maand, en vir elke klep die speling wat jy gekry het, die stelplaatjie wat daarin was en die speling wat jy bevestig het.",
  "pool.whatDoesntLabel": "Wat nie:",
  "pool.whatDoesnt":
    "jou naam, jou e-pos, wat jy jou fiets noem, of enigiets wat ’n lesing aan jou koppel — daardie skakel ontbreek doelbewus, en dit kan later deur niemand herbou word nie, ek inkluis.",
  "pool.retractLabel": "Om ’n lesing weer uit te haal",
  "pool.retract":
    ", skrap sy diens binne ’n maand en dit verlaat die poel saam daarmee. Daarna hou die gemiddeldes dit, en skrap haal dit net uit jou eie geskiedenis.",
  "pool.lastSent": "Laas gestuur {ago}.",
  "pool.nothingSent":
    "Nog niks gestuur nie — dit gaan op met die volgende sinkronisasie.",

  // ---------------------------------------------------------------------
  // Language picker
  // ---------------------------------------------------------------------
  "language.heading": "Taal",
  "language.change": "Verander taal",
  "language.unreviewed":
    "nog nie nagegaan deur ’n ryer wat dit praat nie",
  "language.unreviewedShort": "ongekontroleer",
} satisfies Dictionary;

export default af;
