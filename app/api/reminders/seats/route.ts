import { NextResponse } from "next/server";
import { processSeatAssignmentReminders } from "@/lib/reminders/sendSeatAssignmentReminders";

/**
 * Trigger seat assignment reminders for all paid orders that haven't assigned seats yet.
 * In production, call this via a cron job (e.g. Vercel Cron).
 */
export async function GET(req: Request) {
  // Simple protection: check for a secret header
  const authHeader = req.headers.get("Authorization");
  const secret = process.env.CRON_SECRET;

  if (secret && authHeader !== `Bearer ${secret}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const result = await processSeatAssignmentReminders();
    return NextResponse.json({
      success: true,
      ...result
    });
  } catch (error: any) {
    console.error("[API Reminders] Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
