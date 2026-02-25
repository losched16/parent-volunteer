// app/api/admin/users/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAllAdminUsers, createAdminUser, deleteAdminUser } from "@/lib/db/admins";
import bcrypt from "bcryptjs";
import { z } from "zod";

export const dynamic = "force-dynamic";

const createAdminSchema = z.object({
  email: z.string().email("Valid email required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  first_name: z.string().min(1, "First name required"),
  last_name: z.string().min(1, "Last name required"),
});

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admins = await getAllAdminUsers(session.user.school_id);
    return NextResponse.json({ admins });
  } catch (error) {
    return NextResponse.json({ error: "Failed to load admins" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const data = createAdminSchema.parse(body);

    const password_hash = await bcrypt.hash(data.password, 12);

    const admin = await createAdminUser({
      school_id: session.user.school_id,
      email: data.email,
      password_hash,
      first_name: data.first_name,
      last_name: data.last_name,
    });

    return NextResponse.json({
      message: "Admin created",
      admin: { id: admin.id, email: admin.email, first_name: admin.first_name, last_name: admin.last_name },
    }, { status: 201 });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    if (error?.code === "23505") {
      return NextResponse.json({ error: "An admin with this email already exists" }, { status: 409 });
    }
    console.error("Create admin error:", error);
    return NextResponse.json({ error: "Failed to create admin" }, { status: 500 });
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

    const deleted = await deleteAdminUser(id, session.user.school_id);
    if (!deleted) {
      return NextResponse.json({ error: "Cannot delete this admin" }, { status: 403 });
    }

    return NextResponse.json({ message: "Admin deleted" });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete admin" }, { status: 500 });
  }
}
