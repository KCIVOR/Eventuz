import type { ReactNode } from "react";
import { SiteFooter } from "./SiteFooter";
import { SiteHeader } from "./SiteHeader";

type Props = {
  children: ReactNode;
  layout?: "default" | "flush";
};

export function PublicShell({ children, layout = "default" }: Props) {
  const isFlush = layout === "flush";

  return (
    <div className="flex flex-1 flex-col" style={{ background: "var(--background)" }}>
      <SiteHeader layout={layout} />
      <main 
        className="flex flex-1 flex-col"
        style={!isFlush ? { background: "var(--alt-surface)" } : {}}
      >
        <div className={
          isFlush 
            ? "flex w-full flex-1 flex-col" 
            : "mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-10 sm:px-6 sm:py-16"
        }>
          {children}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
