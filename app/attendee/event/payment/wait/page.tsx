import { PaymentWaitingPanel } from "@/components/attendee/PaymentWaitingPanel";
import { RoleAreaShell } from "@/components/layout/RoleAreaShell";
import { loadPaymentWaitContext } from "@/lib/attendee/paymentWait";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

type Props = {
  searchParams: Promise<{
    order?: string;
    hitpay_return?: string;
  }>;
};

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Waiting for Payment - Eventuz",
  };
}

export default async function PaymentWaitPage({ searchParams }: Props) {
  const q = await searchParams;
  const ctx = await loadPaymentWaitContext(q.order);
  const next = q.order
    ? `/attendee/event/payment/wait?order=${encodeURIComponent(q.order)}`
    : "/attendee/event/payment/wait";

  if (!ctx.ok) {
    if (ctx.redirectToLogin) {
      redirect(`/login?next=${encodeURIComponent(next)}`);
    }

    return (
      <RoleAreaShell
        role="attendee"
        title="Payment status"
        layout="flush"
        mainWidth="wide"
        breadcrumbs={[
          { label: "My Event", href: "/attendee/event" },
          { label: "Payment status" },
        ]}
      >
        <div className="mx-auto max-w-lg text-center">
          <section className="panel-card p-8">
            <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-accent-gold">
              Payment status
            </p>
            <h1 className="mt-3 font-serif text-3xl font-light text-foreground">We could not find this payment</h1>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{ctx.message}</p>
            <Link href="/attendee/event" className="btn-eventuz-gold mt-6 px-8 py-4 text-sm">
              Back to dashboard
            </Link>
          </section>
        </div>
      </RoleAreaShell>
    );
  }

  if (["paid_unassigned", "partially_assigned", "completed"].includes(ctx.order.status)) {
    redirect(`/attendee/event/seats?order=${encodeURIComponent(ctx.order.id)}`);
  }

  return (
    <RoleAreaShell
      role="attendee"
      title="Payment status"
      layout="flush"
      mainWidth="wide"
      breadcrumbs={[
        { label: "My Event", href: "/attendee/event" },
        { label: "Payment status" },
      ]}
    >
      <PaymentWaitingPanel order={ctx.order} fromHitPay={q.hitpay_return === "1"} />
    </RoleAreaShell>
  );
}
