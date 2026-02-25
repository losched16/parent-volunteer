// app/api/parent/dashboard/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { findParentById, getParentUpcomingSignups, getParentHistory } from "@/lib/db/parents";
import { getDefaultSchool } from "@/lib/db/schools";
import { getMany } from "@/lib/db";
import { calculateRequiredHours, calculateRunningTotal, calculateBalanceDue, calculateBankedHours, getCurrentAcademicYear } from "@/lib/coop";

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
    const hoursPerStudent = parseFloat(school?.hours_per_student) || 12;
    const maxFamilyHours = parseFloat(school?.max_family_hours) || 30;
    const billingRate = parseFloat(school?.billing_rate_per_hour) || 30;
    const academicYear = getCurrentAcademicYear();

    // Calculate required hours based on student count (or use override)
    const requiredHours = parent.required_hours_override !== null && parent.required_hours_override !== undefined
      ? parseFloat(parent.required_hours_override)
      : calculateRequiredHours(parent.student_count || 1, hoursPerStudent, maxFamilyHours);

    // Get purchase credit hours
    const purchaseResult = await getMany(
      "SELECT COALESCE(SUM(hours_credited), 0) as total FROM purchase_credits WHERE parent_id = $1 AND academic_year = $2",
      [parent.id, academicYear]
    );
    const purchaseHours = parseFloat(purchaseResult[0]?.total) || 0;

    const volunteerHours = parseFloat(parent.total_hours_completed as any) || 0;
    const rolloverHours = parseFloat(parent.rollover_hours as any) || 0;
    const runningTotal = calculateRunningTotal(volunteerHours, purchaseHours, rolloverHours);
    const { hoursShort, amountDue } = calculateBalanceDue(requiredHours, runningTotal, billingRate);
    const bankedHours = calculateBankedHours(requiredHours, runningTotal);
    const progressPercentage = Math.min(100, Math.round((runningTotal / requiredHours) * 100));

    const [upcomingSignups, history] = await Promise.all([
      getParentUpcomingSignups(parent.id),
      getParentHistory(parent.id),
    ]);

    return NextResponse.json({
      parent: {
        id: parent.id,
        first_name: parent.first_name,
        last_name: parent.last_name,
        email: parent.email,
        phone: parent.phone,
        student_names: parent.student_names,
        student_count: parent.student_count || 1,
      },
      hours: {
        required: requiredHours,
        volunteer: volunteerHours,
        purchases: purchaseHours,
        rollover: rolloverHours,
        running_total: runningTotal,
        remaining: hoursShort,
        banked: bankedHours,
        progress_percentage: progressPercentage,
      },
      billing: {
        hours_short: hoursShort,
        rate_per_hour: billingRate,
        amount_due: amountDue,
      },
      academic_year: academicYear,
      // Legacy fields for backwards compatibility
      hours_completed: runningTotal,
      hours_required: requiredHours,
      hours_remaining: hoursShort,
      progress_percentage: progressPercentage,
      upcoming_signups: upcomingSignups,
      recent_history: history.slice(0, 10),
    });
  } catch (error) {
    console.error("Dashboard error:", error);
    return NextResponse.json({ error: "Failed to load dashboard" }, { status: 500 });
  }
}
