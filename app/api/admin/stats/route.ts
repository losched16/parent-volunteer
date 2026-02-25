// app/api/admin/stats/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getOne, getMany } from "@/lib/db";
import { getDefaultSchool } from "@/lib/db/schools";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const school = await getDefaultSchool();
    if (!school) return NextResponse.json({ error: "School not found" }, { status: 404 });

    const [
      parentCount,
      totalHours,
      upcomingEvents,
      avgHours,
      completedCount,
      recentSignups,
      hourDistribution,
    ] = await Promise.all([
      getOne<{ count: string }>("SELECT COUNT(*) as count FROM parents WHERE school_id = $1", [school.id]),
      getOne<{ total: string }>("SELECT COALESCE(SUM(total_hours_completed), 0) as total FROM parents WHERE school_id = $1", [school.id]),
      getOne<{ count: string }>("SELECT COUNT(*) as count FROM volunteer_opportunities WHERE school_id = $1 AND event_date >= CURRENT_DATE AND status = 'active'", [school.id]),
      getOne<{ avg: string }>("SELECT COALESCE(AVG(total_hours_completed), 0) as avg FROM parents WHERE school_id = $1", [school.id]),
      getOne<{ count: string }>(`SELECT COUNT(*) as count FROM parents WHERE school_id = $1 AND total_hours_completed >= $2`, [school.id, school.required_hours_per_year]),
      getMany(
        `SELECT s.*, p.first_name as parent_first_name, p.last_name as parent_last_name,
         vo.title as opportunity_title, vo.event_date as opportunity_date
         FROM signups s
         JOIN parents p ON s.parent_id = p.id
         JOIN volunteer_opportunities vo ON s.opportunity_id = vo.id
         WHERE p.school_id = $1
         ORDER BY s.created_at DESC LIMIT 10`,
        [school.id]
      ),
      getMany(
        `SELECT 
           CASE 
             WHEN total_hours_completed = 0 THEN '0 hours'
             WHEN total_hours_completed < 5 THEN '1-4 hours'
             WHEN total_hours_completed < 10 THEN '5-9 hours'
             WHEN total_hours_completed < 15 THEN '10-14 hours'
             WHEN total_hours_completed < 20 THEN '15-19 hours'
             ELSE '20+ hours'
           END as range,
           COUNT(*) as count
         FROM parents WHERE school_id = $1
         GROUP BY range
         ORDER BY MIN(total_hours_completed)`,
        [school.id]
      ),
    ]);

    const totalParents = parseInt(parentCount?.count || "0");
    const completedParents = parseInt(completedCount?.count || "0");
    const completionRate = totalParents > 0 ? Math.round((completedParents / totalParents) * 100) : 0;

    return NextResponse.json({
      total_parents: totalParents,
      total_hours: parseFloat(totalHours?.total || "0"),
      upcoming_events: parseInt(upcomingEvents?.count || "0"),
      avg_hours_per_parent: parseFloat(parseFloat(avgHours?.avg || "0").toFixed(1)),
      completion_rate: completionRate,
      completed_parents: completedParents,
      required_hours: school.required_hours_per_year,
      recent_signups: recentSignups,
      hour_distribution: hourDistribution,
    });
  } catch (error) {
    console.error("Stats error:", error);
    return NextResponse.json({ error: "Failed to load stats" }, { status: 500 });
  }
}
