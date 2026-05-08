import { PublicShell } from "@/components/layout/PublicShell";
import { PlaceholderNotice } from "@/components/ui/PlaceholderNotice";

export default function HomePage() {
  return (
    <PublicShell>
      <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-4xl">
          Eventuz
        </h1>
        <p className="max-w-md text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
          Public landing placeholder. Event setup, registration, and operations
          will plug in here in later phases.
        </p>
        <PlaceholderNotice label="Marketing / public event link landing" />
      </div>
    </PublicShell>
  );
}
