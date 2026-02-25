// lib/db/schools.ts
import { getOne, getMany, query } from "./index";
import { School, AdminSetting } from "@/types";

export async function getSchoolById(id: string): Promise<School | null> {
  return getOne<School>("SELECT * FROM schools WHERE id = $1", [id]);
}

export async function getDefaultSchool(): Promise<School | null> {
  return getOne<School>("SELECT * FROM schools ORDER BY created_at ASC LIMIT 1");
}

export async function findAdminByEmail(email: string): Promise<School | null> {
  return getOne<School>(
    "SELECT * FROM schools WHERE admin_email = $1",
    [email.toLowerCase()]
  );
}

export async function updateSchool(id: string, data: Partial<School>): Promise<School | null> {
  const fields: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  if (data.name !== undefined) { fields.push(`name = $${paramIndex++}`); values.push(data.name); }
  if (data.required_hours_per_year !== undefined) { fields.push(`required_hours_per_year = $${paramIndex++}`); values.push(data.required_hours_per_year); }
  if (data.ghl_api_key !== undefined) { fields.push(`ghl_api_key = $${paramIndex++}`); values.push(data.ghl_api_key); }
  if (data.ghl_location_id !== undefined) { fields.push(`ghl_location_id = $${paramIndex++}`); values.push(data.ghl_location_id); }

  if (fields.length === 0) return getSchoolById(id);

  fields.push(`updated_at = NOW()`);
  values.push(id);

  return getOne<School>(
    `UPDATE schools SET ${fields.join(", ")} WHERE id = $${paramIndex} RETURNING *`,
    values
  );
}

export async function getSetting(schoolId: string, key: string): Promise<string | null> {
  const result = await getOne<AdminSetting>(
    "SELECT * FROM admin_settings WHERE school_id = $1 AND setting_key = $2",
    [schoolId, key]
  );
  return result?.setting_value || null;
}

export async function setSetting(schoolId: string, key: string, value: string): Promise<void> {
  await query(
    `INSERT INTO admin_settings (school_id, setting_key, setting_value)
     VALUES ($1, $2, $3)
     ON CONFLICT (school_id, setting_key) DO UPDATE SET setting_value = $3, updated_at = NOW()`,
    [schoolId, key, value]
  );
}

export async function getSettings(schoolId: string): Promise<Record<string, string>> {
  const rows = await getMany<AdminSetting>(
    "SELECT * FROM admin_settings WHERE school_id = $1",
    [schoolId]
  );
  const settings: Record<string, string> = {};
  rows.forEach((row) => { settings[row.setting_key] = row.setting_value; });
  return settings;
}
