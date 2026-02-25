// app/api/admin/export/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAllParents } from "@/lib/db/parents";
import { getSignupsForOpportunity } from "@/lib/db/opportunities";
import { getDefaultSchool } from "@/lib/db/schools";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const opportunityId = searchParams.get("opportunity_id");

    const school = await getDefaultSchool();
    if (!school) return NextResponse.json({ error: "School not found" }, { status: 404 });

    let csv = "";

    if (type === "parents") {
      const parents = await getAllParents(school.id);
      csv = "First Name,Last Name,Email,Phone,Student Names,Hours Completed,Hours Required,Hours Remaining\n";
      for (const p of parents) {
        const remaining = Math.max(0, school.required_hours_per_year - p.total_hours_completed);
        csv += `"${p.first_name}","${p.last_name}","${p.email}","${p.phone}","${p.student_names}",${p.total_hours_completed},${school.required_hours_per_year},${remaining}\n`;
      }
    } else if (type === "signups" && opportunityId) {
      const signups = await getSignupsForOpportunity(opportunityId);
      csv = "First Name,Last Name,Email,Phone,Student Names,Signup Date,Attended,Hours Credited\n";
      for (const s of signups) {
        csv += `"${s.parent_first_name}","${s.parent_last_name}","${s.parent_email}","${s.parent_phone}","${s.parent_student_names}","${s.signup_date}",${s.attended},${s.hours_credited}\n`;
      }
    } else {
      return NextResponse.json({ error: "Invalid export type" }, { status: 400 });
    }

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="${type}_export_${new Date().toISOString().split("T")[0]}.csv"`,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}
