// app/api/admin/parents/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAllParents, searchParents, findParentById, setParentHours, getParentHistory, getParentUpcomingSignups } from "@/lib/db/parents";
import { getDefaultSchool } from "@/lib/db/schools";
import { updateGHLHours } from "@/lib/ghl";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const parentId = searchParams.get("id");

    // Single parent detail
    if (parentId) {
      const parent = await findParentById(parentId);
      if (!parent) return NextResponse.json({ error: "Parent not found" }, { status: 404 });

      const [history, upcoming] = await Promise.all([
        getParentHistory(parentId),
        getParentUpcomingSignups(parentId),
      ]);

      const school = await getDefaultSchool();
      return NextResponse.json({
        parent,
        history,
        upcoming,
        required_hours: school?.required_hours_per_year || 20,
      });
    }

    // List all parents
    const school = await getDefaultSchool();
    if (!school) return NextResponse.json({ error: "School not found" }, { status: 404 });

    const parents = search
      ? await searchParents(school.id, search)
      : await getAllParents(school.id);

    return NextResponse.json({
      parents,
      required_hours: school.required_hours_per_year,
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed to load parents" }, { status: 500 });
  }
}

// Manually adjust hours
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { parent_id, hours } = await request.json();
    if (!parent_id || hours === undefined) {
      return NextResponse.json({ error: "parent_id and hours required" }, { status: 400 });
    }

    await setParentHours(parent_id, Math.max(0, Number(hours)));

    // Sync to GHL
    const parent = await findParentById(parent_id);
    const school = await getDefaultSchool();
    if (parent?.ghl_contact_id && school) {
      updateGHLHours(parent.ghl_contact_id, Number(hours), school.required_hours_per_year).catch(console.error);
    }

    return NextResponse.json({ message: "Hours updated" });
  } catch (error) {
    return NextResponse.json({ error: "Failed to update hours" }, { status: 500 });
  }
}
