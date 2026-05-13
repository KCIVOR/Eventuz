import { NextResponse } from "next/server";
import { processPreEventReminders } from "@/lib/reminders/sendEventReminders";

/**
 * Trigger pre-event reminders for all upcoming events (24-48h window).
 * In production, call this via a cron job (e.g. Vercel Cron).
 */
export async function GET(req: Request) {
  const authHeader = req.headers.get("Authorization");
  const secret = process.env.CRON_SECRET;

  if (secret && authHeader !== `Bearer ${secret}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const result = await processPreEventReminders();
    return NextResponse.json({
      success: true,
      ...result
    });
  } catch (error: any) {
    console.error("[API Event Reminders] Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
