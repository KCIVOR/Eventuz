import type { ReactNode } from "react";
import Link from "next/link";
import { SiteFooter } from "./SiteFooter";

type Props = {
  title: string;
  children: ReactNode;
  backHref?: string;
  backLabel?: string;
};

export function AuthShell({ title, children, backHref, backLabel }: Props) {
  return (
    <div className="flex flex-1 flex-col">
      {/* Auth top bar — dark obsidian, same as dashboard header */}
      <div
        style={{
          background: "#1A1512",
          borderBottom: "1px solid rgba(201,169,110,0.2)",
          padding: "16px 24px",
        }}
      >
        <Link
          href="/"
          className="hover-gold-text"
          style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: "20px",
            fontWeight: 300,
            color: "#FDFAF4",
            textDecoration: "none",
            letterSpacing: "0.05em",
            transition: "color 0.2s",
          }}
        >
          Eventuz
        </Link>
      </div>

      {/* Main auth area — ivory background */}
      <main
        className="flex flex-1 flex-col items-center justify-center px-4 py-16"
        style={{ background: "#F7F4EF" }}
      >
        {/* Auth card — DS .modal-box style */}
        <div
          className="w-full"
          style={{
            maxWidth: "440px",
            background: "#fff",
            border: "1px solid #EDE8E3",
            borderRadius: "2px",
            padding: "36px 40px",
          }}
        >
          {backHref && backLabel ? (
            <p className="mb-5">
              <Link
                href={backHref}
                className="hover-gold-text"
                style={{
                  fontSize: "11px",
                  fontWeight: 500,
                  letterSpacing: "0.15em",
                  textTransform: "uppercase",
                  color: "#7A6E68",
                  textDecoration: "none",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  transition: "color 0.2s",
                }}
              >
                <span aria-hidden>←</span>
                {backLabel}
              </Link>
            </p>
          ) : null}

          {/* Ornament above title */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
            <span style={{ flex: 1, height: "1px", background: "linear-gradient(to right, transparent, #EDE8E3)" }} />
            <div style={{ width: "5px", height: "5px", background: "#C9A96E", transform: "rotate(45deg)", flexShrink: 0 }} />
            <span style={{ flex: 1, height: "1px", background: "linear-gradient(to left, transparent, #EDE8E3)" }} />
          </div>

          {/* Title — DS .modal-title */}
          <h1
            className="mb-6 text-center"
            style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: "28px",
              fontWeight: 300,
              color: "#1A1512",
            }}
          >
            {title}
          </h1>

          {children}
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
