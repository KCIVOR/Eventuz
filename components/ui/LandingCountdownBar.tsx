"use client";

import { useEffect, useState, useCallback } from "react";

interface LandingCountdownBarProps {
  targetDate: string | Date;
  minPrice?: number;
  className?: string;
}

export function LandingCountdownBar({ targetDate, minPrice, className = "" }: LandingCountdownBarProps) {
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
    const mountTimer = window.setTimeout(() => setIsMounted(true), 0);
    const timer = window.setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => {
      window.clearTimeout(mountTimer);
      window.clearInterval(timer);
    };
  }, [calculateTimeLeft]);

  if (!isMounted) return null;

  return (
    <div className={`countdown-bar ${className}`.trim()}>
      <div>
        <div className="cd-label mb-3">Event Countdown</div>
        <div className="cd-units">
          <div className="cd-unit">
            <span className="cd-num">{String(timeLeft.days).padStart(2, "0")}</span>
            <span className="cd-sub">Days</span>
          </div>
          <span className="cd-sep">:</span>
          <div className="cd-unit">
            <span className="cd-num">{String(timeLeft.hours).padStart(2, "0")}</span>
            <span className="cd-sub">Hours</span>
          </div>
          <span className="cd-sep">:</span>
          <div className="cd-unit">
            <span className="cd-num">{String(timeLeft.minutes).padStart(2, "0")}</span>
            <span className="cd-sub">Mins</span>
          </div>
          <span className="cd-sep">:</span>
          <div className="cd-unit">
            <span className="cd-num">{String(timeLeft.seconds).padStart(2, "0")}</span>
            <span className="cd-sub">Secs</span>
          </div>
        </div>
      </div>
      
      {minPrice !== undefined && (
        <div className="text-right">
          <div className="cd-label mb-1">Tickets Starting At</div>
          <div className="cd-price-tag">
            <strong>₱{minPrice.toLocaleString()}</strong>
          </div>
        </div>
      )}
    </div>
  );
}
