import type { Dictionary } from "../translate";

/**
 * The English words, and the source every other language is translated from.
 *
 * Two rules for anyone adding to this file:
 *
 * 1. A key names where the words appear and what they say — `sheet.removeBike`,
 *    not `sheet.button4`. Translators work through this file without the app in
 *    front of them, and a key is the only context most lines get.
 *
 * 2. Never assemble a sentence from fragments in the components. English puts
 *    its words in an order most of these languages do not, so a phrase built as
 *    `t("found") + " " + count` is a phrase that can only ever come out
 *    English-shaped. Whole sentences with `{placeholders}` in them, always.
 *
 * Counted things use plural forms rather than a bare `{count}`, because Russian,
 * Polish and Czech need three of them. See translate.ts.
 */
const en = {
  // ---------------------------------------------------------------------
  // Shared
  // ---------------------------------------------------------------------
  "common.loading": "Loading…",
  "common.choose": "Choose…",
  "common.notSure": "Not sure",
  "common.optional": "optional",

  // ---------------------------------------------------------------------
  // Navigation
  // ---------------------------------------------------------------------
  "nav.sections": "Sections",
  "nav.sheet": "Sheet",
  "nav.order": "Order",
  "nav.summary": "Summary",
  "nav.history": "History",
  "nav.compare": "Compare",
  "nav.notes": "Notes",

  // ---------------------------------------------------------------------
  // Footer
  // ---------------------------------------------------------------------
  "footer.free":
    "This calculator is free, and always will be. If you’d like to buy a beer…",
  "footer.donate": "Buy a beer",

  // ---------------------------------------------------------------------
  // The sheet — bike details
  // ---------------------------------------------------------------------
  "sheet.newService": "New service",
  "sheet.bike": "Bike",
  "sheet.name": "Name",
  "sheet.model": "Model",
  "sheet.year": "Year",
  "sheet.units": "Units",
  "sheet.addBike": "Add another bike",
  "sheet.namePlaceholder": "e.g. Orange one",
  "sheet.nameHint":
    "Name — unique to this bike… for those who are greedy/wise and have more than one",
  "sheet.removeBike": "remove this bike",
  "sheet.removeBikeConfirm": {
    one: "Delete “{name}” and its one service? This can’t be undone.",
    other: "Delete “{name}” and all {count} of its services? This can’t be undone.",
  },

  // ---------------------------------------------------------------------
  // The sheet — this service
  // ---------------------------------------------------------------------
  "sheet.date": "Date",
  "sheet.odometer": "Odometer ({unit})",
  "sheet.odometerPlaceholder": "e.g. 47504",
  "sheet.note": "Note (optional)",
  "sheet.notePlaceholder": "e.g. found — before adjustment",

  // ---------------------------------------------------------------------
  // The sheet — status
  // ---------------------------------------------------------------------
  "sheet.measured": "{measured}/{total} measured",
  "sheet.good": "{count} good",
  "sheet.outOfSpec": "{count} out of spec",
  "sheet.needShims": {
    one: "{count} needs a shim",
    other: "{count} need shims",
  },
  "sheet.seeOrderList": "see order list",

  // ---------------------------------------------------------------------
  // The sheet — aim
  // ---------------------------------------------------------------------
  "sheet.aimHeading": "Aim inside the band",
  "sheet.aimWhy": "why?",
  "sheet.aimFor": "Aim for {type}",
  "aim.min": "Tight",
  "aim.middle": "Middle",
  "aim.max": "Loose",
  "valveType.intake": "intake",
  "valveType.exhaust": "exhaust",

  "sheet.disclaimer":
    "Saved on this device as you type. Use of this calculator is at your own risk — check everything before you build it up.",

  // ---------------------------------------------------------------------
  // The sheet — frame number
  // ---------------------------------------------------------------------
  "vin.label": "Frame number (VIN)",
  "vin.hint": "17 characters, on the steering head",
  "vin.placeholder": "VBK…",
  "vin.explain":
    "Opens this bike’s history, its charts and the shared comparison — and is how a workshop, or whoever owns it next, finds the machine again. The pool only ever sees a scrambled version, never the number.",
  "vin.setYear": "Set year to {year}",

  // ---------------------------------------------------------------------
  // The sheet — where the bike lives
  // ---------------------------------------------------------------------
  "place.city": "City",
  "place.region": "Region",
  "place.country": "Country",
  "place.explain":
    "Where the bike lives, which is what its valves wear against. Only the country ever reaches the shared comparison, and only ever grouped with others — the town stays here, with you.",
  "place.use": "Use {place}",

  // ---------------------------------------------------------------------
  // Also replaced
  // ---------------------------------------------------------------------
  "items.heading": "Also replaced",
  "items.ticked": "{count} ticked",
  "items.hint":
    "Tick what went on at this service. Left untouched is simply “not this time” — nothing here has to be filled in.",

  // The parts themselves. Ids are permanent and English; only these move.
  "part.oil-50w": "Oil 50W",
  "part.oil-60w": "Oil 60W",
  "part.air-filter": "Air Filter",
  "part.oil-filter": "Oil Filter",
  "part.coolant": "Coolant",
  "part.chain": "Chain",
  "part.front-sprocket": "Front Sprocket",
  "part.rear-sprocket": "Rear Sprocket",
  "part.front-pads": "Front Pads",
  "part.rear-pads": "Rear Pads",
  "part.battery": "Battery",
  "part.clutch-plates": "Clutch Plates",
  "part.engine-parts": "Engine Parts",
  "part.chassis-parts": "Chassis Parts",

  // ---------------------------------------------------------------------
  // Elapsed time
  // ---------------------------------------------------------------------
  "time.never": "not yet",
  "time.justNow": "just now",
  "time.minutes": { one: "{count} min ago", other: "{count} min ago" },
  "time.hours": { one: "{count} hr ago", other: "{count} hr ago" },
  "time.days": { one: "{count} day ago", other: "{count} days ago" },

  // ---------------------------------------------------------------------
  // Signing in
  //
  // The one screen a rider meets before the app has any idea who they are, so
  // it is also the first place the language button has to work. Everything
  // here is the app's own words; the errors a failed sign-in shows come back
  // from the auth server and are still English — see auth.ts.
  // ---------------------------------------------------------------------
  "signIn.blurb":
    "Sign in once and your clearance history follows you to every device you use. After this the app works offline — set it up at home, use it wherever the bike is.",
  "signIn.offline":
    "You’re offline. Signing in for the first time needs a connection — everything after it doesn’t.",
  "signIn.email": "Email",
  "signIn.password": "Password",
  "signIn.passwordHint": "At least 8 characters.",
  "signIn.forgotBlurb":
    "We’ll email you a link to set a new one. Your services stay exactly where they are.",
  "signIn.confirmSent":
    "Account created. Check your email for a confirmation link, then come back and sign in.",
  "signIn.resetSent":
    "If that address has an account, a link is on its way. It works once, and only for about an hour.",
  "signIn.busy": "Just a moment…",
  "signIn.submitIn": "Sign in",
  "signIn.submitUp": "Create account",
  "signIn.submitForgot": "Email me a link",
  "signIn.toSignUp": "No account yet? Create one",
  "signIn.toSignIn": "Already have an account? Sign in",
  "signIn.forgot": "Forgotten your password?",

  // ---------------------------------------------------------------------
  // Account and sync
  // ---------------------------------------------------------------------
  "account.syncsHere": "Your services sync to this account.",
  "account.syncNow": "Sync now",
  "account.signOut": "Sign out",

  "sync.syncing": "Syncing…",
  "sync.syncedAgo": "Synced {ago}",
  "sync.lastSyncedAgo": "Last synced {ago}",
  "sync.offline": "Offline",
  "sync.offlineDetail":
    "Your changes are saved here and will go up when you have signal.",
  "sync.authExpired": "Sign in again",
  "sync.authExpiredDetail":
    "You’ve been signed in on this device long enough that the server wants a fresh sign-in. Nothing is lost — your records are here, and they’ll sync once you do.",
  "sync.noBackend": "No server",
  "sync.noBackendDetail":
    "This copy has no sync configured. Export is your backup.",
  "sync.failed": "Sync failed",
  "sync.failedDetail":
    "Your records are safe on this device. Try again in a moment.",

  // ---------------------------------------------------------------------
  // The shared pool
  // ---------------------------------------------------------------------
  "pool.heading": "Shared wear data",
  "pool.subheading": "How this app builds its averages.",
  "pool.readings": {
    one: "{formatted} reading",
    other: "{formatted} readings",
  },
  "pool.why":
    "One bike’s history is too small a sample to show how these engines wear. So every gap you measure joins a shared pool alongside everybody else’s, and once enough has come in it becomes a comparison — how your engine is wearing against the average for your model.",
  "pool.whatGoesLabel": "What goes:",
  "pool.whatGoes":
    "the model and year, the odometer, the month, and for each valve the gap you found, the shim that was in it and the gap you confirmed.",
  "pool.whatDoesntLabel": "What doesn’t:",
  "pool.whatDoesnt":
    "your name, your email, what you call your bike, or anything that ties a reading back to you — that link is deliberately missing, and it cannot be reconstructed later by anyone, including me.",
  "pool.retractLabel": "To take a reading back out",
  "pool.retract":
    ", delete its service within a month and it leaves the pool with it. After that the averages keep it, and deleting only removes it from your own history.",
  "pool.lastSent": "Last sent {ago}.",
  "pool.nothingSent": "Nothing sent yet — it goes up on the next sync.",

  // ---------------------------------------------------------------------
  // Language picker
  // ---------------------------------------------------------------------
  "language.heading": "Language",
  "language.change": "Change language",
  "language.unreviewed": "not yet checked by a rider who speaks it",
  "language.unreviewedShort": "unchecked",
} satisfies Dictionary;

export default en;
