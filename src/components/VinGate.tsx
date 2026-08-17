"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import type { Bike } from "@/lib/types";
import { Card } from "./ui";

/**
 * What stands in for a bike's history and its comparison until the app knows
 * which motorcycle they belong to.
 *
 * The measurements are never withheld from the pool — they are saved and
 * counted from the first service, exactly as they always were. What waits on
 * the frame number is *reading them back*, because that is the half that has to
 * be trustworthy: two riders' copies of one machine, or one rider's two bikes,
 * are indistinguishable without an identifier, and either one silently becomes
 * a single wrong line on a chart.
 *
 * So this is a door, not a wall, and it is written to read like one. It states
 * how much is waiting, says plainly that nothing has been lost, gives the
 * reason as a fact about accuracy rather than a rule, and puts the way through
 * it one tap away. An empty panel saying "locked" would leave a rider assuming
 * their work had gone.
 */
export function VinGate({
  bike,
  services,
  opens,
  children,
}: {
  bike: Bike;
  /** How many services are waiting behind this. */
  services: number;
  /** What this particular screen would show: "history", "comparison". */
  opens: string;
  children?: ReactNode;
}) {
  if (bike.vin) return <>{children}</>;

  return (
    <Card className="p-4">
      <h2 className="text-sm font-bold text-ink">
        {services > 0
          ? `${services} ${services === 1 ? "service" : "services"} recorded, and safe`
          : "Nothing recorded yet"}
      </h2>

      <p className="mt-2 text-[13px] leading-relaxed text-muted">
        {services > 0 ? (
          <>
            Everything you have measured on <strong>{bike.name}</strong> is
            saved, and goes into the shared averages as normal. Adding the
            frame number is what opens the {opens}.
          </>
        ) : (
          <>
            Measure a service and it will be saved and counted straight away.
            Adding <strong>{bike.name}</strong>&rsquo;s frame number is what
            opens the {opens}.
          </>
        )}
      </p>

      <p className="mt-2 text-[13px] leading-relaxed text-faint">
        A history is only worth reading once the app is certain which
        motorcycle it belongs to. Without the number, one rider&rsquo;s two
        bikes — or two people&rsquo;s copies of the same one — are impossible to
        tell apart, and both end up as a single wrong line.
      </p>

      <Link
        href="/"
        className="mt-3 inline-block rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-bg transition-opacity hover:opacity-90"
      >
        Add the frame number
      </Link>
    </Card>
  );
}
