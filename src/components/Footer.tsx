import { DONATE_HANDLE, DONATE_URL } from "@/lib/app";

/**
 * Sits at the end of every page, in normal flow above the fixed tab bar.
 * Deliberately quiet — this is a workshop tool people are using with the tank
 * off, not a storefront, and it stays out of the printed sheet.
 */
export function Footer() {
  return (
    <footer className="no-print mx-auto max-w-3xl px-4 pb-6 pt-2">
      <div className="rounded-xl border border-line bg-surface p-3 text-center">
        <p className="text-xs leading-relaxed text-muted">
          This calculator is free, and always will be. If you&apos;d like to buy
          a beer…
        </p>
        <a
          href={DONATE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2.5 inline-flex items-center gap-1.5 rounded-lg bg-raised px-3 py-2 text-sm font-semibold text-ink ring-1 ring-line transition-colors hover:bg-line"
        >
          Buy a beer
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M7 17 17 7M8 7h9v9" />
          </svg>
        </a>
        <p className="mt-1.5 font-mono text-[11px] text-faint">
          {DONATE_HANDLE}
        </p>
      </div>
    </footer>
  );
}
