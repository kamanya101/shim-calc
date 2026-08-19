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
  // The valve cards
  //
  // "stoter" for the tappet bucket rather than the literal "emmer". This is
  // the block most worth a real rider's eye — Andrew has South African riders
  // to hand, and these are the words they would actually say at the bench.
  // ---------------------------------------------------------------------
  "valve.f-ex-l": "Uitlaat voor links",
  "valve.f-ex-r": "Uitlaat voor regs",
  "valve.f-in-l": "Inlaat voor links",
  "valve.f-in-r": "Inlaat voor regs",
  "valve.r-in-l": "Inlaat agter links",
  "valve.r-in-r": "Inlaat agter regs",
  "valve.r-ex-l": "Uitlaat agter links",
  "valve.r-ex-r": "Uitlaat agter regs",

  "valve.clearanceLabel": "Speling",
  "valve.shimLabel": "Stelplaatjie in",
  "valve.confirmedLabel": "Bevestigde speling",

  "valve.clearanceBounds":
    "Spelings is ver onder 1 mm. Het jy dalk 0,12 bedoel?",
  "valve.shimBounds":
    "Stelplaatjies is omtrent 2–3 mm. Het jy dalk 2,35 bedoel?",
  "valve.confirmedBounds": "Spelings is ver onder 1 mm.",

  "valve.hintClearance":
    "Watter voelermaat het jy tussen die nok en die stoter ingekry? Sit jou meting hier in millimeter in.",
  "valve.hintShim":
    "Watter stelplaatjie het jy onder hierdie stoter uitgehaal? Meet dit om seker te maak en sit die meting hier in millimeter in.",
  "valve.hintIdeal":
    "Dit is die stelplaatjie-dikte wat die speling presies op teiken sou sit vir hierdie klep. Dit word selde gemaak — die voorstel hieronder is die naaste werklike grootte.",
  "valve.hintNewClearance":
    "Dit is die speling wat jy kry met die stelplaatjie wat jy gekies het. Is dit binne die toleransies vir hierdie klep? Indien nie, gaan een grootte op of af.",
  "valve.hintConfirmed":
    "Sodra die nuwe stelplaatjie in is, meet die speling weer en sit die werklike syfer hier. Dit is dikwels effens meer of minder as die voorspelde een — dit is normaal. Om dit aan te teken gee die volgende diens ’n eerlike beginpunt.",

  "valve.measureFirst":
    "Meet eers die speling — {min}–{max} mm is binne spesifikasie.",
  "valve.good": "goed — niks om te verander nie",
  "valve.onTarget": "presies op jou teiken van {target} mm",
  "valve.looserThanTarget": "{delta} mm wyer as jou teiken van {target} mm",
  "valve.tighterThanTarget": "{delta} mm nouer as jou teiken van {target} mm",
  "valve.tooTightBy": "{by} mm te nou",
  "valve.tooLooseBy": "{by} mm te wyd",
  "valve.outsideRange":
    "Buite {min}–{max} mm — hierdie stelplaatjie moet uit.",

  "valve.changeAnyway": "verander die stelplaatjie in elk geval",
  "valve.pullShim":
    "Haal die stelplaatjie uit, meet dit, en sit dit hier in vir ’n vervangingsgrootte.",
  "valve.noSuitableShim":
    "Geen stelplaatjie in die katalogus kry hierdie klep binne {min}–{max} mm nie. Kontroleer jou metings — ’n stapel van {stack} mm is buite die normale reeks.",
  "valve.ideal": "Ideaal {size} mm",
  "valve.fitThis": "Sit hierdie stelplaatjie in",
  "valve.thinner": "Dunner stelplaatjie",
  "valve.thicker": "Dikker stelplaatjie",
  "valve.newClearance": "Nuwe speling {value} mm",
  "valve.inSpec": "binne spesifikasie",
  "valve.outOfSpec": "buite spesifikasie",
  "valve.sameShimBack": "selfde stelplaatjie terug in",
  "valve.resetSuggested": "stel terug na voorstel",
  "valve.noSizeMade": "grootte nie gemaak nie",
  "valve.confirmPrompt":
    "Sodra die nuwe stelplaatjie in is, meet weer en teken aan wat jy werklik gekry het.",
  "valve.confirmedInSpec": "bevestig binne spesifikasie",
  "valve.confirmedOutOfSpec": "bevestig buite spesifikasie",
  "valve.exactlyPredicted": "presies soos voorspel",
  "valve.vsPredicted": "{delta} teenoor voorspel",

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
  // Die blad — waar die fiets bly
  // ---------------------------------------------------------------------
  "place.city": "Stad",
  "place.region": "Streek",
  "place.country": "Land",
  "place.explain":
    "Waar die fiets bly, want dit is waarteen sy kleppe verslyt. Net die land kom ooit by die gedeelde vergelyking uit, en dan altyd saam met ander gegroepeer — die dorp bly hier, by jou.",
  "place.use": "Gebruik {place}",

  // ---------------------------------------------------------------------
  // Also replaced
  // ---------------------------------------------------------------------
  "items.heading": "Ook vervang",
  "items.ticked": "{count} gemerk",
  "items.hint":
    "Merk wat by hierdie diens opgesit is. Onaangeraak beteken eenvoudig “nie hierdie keer nie” — niks hier hoef ingevul te word nie.",

  // The parts themselves. Ids are permanent and English; only these move.
  "part.oil": "Olie (enige graad)",
  "part.oil-50w": "Olie 50W",
  "part.oil-60w": "Olie 60W",
  "part.air-filter": "Lugfilter",
  "part.oil-filter": "Oliefilter",
  "part.coolant": "Verkoelvloeistof",
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
  // Switching between bikes
  // ---------------------------------------------------------------------
  "bikeTabs.label": "Fietse",
  "bikeTabs.unnamed": "Naamlose fiets",

  // ---------------------------------------------------------------------
  // Shims to order
  // ---------------------------------------------------------------------
  "order.heading": "Stelplaatjies om te bestel",
  "order.emptyTitle": "Niks om te bestel nie",
  "order.emptyBody":
    "Of geen klep is nog gemeet nie, of elke klep het reeds die regte stelplaatjie in.",
  "order.sizes": { one: "{count} grootte", other: "{count} groottes" },
  "order.total": {
    one: "{count} stelplaatjie in {sizes}.",
    other: "{count} stelplaatjies in {sizes}.",
  },
  "order.exportCsv": "Voer hierdie diens uit (CSV)",
  "order.backupJson": "Rugsteun alles (JSON)",
  "order.print": "Druk",
  "order.ktmNote":
    "KTM maak net 0,05 mm-stappe van 2,30 mm af op. Waar ’n grootte geen KTM-nommer wys nie, is die Harley-Davidson-stelplaatjie dieselfde onderdeel vir hierdie werk — en gewoonlik goedkoper.",

  // ---------------------------------------------------------------------
  // The summary
  // ---------------------------------------------------------------------
  "summary.heading": "Opsomming",
  "summary.empty":
    "Meet ’n paar kleppe op die Blad en hulle sal hier verskyn.",

  "summary.colValve": "Klep",
  "summary.colShim": "Plaatjie",
  "summary.colGap": "Speling",
  "summary.colPredicted": "Voorspel",

  "summary.foundHeading": "Stelplaatjies en spelings gevind",
  "summary.foundCaption":
    "Wat uit die enjin gekom het, en die speling waarmee dit geloop het.",
  "summary.tight": "nou",
  "summary.loose": "wyd",

  "summary.setHeading": "Stelplaatjies en spelings gestel",
  "summary.setCaptionConfirmed":
    "Wat ingegaan het, en die speling wat jy daarna werklik gemeet het.",
  "summary.setCaptionPredicted":
    "Wat ingegaan het, en die speling wat die wiskunde voorspel. Teken die bevestigde spelings op die Blad aan sodra alles weer saam is.",
  "summary.leftAlone": "onaangeraak",
  "summary.confirmed": "bevestig",
  "summary.predicted": "voorspel",
  "summary.legend":
    "“Onaangeraak” beteken die speling was binne toleransie en die stelplaatjie is nooit gesteur nie, so die speling wat gewys word is dié waarmee dit reeds geloop het. ↺ beteken die stelplaatjie het uitgekom maar dieselfde grootte het teruggegaan. Syfers tussen hakies is voorspel, nie gemeet nie.",

  "summary.driftHeading": "Bevestig teenoor voorspel",
  "summary.driftBody":
    "Normaal — die stelplaatjie se diktetoleransie en hoe die stoter sit, skuif albei daaraan. Dit word aangeteken sodat die volgende diens begin by wat die enjin werklik gedoen het, nie by wat die rekenkunde gesê het nie.",

  // ---------------------------------------------------------------------
  // History
  // ---------------------------------------------------------------------
  "history.heading": "Geskiedenis",
  "history.forBike": "Dienste vir {name}",
  "history.thisBike": "hierdie fiets",
  "history.allServices": "Elke diens wat jy op hierdie toestel gestoor het",

  "history.driftHeading": "Stelplaatjie-dikte oor tyd",
  "history.perValveHeading": "Stelplaatjie-dikte, klep vir klep",
  "history.servicesHeading": "Dienste",

  "history.open": "oop",
  "history.importedChip": "ingevoer",
  "history.nextService": "Volgende diens",
  "history.delete": "Skrap",
  "history.deleteConfirm":
    "Skrap die diens by {odometer}? Dit kan nie ongedaan gemaak word nie.",

  "history.accountHeading": "Rekening",
  "history.backupHeading": "Rugsteun",
  "history.backupBody":
    "Jou dienste is op hierdie toestel en op die bediener onder jou rekening. ’n Uitvoer is die kopie wat van nie een van die twee afhang nie — hou een êrens veilig.",
  "history.exportAll": "Voer alles uit",
  "history.importBackup": "Voer rugsteun in",
  "history.imported": "Ingevoer — {added} nuut, {merged} bygewerk.",

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
