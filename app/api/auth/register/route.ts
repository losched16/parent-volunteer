// app/api/auth/register/route.ts
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { findParentByEmail, createParent } from "@/lib/db/parents";
import { getDefaultSchool } from "@/lib/db/schools";
import { sendWelcomeEmail } from "@/lib/email";
import { syncParentToGHL } from "@/lib/ghl";

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  phone: z.string().min(1, "Phone number is required"),
  student_names: z.string().min(1, "Student name(s) required"),
  student_count: z.number().int().min(1).max(5).default(1),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = registerSchema.parse(body);

    // Check if parent already exists
    const existing = await findParentByEmail(data.email);
    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    // Get school
    const school = await getDefaultSchool();
    if (!school) {
      return NextResponse.json(
        { error: "School not configured" },
        { status: 500 }
      );
    }

    // Hash password
    const password_hash = await bcrypt.hash(data.password, 12);

    // Create parent
    const parent = await createParent({
      school_id: school.id,
      email: data.email,
      password_hash,
      first_name: data.first_name,
      last_name: data.last_name,
      phone: data.phone,
      student_names: data.student_names,
      student_count: data.student_count,
    });

    // Calculate required hours for this family
    const requiredHours = Math.min(data.student_count * (school.hours_per_student || 12), school.max_family_hours || 30);

    // Sync to GHL (non-blocking)
    syncParentToGHL(parent, requiredHours).then(async (ghlId) => {
      if (ghlId) {
        const { updateParentGHLContactId } = await import("@/lib/db/parents");
        await updateParentGHLContactId(parent.id, ghlId);
      }
    }).catch(console.error);

    // Send welcome email (non-blocking)
    sendWelcomeEmail(parent, requiredHours).catch(console.error);

    return NextResponse.json(
      { message: "Registration successful", parentId: parent.id },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Registration failed. Please try again." },
      { status: 500 }
    );
  }
}
