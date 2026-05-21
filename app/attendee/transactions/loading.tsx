import { RoleAreaShell } from "@/components/layout/RoleAreaShell";

const shimmer =
  "relative overflow-hidden before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_2s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/45 before:to-transparent";

export default function AttendeeTransactionsLoading() {
  return (
    <RoleAreaShell
      role="attendee"
      title="Transaction History"
      showPageHeader={false}
      compactTitle="Transaction History"
      layout="flush"
      mainWidth="wide"
    >
      <div
        className="mx-auto flex w-full max-w-3xl flex-col gap-10 px-4 pb-14 pt-10 sm:pt-16"
        role="status"
        aria-live="polite"
        aria-label="Loading transaction history"
      >
        <section className="overflow-hidden border border-[#EDE8E3] bg-white">
          <div className={`${shimmer} h-64 bg-[#F0E4CC] sm:h-72`} />
          <div className="flex flex-col items-center px-6 py-10 text-center">
            <div className={`${shimmer} h-4 w-24 bg-[#F7F4EF]`} />
            <div className={`${shimmer} mt-4 h-10 w-full max-w-md bg-[#E8E2DC]`} />
            <div className={`${shimmer} mt-4 h-4 w-full max-w-xs bg-[#F7F4EF]`} />
          </div>
        </section>

        <section className="border border-[#EDE8E3] bg-white px-6 py-8">
          <div className={`${shimmer} h-5 w-40 bg-[#EDE8E3]`} />
          <div className={`${shimmer} mt-5 h-4 w-72 max-w-full bg-[#F7F4EF]`} />
          <div className={`${shimmer} mt-6 h-4 w-56 max-w-full bg-[#F7F4EF]`} />
        </section>

        <section className="border border-dashed border-[#EDE8E3] bg-[#FDFAF4] px-6 py-10">
          <div className={`${shimmer} h-4 w-32 bg-[#F7F4EF]`} />
          <div className={`${shimmer} mt-5 h-16 w-full bg-white/80`} />
        </section>
      </div>
    </RoleAreaShell>
  );
}
