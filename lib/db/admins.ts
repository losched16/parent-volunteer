// lib/db/admins.ts
import { query, getOne, getMany } from "./index";
import { QueryResultRow } from "pg";

interface AdminUser extends QueryResultRow {
  id: string;
  school_id: string;
  email: string;
  password_hash: string;
  first_name: string;
  last_name: string;
  role: string;
  created_at: Date;
  updated_at: Date;
  last_login: Date | null;
}

export async function findAdminUserByEmail(email: string): Promise<AdminUser | null> {
  return getOne<AdminUser>(
    "SELECT * FROM admin_users WHERE email = $1",
    [email.toLowerCase()]
  );
}

export async function findAdminUserById(id: string): Promise<AdminUser | null> {
  return getOne<AdminUser>(
    "SELECT * FROM admin_users WHERE id = $1",
    [id]
  );
}

export async function getAllAdminUsers(schoolId: string): Promise<AdminUser[]> {
  return getMany<AdminUser>(
    "SELECT id, school_id, email, first_name, last_name, role, created_at, last_login FROM admin_users WHERE school_id = $1 ORDER BY created_at ASC",
    [schoolId]
  );
}

export async function createAdminUser(data: {
  school_id: string;
  email: string;
  password_hash: string;
  first_name: string;
  last_name: string;
}): Promise<AdminUser> {
  const result = await query<AdminUser>(
    `INSERT INTO admin_users (school_id, email, password_hash, first_name, last_name, role)
     VALUES ($1, $2, $3, $4, $5, 'admin')
     RETURNING *`,
    [data.school_id, data.email.toLowerCase(), data.password_hash, data.first_name, data.last_name]
  );
  return result.rows[0];
}

export async function deleteAdminUser(id: string, schoolId: string): Promise<boolean> {
  // Don't allow deleting super_admin
  const admin = await findAdminUserById(id);
  if (!admin || admin.role === "super_admin") return false;

  const result = await query(
    "DELETE FROM admin_users WHERE id = $1 AND school_id = $2 AND role != 'super_admin'",
    [id, schoolId]
  );
  return (result.rowCount || 0) > 0;
}

export async function updateAdminUserLogin(id: string): Promise<void> {
  await query("UPDATE admin_users SET last_login = NOW() WHERE id = $1", [id]);
}
