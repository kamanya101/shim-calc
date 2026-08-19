import type { Dictionary } from "../translate";

/**
 * French. Translated from en.ts, not yet checked by a rider who speaks it —
 * `reviewed: false` in locales.ts, and the picker says so out loud.
 *
 * Workshop vocabulary, where the wrong word does real damage:
 *   shim            → pastille (pastille de réglage, under the bucket)
 *   valve clearance → jeu aux soupapes
 *   clearance / gap → jeu
 *   intake/exhaust  → admission / échappement
 *   frame number    → numéro de cadre
 *
 * Addressed as "tu" throughout, matching the English, which is one rider
 * talking to another rather than a manual talking to an owner.
 */
const fr = {
  // ---------------------------------------------------------------------
  // Shared
  // ---------------------------------------------------------------------
  "common.loading": "Chargement…",
  "common.choose": "Choisir…",
  "common.notSure": "Je ne sais pas",
  "common.optional": "facultatif",

  // ---------------------------------------------------------------------
  // Navigation
  // ---------------------------------------------------------------------
  "nav.sections": "Sections",
  "nav.sheet": "Fiche",
  "nav.order": "Commande",
  "nav.summary": "Récapitulatif",
  "nav.history": "Historique",
  "nav.compare": "Comparer",
  "nav.notes": "Notes",

  // ---------------------------------------------------------------------
  // Footer
  // ---------------------------------------------------------------------
  "footer.free":
    "Ce calculateur est gratuit, et le restera. Si tu veux offrir une bière…",
  "footer.donate": "Offrir une bière",

  // ---------------------------------------------------------------------
  // The sheet — bike details
  // ---------------------------------------------------------------------
  "sheet.newService": "Nouvel entretien",
  "sheet.bike": "Moto",
  "sheet.name": "Nom",
  "sheet.model": "Modèle",
  "sheet.year": "Année",
  "sheet.units": "Unités",
  "sheet.addBike": "Ajouter une autre moto",
  "sheet.namePlaceholder": "p. ex. L’orange",
  "sheet.nameHint":
    "Nom — propre à cette moto… pour ceux qui sont assez gourmands/avisés pour en avoir plusieurs",
  "sheet.removeBike": "supprimer cette moto",
  "sheet.removeBikeConfirm": {
    one: "Supprimer « {name} » et son unique entretien ? C’est irréversible.",
    other:
      "Supprimer « {name} » et l’ensemble de ses {count} entretiens ? C’est irréversible.",
  },

  // ---------------------------------------------------------------------
  // The sheet — this service
  // ---------------------------------------------------------------------
  "sheet.date": "Date",
  "sheet.odometer": "Compteur ({unit})",
  "sheet.odometerPlaceholder": "p. ex. 47504",
  "sheet.note": "Note (facultatif)",
  "sheet.notePlaceholder": "p. ex. relevé — avant réglage",

  // ---------------------------------------------------------------------
  // The sheet — status
  // ---------------------------------------------------------------------
  "sheet.measured": "{measured}/{total} mesurées",
  "sheet.good": "{count} correctes",
  "sheet.outOfSpec": "{count} hors tolérance",
  "sheet.needShims": {
    one: "{count} demande une pastille",
    other: "{count} demandent des pastilles",
  },
  "sheet.seeOrderList": "voir la liste de commande",

  // ---------------------------------------------------------------------
  // The sheet — aim
  // ---------------------------------------------------------------------
  "sheet.aimHeading": "Visée dans la plage",
  "sheet.aimWhy": "pourquoi ?",
  "sheet.aimFor": "Viser pour {type}",
  "aim.min": "Serré",
  "aim.middle": "Milieu",
  "aim.max": "Large",
  "valveType.intake": "admission",
  "valveType.exhaust": "échappement",

  "sheet.disclaimer":
    "Enregistré sur cet appareil au fur et à mesure. L’usage de ce calculateur se fait à tes risques et périls — vérifie tout avant de remonter.",

  // ---------------------------------------------------------------------
  // The valve cards
  // ---------------------------------------------------------------------
  "valve.f-ex-l": "Échappement avant gauche",
  "valve.f-ex-r": "Échappement avant droit",
  "valve.f-in-l": "Admission avant gauche",
  "valve.f-in-r": "Admission avant droite",
  "valve.r-in-l": "Admission arrière gauche",
  "valve.r-in-r": "Admission arrière droite",
  "valve.r-ex-l": "Échappement arrière gauche",
  "valve.r-ex-r": "Échappement arrière droit",

  "valve.clearanceLabel": "Jeu",
  "valve.shimLabel": "Pastille en place",
  "valve.confirmedLabel": "Jeu confirmé",

  "valve.clearanceBounds":
    "Les jeux sont bien en dessous de 1 mm. Tu voulais dire 0,12 par exemple ?",
  "valve.shimBounds":
    "Les pastilles font environ 2–3 mm. Tu voulais dire 2,35 par exemple ?",
  "valve.confirmedBounds": "Les jeux sont bien en dessous de 1 mm.",

  "valve.hintClearance":
    "Quelle cale d’épaisseur as-tu réussi à passer entre la came et le poussoir ? Note ta mesure ici, en millimètres.",
  "valve.hintShim":
    "Quelle pastille as-tu sortie de sous ce poussoir ? Mesure-la pour en être sûr et note le résultat ici, en millimètres.",
  "valve.hintIdeal":
    "C’est l’épaisseur de pastille qui mettrait le jeu exactement sur la cible pour cette soupape. Elle n’existe presque jamais — la suggestion en dessous est la taille réelle la plus proche.",
  "valve.hintNewClearance":
    "C’est le jeu que donne la pastille choisie. Est-il dans les tolérances de cette soupape ? Sinon, monte ou descends d’une taille.",
  "valve.hintConfirmed":
    "Une fois la nouvelle pastille en place, remesure le jeu et note le chiffre réel ici. Il est souvent un peu au-dessus ou en dessous du prévu — c’est normal. Le noter donne à l’entretien suivant un point de départ honnête.",

  "valve.measureFirst":
    "Mesure d’abord le jeu — {min}–{max} mm est dans la tolérance.",
  "valve.good": "bon — rien à changer",
  "valve.onTarget": "pile sur ta cible de {target} mm",
  "valve.looserThanTarget": "{delta} mm plus large que ta cible de {target} mm",
  "valve.tighterThanTarget":
    "{delta} mm plus serré que ta cible de {target} mm",
  "valve.tooTightBy": "trop serré de {by} mm",
  "valve.tooLooseBy": "trop large de {by} mm",
  "valve.outsideRange": "Hors de {min}–{max} mm — cette pastille doit sortir.",

  "valve.changeAnyway": "changer la pastille quand même",
  "valve.pullShim":
    "Sors la pastille, mesure-la et note-la ici pour obtenir la taille de remplacement.",
  "valve.noSuitableShim":
    "Aucune pastille du catalogue ne ramène cette soupape entre {min} et {max} mm. Vérifie tes mesures — une hauteur totale de {stack} mm sort de la plage normale.",
  "valve.ideal": "Idéal {size} mm",
  "valve.fitThis": "Monter cette pastille",
  "valve.thinner": "Pastille plus fine",
  "valve.thicker": "Pastille plus épaisse",
  "valve.newClearance": "Nouveau jeu {value} mm",
  "valve.inSpec": "dans la tolérance",
  "valve.outOfSpec": "hors tolérance",
  "valve.sameShimBack": "même pastille remontée",
  "valve.resetSuggested": "revenir à la suggestion",
  "valve.noSizeMade": "taille non fabriquée",
  "valve.confirmPrompt":
    "Une fois la nouvelle pastille en place, remesure et note ce que tu as vraiment obtenu.",
  "valve.confirmedInSpec": "confirmé dans la tolérance",
  "valve.confirmedOutOfSpec": "confirmé hors tolérance",
  "valve.exactlyPredicted": "exactement comme prévu",
  "valve.vsPredicted": "{delta} par rapport au prévu",

  // ---------------------------------------------------------------------
  // The sheet — frame number
  // ---------------------------------------------------------------------
  "vin.label": "Numéro de cadre (VIN)",
  "vin.hint": "17 caractères, sur la colonne de direction",
  "vin.placeholder": "VBK…",
  "vin.explain":
    "Ouvre l’historique de cette moto, ses courbes et la comparaison partagée — et c’est ainsi qu’un atelier, ou le prochain propriétaire, retrouvera la machine. Le fonds commun ne voit jamais qu’une version brouillée, jamais le numéro lui-même.",
  "vin.setYear": "Régler l’année sur {year}",

  // ---------------------------------------------------------------------
  // La fiche — où vit la moto
  // ---------------------------------------------------------------------
  "place.city": "Ville",
  "place.region": "Région",
  "place.country": "Pays",
  "place.explain":
    "Où vit la moto, car c’est contre cela que ses soupapes s’usent. Seul le pays parvient à la comparaison partagée, et toujours regroupé avec d’autres — la ville reste ici, chez vous.",
  "place.use": "Utiliser {place}",

  // ---------------------------------------------------------------------
  // Also replaced
  // ---------------------------------------------------------------------
  "items.heading": "Également remplacé",
  "items.ticked": "{count} cochés",
  "items.hint":
    "Coche ce qui a été monté lors de cet entretien. Laissé vide veut simplement dire « pas cette fois » — rien ici n’est obligatoire.",

  // The parts themselves. Ids are permanent and English; only these move.
  "part.oil": "Huile (tout indice)",
  "part.oil-50w": "Huile 50W",
  "part.oil-60w": "Huile 60W",
  "part.air-filter": "Filtre à air",
  "part.oil-filter": "Filtre à huile",
  "part.coolant": "Liquide de refroidissement",
  "part.chain": "Chaîne",
  "part.front-sprocket": "Pignon de sortie de boîte",
  "part.rear-sprocket": "Couronne",
  "part.front-pads": "Plaquettes avant",
  "part.rear-pads": "Plaquettes arrière",
  "part.battery": "Batterie",
  "part.clutch-plates": "Disques d’embrayage",
  "part.engine-parts": "Pièces moteur",
  "part.chassis-parts": "Pièces de partie-cycle",

  // ---------------------------------------------------------------------
  // Elapsed time
  // ---------------------------------------------------------------------
  "time.never": "pas encore",
  "time.justNow": "à l’instant",
  "time.minutes": { one: "il y a {count} min", other: "il y a {count} min" },
  "time.hours": { one: "il y a {count} h", other: "il y a {count} h" },
  "time.days": { one: "il y a {count} jour", other: "il y a {count} jours" },

  // ---------------------------------------------------------------------
  // Switching between bikes
  // ---------------------------------------------------------------------
  "bikeTabs.label": "Motos",
  "bikeTabs.unnamed": "Moto sans nom",

  // ---------------------------------------------------------------------
  // Shims to order
  // ---------------------------------------------------------------------
  "order.heading": "Pastilles à commander",
  "order.emptyTitle": "Rien à commander",
  "order.emptyBody":
    "Soit aucune soupape n’est encore mesurée, soit chacune a déjà la bonne pastille.",
  "order.sizes": { one: "{count} taille", other: "{count} tailles" },
  "order.total": {
    one: "{count} pastille en {sizes}.",
    other: "{count} pastilles en {sizes}.",
  },
  "order.exportCsv": "Exporter cet entretien (CSV)",
  "order.backupJson": "Tout sauvegarder (JSON)",
  "order.print": "Imprimer",
  "order.ktmNote":
    "KTM ne fabrique que des pas de 0,05 mm à partir de 2,30 mm. Là où une taille n’a pas de référence KTM, la pastille Harley-Davidson est la même pièce pour cet usage — et souvent moins chère.",

  // ---------------------------------------------------------------------
  // The summary
  // ---------------------------------------------------------------------
  "summary.heading": "Récapitulatif",
  "summary.empty":
    "Mesure quelques soupapes sur la Fiche et elles apparaîtront ici.",

  "summary.colValve": "Soupape",
  "summary.colShim": "Pastille",
  "summary.colGap": "Jeu",
  "summary.colPredicted": "Prévu",

  "summary.foundHeading": "Pastilles et jeux relevés",
  "summary.foundCaption":
    "Ce qui est sorti du moteur, et le jeu avec lequel il tournait.",
  "summary.tight": "serré",
  "summary.loose": "large",

  "summary.setHeading": "Pastilles et jeux réglés",
  "summary.setCaptionConfirmed":
    "Ce qui est monté, et le jeu que tu as réellement mesuré ensuite.",
  "summary.setCaptionPredicted":
    "Ce qui est monté, et le jeu que le calcul prévoit. Note les jeux confirmés sur la Fiche une fois le moteur remonté.",
  "summary.leftAlone": "non touchée",
  "summary.confirmed": "confirmé",
  "summary.predicted": "prévu",
  "summary.legend":
    "« Non touchée » veut dire que le jeu était dans la tolérance et que la pastille n’a jamais été dérangée : le jeu affiché est donc celui avec lequel le moteur tournait déjà. ↺ veut dire que la pastille est sortie mais que la même taille est remontée. Les chiffres entre parenthèses sont prévus, pas mesurés.",

  "summary.driftHeading": "Confirmé par rapport au prévu",
  "summary.driftBody":
    "Normal — la tolérance d’épaisseur de la pastille et la façon dont le poussoir se met en place jouent toutes deux. C’est noté pour que l’entretien suivant parte de ce que le moteur a réellement fait, et non de ce que disait le calcul.",

  // ---------------------------------------------------------------------
  // History
  // ---------------------------------------------------------------------
  "history.heading": "Historique",
  "history.forBike": "Entretiens de {name}",
  "history.thisBike": "cette moto",
  "history.allServices": "Tous les entretiens enregistrés sur cet appareil",

  "history.driftHeading": "Épaisseur des pastilles dans le temps",
  "history.perValveHeading": "Épaisseur des pastilles, soupape par soupape",
  "history.servicesHeading": "Entretiens",

  "history.open": "ouvert",
  "history.importedChip": "importé",
  "history.nextService": "Entretien suivant",
  "history.delete": "Supprimer",
  "history.deleteConfirm":
    "Supprimer l’entretien à {odometer} ? C’est irréversible.",

  "history.accountHeading": "Compte",
  "history.backupHeading": "Sauvegarde",
  "history.backupBody":
    "Tes entretiens sont sur cet appareil et sur le serveur, sous ton compte. Un export est la copie qui ne dépend ni de l’un ni de l’autre — garde-en une en lieu sûr.",
  "history.exportAll": "Tout exporter",
  "history.importBackup": "Importer une sauvegarde",
  "history.imported": "Importé — {added} nouveaux, {merged} mis à jour.",

  // ---------------------------------------------------------------------
  // Signing in
  // ---------------------------------------------------------------------
  "signIn.blurb":
    "Connecte-toi une fois et ton historique de jeux te suit sur tous les appareils que tu utilises. Ensuite l’application fonctionne hors ligne — installe-la à la maison, sers-t’en là où est la moto.",
  "signIn.offline":
    "Tu es hors ligne. La première connexion demande du réseau — plus rien après.",
  "signIn.email": "E-mail",
  "signIn.password": "Mot de passe",
  "signIn.passwordHint": "Au moins 8 caractères.",
  "signIn.forgotBlurb":
    "On t’envoie un lien par e-mail pour en définir un nouveau. Tes entretiens restent exactement où ils sont.",
  "signIn.confirmSent":
    "Compte créé. Cherche le lien de confirmation dans tes e-mails, puis reviens te connecter.",
  "signIn.resetSent":
    "Si un compte existe à cette adresse, un lien est en route. Il ne marche qu’une fois, et seulement pendant une heure environ.",
  "signIn.busy": "Un instant…",
  "signIn.submitIn": "Se connecter",
  "signIn.submitUp": "Créer un compte",
  "signIn.submitForgot": "Envoie-moi un lien",
  "signIn.toSignUp": "Pas encore de compte ? En créer un",
  "signIn.toSignIn": "Déjà un compte ? Se connecter",
  "signIn.forgot": "Mot de passe oublié ?",

  // ---------------------------------------------------------------------
  // Account and sync
  // ---------------------------------------------------------------------
  "account.syncsHere": "Tes entretiens se synchronisent avec ce compte.",
  "account.syncNow": "Synchroniser maintenant",
  "account.signOut": "Se déconnecter",

  "sync.syncing": "Synchronisation…",
  "sync.syncedAgo": "Synchronisé {ago}",
  "sync.lastSyncedAgo": "Dernière synchronisation {ago}",
  "sync.offline": "Hors ligne",
  "sync.offlineDetail":
    "Tes modifications sont enregistrées ici et partiront dès que tu auras du réseau.",
  "sync.authExpired": "Se reconnecter",
  "sync.authExpiredDetail":
    "Tu es connecté sur cet appareil depuis assez longtemps pour que le serveur réclame une nouvelle connexion. Rien n’est perdu — tes relevés sont là, et ils se synchroniseront dès que ce sera fait.",
  "sync.noBackend": "Pas de serveur",
  "sync.noBackendDetail":
    "Cette installation n’a pas de synchronisation configurée. L’export est ta sauvegarde.",
  "sync.failed": "Échec de la synchronisation",
  "sync.failedDetail":
    "Tes relevés sont en sécurité sur cet appareil. Réessaie dans un instant.",

  // ---------------------------------------------------------------------
  // The shared pool
  // ---------------------------------------------------------------------
  "pool.heading": "Données d’usure partagées",
  "pool.subheading": "Comment cette application construit ses moyennes.",
  "pool.readings": {
    one: "{formatted} relevé",
    other: "{formatted} relevés",
  },
  "pool.why":
    "L’historique d’une seule moto est un échantillon trop mince pour montrer comment ces moteurs s’usent. Alors chaque jeu que tu mesures rejoint un fonds commun aux côtés de celui de tous les autres, et quand il y en a assez, cela devient une comparaison — comment ton moteur s’use par rapport à la moyenne de ton modèle.",
  "pool.whatGoesLabel": "Ce qui part :",
  "pool.whatGoes":
    "le modèle et l’année, le kilométrage, le mois, et pour chaque soupape le jeu relevé, la pastille qui s’y trouvait et le jeu confirmé.",
  "pool.whatDoesntLabel": "Ce qui ne part pas :",
  "pool.whatDoesnt":
    "ton nom, ton adresse e-mail, le petit nom de ta moto, ni rien qui relie un relevé à toi — ce lien manque délibérément, et personne ne peut le reconstituer ensuite, moi compris.",
  "pool.retractLabel": "Pour retirer un relevé",
  "pool.retract":
    ", supprime son entretien dans le mois et il quitte le fonds commun avec lui. Passé ce délai, les moyennes le gardent, et le supprimer ne l’enlève plus que de ton propre historique.",
  "pool.lastSent": "Dernier envoi {ago}.",
  "pool.nothingSent":
    "Rien d’envoyé pour l’instant — cela partira à la prochaine synchronisation.",

  // ---------------------------------------------------------------------
  // Language picker
  // ---------------------------------------------------------------------
  "language.heading": "Langue",
  "language.change": "Changer de langue",
  "language.unreviewed":
    "pas encore vérifié par un motard dont c’est la langue",
  "language.unreviewedShort": "non vérifié",
} satisfies Dictionary;

export default fr;
