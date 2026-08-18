import { CATALOGUES } from "@/lib/catalogues";
import { KTM_LC8 } from "@/lib/engines";
import { mm } from "@/lib/format";
import { AUTHOR, NOTES } from "@/lib/notes";
import { PageHeader } from "@/components/ui";

export const metadata = { title: "Notes" };

/**
 * Written in the order the job is done, not the order the maths runs. Most
 * services never get past step 2 on most valves, and the wording should make
 * that obvious rather than implying eight shim changes are coming.
 */
const STEPS = [
  {
    heading: "Measure every gap first",
    body: "Work round the valves with a feeler gauge and enter each gap on the Sheet. Nothing needs taking apart yet. The layout mimics the engine — front cylinder above, rear below, intakes and exhausts where they actually sit — so take care not to put an intake reading in an exhaust box.",
  },
  {
    heading: "Anything in tolerance is finished",
    body: "A gap inside spec turns green and says how far it sits from your preferred setting. Leave that valve alone. On a healthy engine most valves stop here, which is the whole hope of the exercise.",
  },
  {
    heading: "Only pull a shim the app has failed",
    body: "If a gap is out of tolerance it says which way and by how much, and asks for the shim. Take that one out from under the bucket, measure it, and enter it. You get the size to fit and the KTM and Harley-Davidson part numbers. The − and + buttons step through real sizes if you would rather sit nearer one end of the band.",
  },
  {
    heading: "Order what you need",
    body: "The Order tab adds up the shims by size with quantities, and leaves out the valves that did not need touching, so you are not ordering a shim you already have.",
  },
  {
    heading: "Fit them, then measure again",
    body: "Once the new shims are in, check each gap and put the real figure in Confirmed gap. It is often slightly over or under the predicted one — that is normal — and recording it means the next service starts from what the engine actually did.",
  },
  {
    heading: "Keep the record",
    body: "Summary shows what you found and what you set at that odometer reading, ready to print or export. History keeps every service and charts how each valve is drifting, which is the thing a paper record could never show you.",
  },
];

export default function Page() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-5">
      {/*
        Shares PageHeader with the other sheets purely so the language button
        lands in the same place here as everywhere else. The prose below is
        still English only — see the note in dictionaries.ts.
      */}
      <PageHeader
        title="Notes"
        subtitle="Read this before you trust anything on the other screens."
      />

      <section className="mt-5">
        <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-accent">
          How to use this
        </h2>
        <ol className="space-y-3">
          {STEPS.map((step, index) => (
            <li key={step.heading} className="flex gap-3">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent/15 text-[11px] font-bold text-accent">
                {index + 1}
              </span>
              <div>
                <h3 className="text-sm font-semibold">{step.heading}</h3>
                <p className="mt-0.5 text-sm leading-relaxed text-muted">
                  {step.body}
                </p>
              </div>
            </li>
          ))}
        </ol>
        <p className="mt-3 rounded-lg border border-line bg-surface p-3 text-sm leading-relaxed text-muted">
          <strong className="text-ink">Tight / Middle / Loose</strong> on the
          Sheet sets where in the tolerance band the app aims when it suggests a
          shim. It never fails a valve that is within spec — it only tells you
          how far the gap sits from where you like to run it. Note 3 below
          explains why intakes and exhausts want opposite ends.
        </p>
      </section>

      <section className="mt-6">
        <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-accent">
          Tolerances — {KTM_LC8.name} {KTM_LC8.subtitle}
        </h2>
        <dl className="grid grid-cols-2 gap-2.5">
          {(["intake", "exhaust"] as const).map((type) => (
            <div key={type} className="rounded-lg border border-line bg-surface p-3">
              <dt className="text-xs font-semibold capitalize text-muted">
                {type}
              </dt>
              <dd className="mt-0.5 font-mono text-lg font-bold tabular-nums">
                {mm(KTM_LC8.clearance[type].min)} – {mm(KTM_LC8.clearance[type].max)}
                {/* Explicit space, not just a margin — otherwise this copies
                    and reads aloud as "0.15mm". */}
                <> <span className="text-xs font-medium text-faint">mm</span></>
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="mt-6">
        <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-accent">
          The maths behind it
        </h2>
        <div className="space-y-2.5 text-sm leading-relaxed text-muted">
          <p>
            Add the shim that came out to the gap you measured and you get the
            space the cam leaves above the valve. That number does not change
            when you swap shims, which is what makes the whole thing work.
          </p>
          <pre className="overflow-x-auto rounded-lg border border-line bg-surface p-3 font-mono text-xs text-ink">
{`stack      = shim fitted + gap measured
new gap    = stack − new shim
ideal shim = stack − the gap you want`}
          </pre>
          <p>
            A thicker shim gives a smaller gap. Nothing else to it — check it
            yourself on any valve you like.
          </p>
        </div>
      </section>

      <section className="mt-6">
        <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-accent">
          Original notes
        </h2>
        <ol className="space-y-3">
          {NOTES.map((note, index) => (
            <li key={note.heading} className="flex gap-3">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-raised text-[11px] font-bold text-muted">
                {index + 1}
              </span>
              <div>
                <h3 className="text-sm font-semibold">{note.heading}</h3>
                <p className="mt-0.5 text-sm leading-relaxed text-muted">
                  {note.body}
                </p>
              </div>
            </li>
          ))}
        </ol>
        <p className="mt-3 text-sm text-faint">
          — {AUTHOR}. Reproduced from my original spreadsheet, unchanged.
        </p>
      </section>

      <section className="mt-6">
        <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-accent">
          Shim sizes available
        </h2>
        <div className="space-y-3">
          {KTM_LC8.catalogues.map((id) => {
            const cat = CATALOGUES[id];
            return (
              <div key={id} className="rounded-lg border border-line bg-surface p-3">
                <h3 className="text-sm font-semibold">{cat.brand}</h3>
                <p className="text-xs text-faint">{cat.note}</p>
                <p className="mt-1.5 text-xs text-muted">
                  {cat.sizes.length} sizes · {mm(cat.sizes[0].um)} to{" "}
                  {mm(cat.sizes[cat.sizes.length - 1].um)} mm
                </p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mt-6">
        <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-accent">
          Install it on your phone
        </h2>
        <ul className="space-y-1.5 text-sm leading-relaxed text-muted">
          <li>
            <strong className="text-ink">iPhone:</strong> open in Safari, tap
            Share, then &ldquo;Add to Home Screen&rdquo;.
          </li>
          <li>
            <strong className="text-ink">Android:</strong> open in Chrome, tap
            the menu, then &ldquo;Install app&rdquo; or &ldquo;Add to Home
            screen&rdquo;.
          </li>
        </ul>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Once installed it opens full screen and works with no signal. Your
          records are stored on the device — back them up from the History
          screen.
        </p>
      </section>

      <p className="mt-6 rounded-lg border border-line bg-surface p-3 text-xs leading-relaxed text-faint">
        Use of this calculator is at your own risk entirely. Check the maths,
        check your measurements, and recheck your clearances once everything is
        back together.
      </p>
    </div>
  );
}
