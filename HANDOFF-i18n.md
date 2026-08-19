# Hand-off: finishing the shim-calc translations

## Goal

Get every user-facing string out of the components and into the dictionaries,
**then** translate the sixteen languages.

**Extraction first — Andrew decided this on 2026-08-19, so do not reopen it.**
The alternative was populating the language dropdown sooner. It was rejected
because translating before extraction is finished lands each language at
roughly 85% and forces a second native-speaker review per language, and that
review is the expensive part, not the translating. Finish the English side, and
only then write the twelve missing languages in one consistent pass.

## Where things stand

Repo `C:\Users\andre\OneDrive\Documents\Claude\Code\shim-calc`, branch `main`,
live at shim-calc.vercel.app. Last three commits are this work:

- `aff6fc2` valve cards
- `fa01779` order list, summary, history, bike tabs
- `4faa1ad` charts (and a real number-formatting bug — see below)

Four dictionaries in `src/lib/i18n/messages/` — `en.ts`, `af.ts`, `de.ts`,
`fr.ts` — hold **234 keys each with identical key sets**. Afrikaans, German and
French are machine-translated and carry `reviewed: false` in
`src/lib/i18n/locales.ts`, which the language picker states on each row and
under the button. The other **twelve** of the sixteen planned languages do not exist yet, so the
picker does not offer them — it lists only what has a dictionary file, on
purpose. Still to write: `es it pt nl pl cs ru ja sv el tr da`. Each needs a
file in `src/lib/i18n/messages/` and a one-line loader entry in
`src/lib/i18n/dictionaries.ts`; the picker then shows it automatically.

**Done:** valve cards, order list, summary, history, bike tabs, charts, the
service sheet, sign-in, nav, footer, pool card, account, service items.

## What is left

| File | Lines | Note |
|---|---|---|
| `components/Compare.tsx` | 821 | one `t()` call in the whole file — effectively untranslated |
| `components/LegacyImport.tsx` | 377 | **another session's live work** |
| `app/notes/page.tsx` | 235 | long prose; see the rule about Kamanya's original notes |
| `components/ImportPrompt.tsx` | 189 | **another session's live work** |
| `components/ui.tsx` | 169 | `EmptyState` and friends |
| `components/ResetPassword.tsx` | 129 | |
| `components/SyncProvider.tsx` | 121 | |
| `components/VinGate.tsx` | 79 | |
| `components/AuthProvider.tsx` | 66 | just the pre-hydration "Loading…" |
| `app/*/page.tsx` | 7 each | `metadata.title` — the browser tab names, all English |

Suggested order: `ui`, `VinGate`, `ResetPassword`, `SyncProvider`, notes prose,
then `Compare` on its own. Leave the two import files alone for now.

Auth errors stay English whatever happens — they come back from Supabase via
`describe()` in `src/lib/auth.ts`, not from the dictionaries. Translating those
means having `auth.ts` return keys rather than sentences; a separate job.

## Conventions established — follow these

**Whole sentences with placeholders. Never a label glued to a value.** English
word order is not German or French word order.

**Key by permanent id, never by English text.** Valve names are
`valve.f-ex-l` … `valve.r-ex-r`, keyed off `position.id`, so renaming one on
screen cannot orphan a translation. Same for parts (`part.oil-50w`).

**Data layers carry ids; components translate them.** `ShoppingLine.valves` in
`src/lib/report.ts` holds valve ids, not labels, because only a component can
name them in the rider's language. The CSV export resolves them back to English
deliberately — that whole file including its column headings is English, and a
spreadsheet mailed to a workshop should read the same wherever it lands.

**One sentence per case, not a word dropped into a gap.** Where English swaps a
single word — looser/tighter, came out/went in, intake/exhaust — write a
separate key per case. German compounds *Einlassventile* into one word, so
there is no slot to drop "intake" into.

**Two counted things in one sentence:** only one count can drive a plural form.
Build the second as its own counted noun phrase and pass it in whole — see
`order.total` and `order.sizes`. But where the numbers read as bare tallies
rather than counted nouns, keep it one plain string — see `history.imported`.

**A number that needs its own styling:** put `{value}` in the message and split
on it rather than interpolating — see `withNumber()` in `ValveCard.tsx` and the
`valve.newClearance` key. Keeps the whole sentence in the dictionary so the
language decides where the number falls.

**Numbers and dates never go through `toLocaleString()`.** Always
`formatNumber` / `mm` / `formatDate` / `signedMm` from `src/lib/format.ts`,
which is the only thing that knows the active language. Two bare
`toLocaleString()` calls in `TrendChart.tsx` were showing Afrikaans riders
`66,666` where the rest of the app said `66 666`. Grep for it before finishing.

**`mm` stays untranslated** where it stands alone in the markup — it is the SI
symbol and identical in every language here.

**Accessible labels get translated too.** A chart's `aria-label` is read in
place of the picture and has to carry the same story.

**From `notes.ts`, Kamanya's original spreadsheet notes keep their English and
show the translation beneath** — that verbatim text is why the sheet was
trusted and passed round the forums. Applies to `NOTES`, not to the
step-by-step guide around it.

## Checks before every commit

```bash
cd "C:/Users/andre/OneDrive/Documents/Claude/Code/shim-calc"
npx tsc --noEmit && npx eslint src
```

Key parity across all four dictionaries — this must print `ok` three times:

```bash
cd "C:/Users/andre/OneDrive/Documents/Claude/Code/shim-calc"; for l in af de fr; do d=$(diff <(grep -oE '^  "[a-z][^"]*"' src/lib/i18n/messages/en.ts|sort) <(grep -oE '^  "[a-z][^"]*"' src/lib/i18n/messages/$l.ts|sort)); [ -z "$d" ] && echo "$l ok" || { echo "$l DIFF:"; echo "$d"; }; done
```

To see it running, the app needs a signed-in owner in localStorage:

```js
localStorage.setItem("shim-calc/owner/v1", JSON.stringify({userId:"local-preview",email:"preview@example.com"}));
localStorage.setItem("shim-calc/locale/v1", JSON.stringify("af"));
```

Clear both afterwards. Afrikaans is the best language to eyeball, because
Andrew has South African riders who can actually check the words.

## The thing that will bite you

**Two Claude sessions share this one folder.** A branch does not separate them —
one folder can only have one branch checked out, so branching drags the other
session onto your branch. On 18 Aug that put another session's two in-flight
lines into a commit while the file they needed stayed untracked, and the
production build failed on a missing module. Vercel kept the previous
deployment, so the site never broke.

So: **stage explicit paths, never `git add -A` or `git add .`**, re-read any
shared file just before staging it, and check `git status` for files that are
not yours. Commit to `main` — the other session does. There is a spare worktree
at `Code/shim-calc-import` on branch `legacy-import` if parallel work is needed.

After pushing, confirm the deploy actually built:

```bash
cd "C:/Users/andre/OneDrive/Documents/Claude/Code/shim-calc"; npx vercel ls shim-calc
```

## Andrew

Explain things as to a smart beginner and define jargon plainly. He is not a
git expert — say what a command does before suggesting it. Do not commit, push
or deploy unless asked. Do not spin up multi-agent workflows without asking.
