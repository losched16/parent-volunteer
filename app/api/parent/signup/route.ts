// app/api/parent/signup/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createSignup, cancelSignup, getOpportunityById } from "@/lib/db/opportunities";
import { findParentById } from "@/lib/db/parents";
import { sendSignupConfirmation, sendCancellationConfirmation } from "@/lib/email";
import { getOne } from "@/lib/db";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "parent") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { opportunity_id } = await request.json();
    if (!opportunity_id) {
      return NextResponse.json({ error: "Opportunity ID required" }, { status: 400 });
    }

    const opportunity = await getOpportunityById(opportunity_id);
    if (!opportunity) {
      return NextResponse.json({ error: "Opportunity not found" }, { status: 404 });
    }

    const signup = await createSignup(opportunity_id, session.user.id);

    // Send confirmation email (non-blocking)
    const parent = await findParentById(session.user.id);
    if (parent) {
      sendSignupConfirmation(parent, opportunity).catch(console.error);
    }

    return NextResponse.json({ message: "Signed up successfully", signup });
  } catch (error: any) {
    if (error.message === "No slots available") {
      return NextResponse.json({ error: "This opportunity is full" }, { status: 409 });
    }
    if (error.message === "Already signed up for this opportunity") {
      return NextResponse.json({ error: "You're already signed up" }, { status: 409 });
    }
    console.error("Signup error:", error);
    return NextResponse.json({ error: "Failed to sign up" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "parent") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { signup_id } = await request.json();
    if (!signup_id) {
      return NextResponse.json({ error: "Signup ID required" }, { status: 400 });
    }

    // Get signup details before cancelling
    const signupDetails = await getOne(
      `SELECT s.*, vo.title, vo.event_date FROM signups s
       JOIN volunteer_opportunities vo ON s.opportunity_id = vo.id
       WHERE s.id = $1 AND s.parent_id = $2`,
      [signup_id, session.user.id]
    );

    await cancelSignup(signup_id, session.user.id);

    // Send cancellation email
    const parent = await findParentById(session.user.id);
    if (parent && signupDetails) {
      sendCancellationConfirmation(parent, signupDetails).catch(console.error);
    }

    return NextResponse.json({ message: "Signup cancelled" });
  } catch (error: any) {
    if (error.message === "Signup not found") {
      return NextResponse.json({ error: "Signup not found" }, { status: 404 });
    }
    console.error("Cancel error:", error);
    return NextResponse.json({ error: "Failed to cancel signup" }, { status: 500 });
  }
}
