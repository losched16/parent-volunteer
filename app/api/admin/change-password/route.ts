// app/api/admin/change-password/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { findAdminUserByEmail } from "@/lib/db/admins";
import { findAdminByEmail } from "@/lib/db/schools";
import { query } from "@/lib/db";
import bcrypt from "bcryptjs";
import { z } from "zod";

export const dynamic = "force-dynamic";

const changePasswordSchema = z.object({
  current_password: z.string().min(1, "Current password required"),
  new_password: z.string().min(8, "New password must be at least 8 characters"),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const data = changePasswordSchema.parse(body);

    // Check admin_users table first
    const adminUser = await findAdminUserByEmail(session.user.email);
    if (adminUser) {
      const isValid = await bcrypt.compare(data.current_password, adminUser.password_hash);
      if (!isValid) {
        return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
      }
      const newHash = await bcrypt.hash(data.new_password, 12);
      await query("UPDATE admin_users SET password_hash = $1, updated_at = NOW() WHERE id = $2", [newHash, adminUser.id]);
      return NextResponse.json({ message: "Password updated" });
    }

    // Fallback to schools table
    const school = await findAdminByEmail(session.user.email);
    if (school) {
      const isValid = await bcrypt.compare(data.current_password, school.admin_password_hash);
      if (!isValid) {
        return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
      }
      const newHash = await bcrypt.hash(data.new_password, 12);
      await query("UPDATE schools SET admin_password_hash = $1, updated_at = NOW() WHERE id = $2", [newHash, school.id]);
      // Also update admin_users if they exist there
      await query("UPDATE admin_users SET password_hash = $1, updated_at = NOW() WHERE email = $2", [newHash, session.user.email]).catch(() => {});
      return NextResponse.json({ message: "Password updated" });
    }

    return NextResponse.json({ error: "Admin not found" }, { status: 404 });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    console.error("Change password error:", error);
    return NextResponse.json({ error: "Failed to change password" }, { status: 500 });
  }
}
