// lib/db/parents.ts
import { query, getOne, getMany } from "./index";
import { Parent, SignupWithDetails } from "@/types";

export async function findParentByEmail(email: string): Promise<Parent | null> {
  return getOne<Parent>(
    "SELECT * FROM parents WHERE email = $1",
    [email.toLowerCase()]
  );
}

export async function findParentById(id: string): Promise<Parent | null> {
  return getOne<Parent>(
    "SELECT * FROM parents WHERE id = $1",
    [id]
  );
}

export async function createParent(data: {
  school_id: string;
  email: string;
  password_hash: string;
  first_name: string;
  last_name: string;
  phone: string;
  student_names: string;
  student_count?: number;
}): Promise<Parent> {
  const result = await query<Parent>(
    `INSERT INTO parents (school_id, email, password_hash, first_name, last_name, phone, student_names, student_count, total_hours_completed)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 0)
     RETURNING *`,
    [data.school_id, data.email.toLowerCase(), data.password_hash, data.first_name, data.last_name, data.phone, data.student_names, data.student_count || 1]
  );
  return result.rows[0];
}

export async function updateParentHours(parentId: string, hours: number): Promise<void> {
  await query(
    "UPDATE parents SET total_hours_completed = total_hours_completed + $1, updated_at = NOW() WHERE id = $2",
    [hours, parentId]
  );
}

export async function setParentHours(parentId: string, hours: number): Promise<void> {
  await query(
    "UPDATE parents SET total_hours_completed = $1, updated_at = NOW() WHERE id = $2",
    [hours, parentId]
  );
}

export async function updateParentGHLContactId(parentId: string, ghlContactId: string): Promise<void> {
  await query(
    "UPDATE parents SET ghl_contact_id = $1, updated_at = NOW() WHERE id = $2",
    [ghlContactId, parentId]
  );
}

export async function updateParentLogin(parentId: string): Promise<void> {
  await query(
    "UPDATE parents SET last_login = NOW() WHERE id = $1",
    [parentId]
  );
}

export async function updateParentProfile(parentId: string, data: {
  first_name: string;
  last_name: string;
  phone: string;
  student_names: string;
}): Promise<Parent | null> {
  return getOne<Parent>(
    `UPDATE parents SET first_name = $1, last_name = $2, phone = $3, student_names = $4, updated_at = NOW()
     WHERE id = $5 RETURNING *`,
    [data.first_name, data.last_name, data.phone, data.student_names, parentId]
  );
}

export async function getAllParents(schoolId: string): Promise<Parent[]> {
  return getMany<Parent>(
    "SELECT * FROM parents WHERE school_id = $1 ORDER BY last_name, first_name",
    [schoolId]
  );
}

export async function searchParents(schoolId: string, searchTerm: string): Promise<Parent[]> {
  const term = `%${searchTerm}%`;
  return getMany<Parent>(
    `SELECT * FROM parents WHERE school_id = $1 
     AND (first_name ILIKE $2 OR last_name ILIKE $2 OR email ILIKE $2 OR student_names ILIKE $2)
     ORDER BY last_name, first_name`,
    [schoolId, term]
  );
}

export async function getParentUpcomingSignups(parentId: string): Promise<SignupWithDetails[]> {
  return getMany<SignupWithDetails>(
    `SELECT s.*, vo.title as opportunity_title, vo.event_date as opportunity_date, 
     vo.location as opportunity_location, vo.hours_credit as opportunity_hours_credit,
     vo.start_time, vo.end_time
     FROM signups s
     JOIN volunteer_opportunities vo ON s.opportunity_id = vo.id
     WHERE s.parent_id = $1 AND s.status = 'confirmed' AND vo.event_date >= CURRENT_DATE
     ORDER BY vo.event_date ASC`,
    [parentId]
  );
}

export async function getParentHistory(parentId: string): Promise<SignupWithDetails[]> {
  return getMany<SignupWithDetails>(
    `SELECT s.*, vo.title as opportunity_title, vo.event_date as opportunity_date, 
     vo.location as opportunity_location, vo.hours_credit as opportunity_hours_credit
     FROM signups s
     JOIN volunteer_opportunities vo ON s.opportunity_id = vo.id
     WHERE s.parent_id = $1 AND (vo.event_date < CURRENT_DATE OR s.attended = true)
     ORDER BY vo.event_date DESC`,
    [parentId]
  );
}
