// app/api/admin/opportunities/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createOpportunity, getAllOpportunities, updateOpportunity, deleteOpportunity, getOpportunityById } from "@/lib/db/opportunities";
import { z } from "zod";
export const dynamic = "force-dynamic";

const opportunitySchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  event_date: z.string().min(1, "Date is required"),
  start_time: z.string().min(1, "Start time is required"),
  end_time: z.string().min(1, "End time is required"),
  hours_credit: z.number().min(0.5, "Hours must be at least 0.5"),
  total_slots: z.number().int().min(1, "Must have at least 1 slot"),
  location: z.string().min(1, "Location is required"),
  status: z.enum(["active", "inactive"]).optional().default("active"),
});

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const opportunities = await getAllOpportunities(session.user.school_id);
    return NextResponse.json({ opportunities });
  } catch (error) {
    return NextResponse.json({ error: "Failed to load opportunities" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const data = opportunitySchema.parse(body);

    const opportunity = await createOpportunity({
      school_id: session.user.school_id,
      ...data,
      created_by: session.user.id,
    });

    return NextResponse.json({ opportunity }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    console.error("Create opportunity error:", error);
    return NextResponse.json({ error: "Failed to create opportunity" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { id, ...rest } = body;
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    const data = opportunitySchema.parse(rest);
    const updated = await updateOpportunity(id, data);

    return NextResponse.json({ opportunity: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to update opportunity" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await request.json();
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    await deleteOpportunity(id);
    return NextResponse.json({ message: "Deleted successfully" });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete opportunity" }, { status: 500 });
  }
}
