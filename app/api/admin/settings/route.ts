// app/api/admin/settings/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDefaultSchool, updateSchool, getSettings, setSetting } from "@/lib/db/schools";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const school = await getDefaultSchool();
    if (!school) return NextResponse.json({ error: "School not found" }, { status: 404 });

    const settings = await getSettings(school.id);

    return NextResponse.json({
      school: {
        id: school.id,
        name: school.name,
        required_hours_per_year: school.required_hours_per_year,
        admin_email: school.admin_email,
        ghl_api_key: school.ghl_api_key ? "••••••" + school.ghl_api_key.slice(-4) : null,
        ghl_location_id: school.ghl_location_id,
      },
      settings,
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed to load settings" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const school = await getDefaultSchool();
    if (!school) return NextResponse.json({ error: "School not found" }, { status: 404 });

    // Update school fields
    const schoolUpdate: any = {};
    if (body.name) schoolUpdate.name = body.name;
    if (body.required_hours_per_year) schoolUpdate.required_hours_per_year = Number(body.required_hours_per_year);
    if (body.ghl_api_key && body.ghl_api_key !== "••••••") schoolUpdate.ghl_api_key = body.ghl_api_key;
    if (body.ghl_location_id) schoolUpdate.ghl_location_id = body.ghl_location_id;

    if (Object.keys(schoolUpdate).length > 0) {
      await updateSchool(school.id, schoolUpdate);
    }

    // Update settings
    if (body.settings) {
      for (const [key, value] of Object.entries(body.settings)) {
        await setSetting(school.id, key, String(value));
      }
    }

    return NextResponse.json({ message: "Settings updated" });
  } catch (error) {
    console.error("Settings update error:", error);
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}
