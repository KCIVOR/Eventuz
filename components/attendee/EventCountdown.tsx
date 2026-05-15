"use client";

import { useEffect, useMemo, useState } from "react";

type Props = {
  eventDate: string;
  eventTime: string;
};

type TimeLeft = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isPast: boolean;
};

function calculateTimeLeft(target: Date): TimeLeft {
  const diff = target.getTime() - Date.now();
  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, isPast: true };
  }

  return {
    days: Math.floor(diff / 86_400_000),
    hours: Math.floor((diff % 86_400_000) / 3_600_000),
    minutes: Math.floor((diff % 3_600_000) / 60_000),
    seconds: Math.floor((diff % 60_000) / 1_000),
    isPast: false,
  };
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

export function EventCountdown({ eventDate, eventTime }: Props) {
  const target = useMemo(() => new Date(`${eventDate}T${eventTime || "00:00"}`), [eventDate, eventTime]);
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(() => calculateTimeLeft(target));
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const interval = window.setInterval(() => {
      setTimeLeft(calculateTimeLeft(target));
    }, 1_000);

    return () => window.clearInterval(interval);
  }, [target]);

  const units = [
    { label: "Days", value: String(timeLeft.days) },
    { label: "Hours", value: pad(timeLeft.hours) },
    { label: "Minutes", value: pad(timeLeft.minutes) },
    { label: "Seconds", value: pad(timeLeft.seconds) },
  ];

  return (
    <section
      className="panel-card overflow-hidden p-0 shadow-lg shadow-accent-gold/[0.03]"
      aria-labelledby="event-countdown-heading"
    >
      <div className="border-b border-accent-gold/10 bg-accent-gold/[0.03] p-6 sm:p-8">
        <h2 id="event-countdown-heading" className="mb-1 font-serif text-2xl font-light text-foreground">
          Countdown
        </h2>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-accent-gold">
          {!isMounted ? "..." : timeLeft.isPast ? "Event day" : "Until the celebration"}
        </p>
      </div>
      <div className="grid grid-cols-4 gap-px bg-border/60">
        {units.map((unit) => (
          <div key={unit.label} className="bg-card px-2 py-5 text-center">
            <p className="font-serif text-3xl font-light tabular-nums text-foreground sm:text-4xl">
              {isMounted ? unit.value : "--"}
            </p>
            <p className="mt-1 text-[9px] font-semibold uppercase tracking-widest text-muted-foreground">
              {unit.label}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
