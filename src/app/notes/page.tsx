import { CATALOGUES } from "@/lib/catalogues";
import { KTM_LC8 } from "@/lib/engines";
import { mm } from "@/lib/format";
import { AUTHOR, NOTES } from "@/lib/notes";

export const metadata = { title: "Notes — Shim Calculator" };

export default function Page() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-5">
      <h1 className="text-xl font-bold tracking-tight">Notes</h1>
      <p className="mt-0.5 text-sm text-muted">
        Read this before you trust anything on the other screens.
      </p>

      <section className="mt-5">
        <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-accent">
          How it works
        </h2>
        <div className="space-y-2.5 text-sm leading-relaxed text-muted">
          <p>
            Measure the shim that came out and the gap you could fit a feeler
            gauge into. Add them together and you get the space the cam leaves
            above the valve — that number doesn&apos;t change when you swap
            shims, which is what makes the whole thing work.
          </p>
          <pre className="overflow-x-auto rounded-lg border border-line bg-surface p-3 font-mono text-xs text-ink">
{`stack          = shim fitted + clearance measured
new clearance  = stack − new shim
ideal shim     = stack − clearance you want`}
          </pre>
          <p>
            A thicker shim gives a smaller gap. The calculator finds the nearest
            shim anyone actually sells that lands you inside tolerance, and the{" "}
            <strong className="text-ink">−</strong> and{" "}
            <strong className="text-ink">+</strong> buttons step through the real
            sizes if you want to sit nearer one end of the band.
          </p>
        </div>
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
                <span className="ml-1 text-xs font-medium text-faint">mm</span>
              </dd>
            </div>
          ))}
        </dl>
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
