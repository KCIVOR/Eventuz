import { PublicShell } from "@/components/layout/PublicShell";
import { PlaceholderNotice } from "@/components/ui/PlaceholderNotice";

export default function HomePage() {
  return (
    <PublicShell>
      <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent-gold">
          Weddings &amp; celebrations
        </p>
        <h1 className="font-serif text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
          Eventuz
        </h1>
        <p className="max-w-md text-base leading-relaxed text-muted-foreground">
          Public landing placeholder. Event setup, registration, and operations will
          plug in here in later phases.
        </p>
        <PlaceholderNotice label="Marketing / public event link landing" />
      </div>
    </PublicShell>
  );
}
