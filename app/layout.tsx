import type { Metadata } from "next";
import { Cormorant_Garamond, Jost } from "next/font/google";
import "./globals.css";

// Jost for all body/UI text — exact match to DS (Jost: 300, 400, 500, 600)
const jost = Jost({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  display: "swap",
});

// Cormorant Garamond for all display/heading text — italic + light weights
const cormorant = Cormorant_Garamond({
  variable: "--font-serif",
  subsets: ["latin"],
  weight: ["300", "400", "600"],
  style: ["normal", "italic"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Eventuz",
  description: "Event registration, payments, seating, and check-in — MVP foundation.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${jost.variable} ${cormorant.variable} h-full`}
    >
      <body
        suppressHydrationWarning
        className="min-h-screen flex flex-col bg-background font-sans text-foreground"
      >
        {children}
      </body>
    </html>
  );
}
