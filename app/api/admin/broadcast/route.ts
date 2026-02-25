// app/api/admin/broadcast/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAllParents } from "@/lib/db/parents";
import { getDefaultSchool } from "@/lib/db/schools";
import { getSignupsForOpportunity } from "@/lib/db/opportunities";
import { sendBroadcastEmail } from "@/lib/email";
import { z } from "zod";
export const dynamic = "force-dynamic";

const broadcastSchema = z.object({
  subject: z.string().min(1, "Subject is required"),
  body: z.string().min(1, "Message body is required"),
  target: z.enum(["all", "event", "low_hours"]),
  event_id: z.string().optional(),
  hours_threshold: z.number().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const data = broadcastSchema.parse(body);

    const school = await getDefaultSchool();
    if (!school) return NextResponse.json({ error: "School not found" }, { status: 404 });

    let recipients: { email: string; first_name: string; total_hours_completed: number }[] = [];

    if (data.target === "all") {
      recipients = await getAllParents(school.id);
    } else if (data.target === "event" && data.event_id) {
      const signups = await getSignupsForOpportunity(data.event_id);
      recipients = signups.map((s: any) => ({
        email: s.parent_email,
        first_name: s.parent_first_name,
        total_hours_completed: 0,
      }));
    } else if (data.target === "low_hours") {
      const allParents = await getAllParents(school.id);
      const threshold = data.hours_threshold || school.required_hours_per_year;
      recipients = allParents.filter((p) => p.total_hours_completed < threshold);
    }

    // Send emails (in batches to avoid overwhelming SMTP)
    let sent = 0;
    let failed = 0;

    for (const parent of recipients) {
      const hoursRemaining = Math.max(0, school.required_hours_per_year - parent.total_hours_completed);
      const success = await sendBroadcastEmail(
        parent.email,
        data.subject,
        data.body,
        parent.first_name,
        hoursRemaining
      );
      if (success) sent++;
      else failed++;

      // Small delay between emails
      await new Promise((r) => setTimeout(r, 100));
    }

    return NextResponse.json({
      message: `Broadcast sent to ${sent} recipients`,
      sent,
      failed,
      total: recipients.length,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    console.error("Broadcast error:", error);
    return NextResponse.json({ error: "Failed to send broadcast" }, { status: 500 });
  }
}
