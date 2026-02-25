// app/api/cron/send-reminders/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getMany, query } from "@/lib/db";
import { sendEventReminder } from "@/lib/email";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret (for Vercel Cron Jobs)
    const authHeader = request.headers.get("authorization");
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Find events happening tomorrow with signups that haven't received reminders
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split("T")[0];

    const signups = await getMany(
      `SELECT s.id as signup_id, s.parent_id, p.email, p.first_name,
       vo.title, vo.event_date, vo.start_time, vo.end_time, vo.location
       FROM signups s
       JOIN parents p ON s.parent_id = p.id
       JOIN volunteer_opportunities vo ON s.opportunity_id = vo.id
       WHERE vo.event_date = $1 AND s.status = 'confirmed' AND s.reminder_sent = false`,
      [tomorrowStr]
    );

    let sent = 0;
    for (const signup of signups) {
      const success = await sendEventReminder(
        { email: signup.email, first_name: signup.first_name },
        {
          title: signup.title,
          event_date: signup.event_date,
          start_time: signup.start_time,
          end_time: signup.end_time,
          location: signup.location,
        }
      );

      if (success) {
        await query("UPDATE signups SET reminder_sent = true WHERE id = $1", [signup.signup_id]);
        sent++;
      }

      await new Promise((r) => setTimeout(r, 100));
    }

    return NextResponse.json({ message: `Sent ${sent} reminders`, total: signups.length });
  } catch (error) {
    console.error("Reminder cron error:", error);
    return NextResponse.json({ error: "Reminder cron failed" }, { status: 500 });
  }
}
