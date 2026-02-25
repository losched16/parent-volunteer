// app/api/parent/opportunities/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getActiveOpportunities } from "@/lib/db/opportunities";
import { getDefaultSchool } from "@/lib/db/schools";
import { getMany } from "@/lib/db";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "parent") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const school = await getDefaultSchool();
    if (!school) {
      return NextResponse.json({ error: "School not found" }, { status: 404 });
    }

    const opportunities = await getActiveOpportunities(school.id);

    // Get parent's existing signups
    const parentSignups = await getMany(
      "SELECT opportunity_id FROM signups WHERE parent_id = $1 AND status = 'confirmed'",
      [session.user.id]
    );
    const signedUpIds = new Set(parentSignups.map((s: any) => s.opportunity_id));

    const enriched = opportunities.map((opp) => ({
      ...opp,
      is_signed_up: signedUpIds.has(opp.id),
      is_full: opp.slots_remaining <= 0,
    }));

    return NextResponse.json({ opportunities: enriched });
  } catch (error) {
    console.error("Opportunities error:", error);
    return NextResponse.json({ error: "Failed to load opportunities" }, { status: 500 });
  }
}
