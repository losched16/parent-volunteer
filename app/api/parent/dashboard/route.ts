// app/api/parent/dashboard/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { findParentById, getParentUpcomingSignups, getParentHistory } from "@/lib/db/parents";
import { getDefaultSchool } from "@/lib/db/schools";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "parent") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const parent = await findParentById(session.user.id);
    if (!parent) {
      return NextResponse.json({ error: "Parent not found" }, { status: 404 });
    }

    const school = await getDefaultSchool();
    const requiredHours = school?.required_hours_per_year || 20;

    const [upcomingSignups, history] = await Promise.all([
      getParentUpcomingSignups(parent.id),
      getParentHistory(parent.id),
    ]);

    const hoursCompleted = parent.total_hours_completed;
    const hoursRemaining = Math.max(0, requiredHours - hoursCompleted);
    const progressPercentage = Math.min(100, Math.round((hoursCompleted / requiredHours) * 100));

    return NextResponse.json({
      parent: {
        id: parent.id,
        first_name: parent.first_name,
        last_name: parent.last_name,
        email: parent.email,
        phone: parent.phone,
        student_names: parent.student_names,
      },
      hours_completed: hoursCompleted,
      hours_required: requiredHours,
      hours_remaining: hoursRemaining,
      progress_percentage: progressPercentage,
      upcoming_signups: upcomingSignups,
      recent_history: history.slice(0, 10),
    });
  } catch (error) {
    console.error("Dashboard error:", error);
    return NextResponse.json({ error: "Failed to load dashboard" }, { status: 500 });
  }
}
