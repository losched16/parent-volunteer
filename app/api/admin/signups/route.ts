// app/api/admin/signups/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSignupsForOpportunity, markAttendance, getOpportunityById } from "@/lib/db/opportunities";
import { findParentById } from "@/lib/db/parents";
import { getDefaultSchool } from "@/lib/db/schools";
import { sendThankYouEmail, sendMilestoneEmail } from "@/lib/email";
import { updateGHLHours } from "@/lib/ghl";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const opportunityId = searchParams.get("opportunity_id");
    if (!opportunityId) {
      return NextResponse.json({ error: "opportunity_id required" }, { status: 400 });
    }

    const signups = await getSignupsForOpportunity(opportunityId);
    return NextResponse.json({ signups });
  } catch (error) {
    return NextResponse.json({ error: "Failed to load signups" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { signup_id, attended, hours_credit } = await request.json();
    if (!signup_id) {
      return NextResponse.json({ error: "signup_id required" }, { status: 400 });
    }

    const { signup, parentId } = await markAttendance(signup_id, attended, hours_credit || 0);

    // If marked as attended, send emails and sync GHL
    if (attended) {
      const parent = await findParentById(parentId);
      const school = await getDefaultSchool();
      
      if (parent && school) {
        const opportunity = await getOpportunityById(signup.opportunity_id);
        const requiredHours = school.required_hours_per_year;

        // Send thank you email
        if (opportunity) {
          sendThankYouEmail(
            parent,
            { title: opportunity.title, hours_credit: hours_credit },
            parent.total_hours_completed + hours_credit,
            requiredHours
          ).catch(console.error);
        }

        // Check milestones
        const newTotal = parent.total_hours_completed + hours_credit;
        const milestones = [5, 10, 15, 20];
        for (const milestone of milestones) {
          if (newTotal >= milestone && parent.total_hours_completed < milestone) {
            sendMilestoneEmail(parent, milestone, newTotal, requiredHours).catch(console.error);
          }
        }

        // Update GHL
        if (parent.ghl_contact_id) {
          updateGHLHours(parent.ghl_contact_id, newTotal, requiredHours).catch(console.error);
        }
      }
    }

    return NextResponse.json({ message: "Attendance updated", signup });
  } catch (error) {
    console.error("Attendance error:", error);
    return NextResponse.json({ error: "Failed to update attendance" }, { status: 500 });
  }
}
