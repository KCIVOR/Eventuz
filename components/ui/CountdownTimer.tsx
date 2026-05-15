"use client";

import { useEffect, useState, useCallback } from "react";

interface CountdownTimerProps {
  targetDate: string | Date;
  label?: string;
}

export function CountdownTimer({ targetDate, label = "Event begins in" }: CountdownTimerProps) {
  const calculateTimeLeft = useCallback(() => {
    const difference = +new Date(targetDate) - +new Date();
    let timeLeft = {
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
    };

    if (difference > 0) {
      timeLeft = {
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60),
      };
    }

    return timeLeft;
  }, [targetDate]);

  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, [calculateTimeLeft]);

  if (!isMounted) return null;

  const timerItems = [
    { label: "Days", value: timeLeft.days },
    { label: "Hours", value: timeLeft.hours },
    { label: "Mins", value: timeLeft.minutes },
    { label: "Secs", value: timeLeft.seconds },
  ];

  return (
    <div className="flex flex-col items-center gap-6 py-8">
      <p className="eyebrow text-[10px] text-accent-gold tracking-[0.4em] uppercase">{label}</p>
      <div className="flex gap-4 md:gap-8">
        {timerItems.map((item, index) => (
          <div key={item.label} className="flex flex-col items-center min-w-[60px] md:min-w-[80px]">
            <div className="relative group">
              <span className="font-serif text-3xl md:text-5xl font-light text-foreground mb-1 block">
                {String(item.value).padStart(2, "0")}
              </span>
              {index < timerItems.length - 1 && (
                <div className="absolute -right-2 md:-right-4 top-1/2 -translate-y-1/2 text-accent-gold/30 text-xl md:text-2xl font-light">
                  :
                </div>
              )}
            </div>
            <span className="text-[9px] uppercase tracking-widest text-warm-gray font-medium">
              {item.label}
            </span>
          </div>
        ))}
      </div>
      
      {/* Decorative dots */}
      <div className="flex gap-1.5 mt-2">
        <div className="h-1 w-1 rotate-45 bg-accent-gold/20" />
        <div className="h-1 w-1 rotate-45 bg-accent-gold/40" />
        <div className="h-1 w-1 rotate-45 bg-accent-gold/20" />
      </div>
    </div>
  );
}
