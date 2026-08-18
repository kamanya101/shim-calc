"use client";

import { useEffect, useState } from "react";
import { bikeTag, buildImportPrompt } from "@/lib/importPrompt";
import { downloadFile } from "@/lib/storage";
import { useRecords } from "./RecordsProvider";
import { Button } from "./ui";

/**
 * The Notes entry that hands a rider the instructions for turning their old
 * spreadsheets into something this app can read.
 *
 * The work itself happens somewhere else entirely — in whatever assistant the
 * rider already uses — and that is the point. Interpreting one person's decade
 * of private shorthand is not a thing an importer can be written to do, and it
 * is exactly what a conversation is good at. What the app owes them is a clear
 * brief to hand over, and then a hard look at whatever comes back.
 */
export function ImportPrompt() {
  const { ready, engine, bike } = useRecords();
  const [copied, setCopied] = useState(false);
  const [shown, setShown] = useState(false);

  const tag = bikeTag(bike.name);
  const prompt = buildImportPrompt(engine, tag);

  /**
   * Land on the section when the page is opened straight at it.
   *
   * The browser does its own jump on load, and by then this is not on the
   * page: everything below the sign-in gate waits for hydration to say who is
   * signed in, so the anchor appears a moment after the scroll that was meant
   * to find it. Following the link from inside the app works without this —
   * the app is already up — which is exactly why it would have gone unnoticed
   * until somebody shared the URL.
   *
   * Runs on mount, which is the moment the gate opened, and only for this
   * hash, so an ordinary visit to Notes still starts at the top.
   */
  useEffect(() => {
    if (window.location.hash !== "#import") return;
    document.getElementById("import")?.scrollIntoView();
  }, []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Clipboard access is refused often enough — an insecure origin, an
      // older phone, a locked-down browser — that failing silently would look
      // like a broken button. Opening the text lets them select it by hand.
      setShown(true);
    }
  };

  return (
    /*
     * Named so History can link straight here. This section sits a long way
     * down a long page, and a link that lands on the top of Notes reads as
     * having gone nowhere — the rider is left to guess that the thing they
     * were sent for is somewhere below the fold.
     *
     * The margin is what stops the heading landing flush against the top edge
     * of the screen, which looks like the page has been cut off.
     */
    <section id="import" className="mt-6 scroll-mt-4">
      <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-accent">
        If you want to import your Excel files
      </h2>

      <p className="text-sm leading-relaxed text-muted">
        If you have kept your services in a spreadsheet, you do not have to
        retype them. Copy the instructions below, hand them to an AI assistant
        along with your old files, and it will give you back something the app
        can read.
      </p>

      <ol className="mt-3 space-y-3">
        {[
          {
            heading: "Copy the instructions",
            body: "They are written for your bike, with the valve names and shim sizes this app expects.",
          },
          {
            heading: "Open Claude, ChatGPT, Grok or similar",
            body: "Paste the instructions in, then attach your spreadsheets.",
          },
          {
            heading: "It will ask how you stored things — tell it",
            body: "Two questions come first: how you recorded the odometer reading for each service, and how many files make up one service. Nobody can tell either from the files alone, and everybody did it differently — mine were in the filenames, yours might be in a cell, a folder name, or nowhere at all. Anything it still cannot find a reading for, the app asks you for at the end.",
          },
          {
            heading: "Answer its other questions",
            body: "It will ask about anything else it cannot work out — which column is which valve, what an abbreviation means. You know your sheets; it does not.",
          },
          {
            heading: "Copy its answer",
            body: "There will be a copy button on the block it gives you. You do not need to save a file or know what JSON is.",
          },
          {
            heading: "Paste it into the app",
            body: "History → Bring in your old spreadsheets. You will see exactly what is about to be added before anything is saved.",
          },
          {
            heading: "Check one service against the original sheet",
            body: "The app refuses numbers that are impossible. Only you can catch one that is merely wrong.",
          },
        ].map((step, index) => (
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

      {/*
        The prompt is built from the engine and the bike, so it cannot be
        rendered until the stores have been read. Before that the app does not
        know which motorcycle is selected, and a prompt tagged for the wrong
        one would send the rider round the whole loop to be told at the end
        that it did not match.
      */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button variant="accent" onClick={copy} disabled={!ready}>
          {copied ? "Copied" : "Copy the instructions"}
        </Button>
        <Button
          variant="ghost"
          disabled={!ready}
          onClick={() =>
            downloadFile(`shim-calc-import-${tag}.txt`, prompt, "text/plain")
          }
        >
          Download
        </Button>
        <Button variant="ghost" onClick={() => setShown((s) => !s)}>
          {shown ? "Hide" : "Read them"}
        </Button>
      </div>

      {ready && shown && (
        <pre className="mt-3 max-h-80 overflow-auto rounded-lg border border-line bg-surface p-3 font-mono text-[11px] leading-relaxed text-muted">
          {prompt}
        </pre>
      )}

      <div className="mt-3 space-y-2 text-sm leading-relaxed text-muted">
        <p>
          <strong className="text-ink">If it cannot open your files</strong> —
          open each sheet in Excel, <em>File → Save As → CSV</em>, and paste the
          text in instead. Every one of them can read that.
        </p>
        <p>
          <strong className="text-ink">
            If it can only take a few files at a time
          </strong>{" "}
          — give it three or four, paste that answer into the app, then go back
          for the next lot. They merge into one history.
        </p>
        <p>
          <strong className="text-ink">More than one bike?</strong> You choose
          which one you are importing into on the History screen, before you
          paste. Copy the instructions again from each bike as well — they come
          tagged, so the app can warn you if the two disagree.
        </p>
        <p>
          Do not include your frame number, or anything else personal, in what
          you upload.
        </p>
      </div>

      <p className="mt-3 rounded-lg border border-line bg-surface p-3 text-sm leading-relaxed text-muted">
        This is the roughest edge in the app. It works, but it leans on a tool
        that is not this one and it can get things wrong — which is why nothing
        is saved until you have seen it, and why imported services stay out of
        the shared averages until you say they are right.
      </p>
    </section>
  );
}
