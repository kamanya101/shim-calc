"use client";

import type { ReactNode } from "react";
import { LanguageButton } from "./LanguageButton";

export type Tone = "ok" | "bad" | "warn" | "neutral";

const TONE_CLASS: Record<Tone, string> = {
  ok: "bg-ok/15 text-ok ring-ok/30",
  bad: "bg-bad/15 text-bad ring-bad/30",
  warn: "bg-warn/15 text-warn ring-warn/30",
  neutral: "bg-raised text-muted ring-line",
};

export function Chip({
  tone = "neutral",
  children,
}: {
  tone?: Tone;
  children: ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${TONE_CLASS[tone]}`}
    >
      {children}
    </span>
  );
}

/**
 * The top of every sheet, and the one place the language control lives.
 *
 * Putting it here rather than in each page means a new screen cannot be built
 * without it — the control is a property of "this is a page", not something
 * six components each have to remember. It renders nothing at all while
 * English is the only language available.
 */
export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <header className="mb-4 flex items-start justify-between gap-3">
      <div>
        <h1 className="text-xl font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-muted">{subtitle}</p>}
      </div>
      {/*
        The globe sits left of the page's own action, so it lands in the same
        spot on every screen instead of shuffling along as pages gain and lose
        buttons. shrink-0 keeps a long bike name from squeezing it away.
      */}
      <div className="flex shrink-0 items-center gap-2">
        <LanguageButton />
        {action}
      </div>
    </header>
  );
}

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-xl border border-line bg-surface ${className}`}
    >
      {children}
    </section>
  );
}

export function Button({
  children,
  onClick,
  variant = "default",
  type = "button",
  disabled,
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "default" | "accent" | "ghost" | "danger";
  type?: "button" | "submit";
  disabled?: boolean;
  className?: string;
}) {
  const base =
    "inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition-colors disabled:opacity-40 disabled:pointer-events-none";
  const variants = {
    default: "bg-raised text-ink ring-1 ring-line hover:bg-line",
    accent: "bg-accent text-black hover:bg-accent/85",
    ghost: "text-muted hover:text-ink hover:bg-raised",
    danger: "text-bad ring-1 ring-bad/40 hover:bg-bad/10",
  } as const;

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

/** A labelled segmented control — used for the aim setting. */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  label: string;
}) {
  return (
    <div
      className="inline-flex rounded-lg bg-bg p-0.5 ring-1 ring-line"
      role="group"
      aria-label={label}
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
          className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors ${
            value === option.value
              ? "bg-raised text-ink"
              : "text-faint hover:text-muted"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function EmptyState({
  title,
  children,
}: {
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-dashed border-line px-5 py-10 text-center">
      <p className="font-semibold text-muted">{title}</p>
      {children && <div className="mt-1.5 text-sm text-faint">{children}</div>}
    </div>
  );
}
