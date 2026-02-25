// lib/db/opportunities.ts
import { query, getOne, getMany, withTransaction } from "./index";
import { VolunteerOpportunity, Signup, SignupWithDetails } from "@/types";

export async function createOpportunity(data: {
  school_id: string;
  title: string;
  description: string;
  event_date: string;
  start_time: string;
  end_time: string;
  hours_credit: number;
  total_slots: number;
  location: string;
  created_by: string;
}): Promise<VolunteerOpportunity> {
  const result = await query<VolunteerOpportunity>(
    `INSERT INTO volunteer_opportunities 
     (school_id, title, description, event_date, start_time, end_time, hours_credit, total_slots, slots_remaining, location, status, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8, $9, 'active', $10)
     RETURNING *`,
    [data.school_id, data.title, data.description, data.event_date, data.start_time, data.end_time, data.hours_credit, data.total_slots, data.location, data.created_by]
  );
  return result.rows[0];
}

export async function updateOpportunity(id: string, data: {
  title: string;
  description: string;
  event_date: string;
  start_time: string;
  end_time: string;
  hours_credit: number;
  total_slots: number;
  location: string;
  status: string;
}): Promise<VolunteerOpportunity | null> {
  // Calculate new slots_remaining based on existing signups
  const signupCount = await getOne<{ count: string }>(
    "SELECT COUNT(*) as count FROM signups WHERE opportunity_id = $1 AND status = 'confirmed'",
    [id]
  );
  const confirmedSignups = parseInt(signupCount?.count || "0");
  const newSlotsRemaining = Math.max(0, data.total_slots - confirmedSignups);

  return getOne<VolunteerOpportunity>(
    `UPDATE volunteer_opportunities 
     SET title = $1, description = $2, event_date = $3, start_time = $4, end_time = $5,
         hours_credit = $6, total_slots = $7, slots_remaining = $8, location = $9, status = $10, updated_at = NOW()
     WHERE id = $11 RETURNING *`,
    [data.title, data.description, data.event_date, data.start_time, data.end_time, data.hours_credit, data.total_slots, newSlotsRemaining, data.location, data.status, id]
  );
}

export async function deleteOpportunity(id: string): Promise<void> {
  await withTransaction(async (client) => {
    await client.query("DELETE FROM signups WHERE opportunity_id = $1", [id]);
    await client.query("DELETE FROM volunteer_opportunities WHERE id = $1", [id]);
  });
}

export async function getOpportunityById(id: string): Promise<VolunteerOpportunity | null> {
  return getOne<VolunteerOpportunity>(
    "SELECT * FROM volunteer_opportunities WHERE id = $1",
    [id]
  );
}

export async function getActiveOpportunities(schoolId: string): Promise<VolunteerOpportunity[]> {
  return getMany<VolunteerOpportunity>(
    `SELECT * FROM volunteer_opportunities 
     WHERE school_id = $1 AND status = 'active' AND event_date >= CURRENT_DATE
     ORDER BY event_date ASC`,
    [schoolId]
  );
}

export async function getAllOpportunities(schoolId: string): Promise<VolunteerOpportunity[]> {
  return getMany<VolunteerOpportunity>(
    "SELECT * FROM volunteer_opportunities WHERE school_id = $1 ORDER BY event_date DESC",
    [schoolId]
  );
}

export async function getUpcomingOpportunities(schoolId: string): Promise<VolunteerOpportunity[]> {
  return getMany<VolunteerOpportunity>(
    `SELECT * FROM volunteer_opportunities 
     WHERE school_id = $1 AND event_date >= CURRENT_DATE
     ORDER BY event_date ASC`,
    [schoolId]
  );
}

// Signup operations
export async function createSignup(opportunityId: string, parentId: string): Promise<Signup | null> {
  return withTransaction(async (client) => {
    // Check slots
    const opp = await client.query(
      "SELECT * FROM volunteer_opportunities WHERE id = $1 FOR UPDATE",
      [opportunityId]
    );
    if (!opp.rows[0] || opp.rows[0].slots_remaining <= 0) {
      throw new Error("No slots available");
    }

    // Check for existing signup
    const existing = await client.query(
      "SELECT * FROM signups WHERE opportunity_id = $1 AND parent_id = $2 AND status = 'confirmed'",
      [opportunityId, parentId]
    );
    if (existing.rows.length > 0) {
      throw new Error("Already signed up for this opportunity");
    }

    // Create signup
    const signup = await client.query(
      `INSERT INTO signups (opportunity_id, parent_id, signup_date, status, attended, hours_credited, reminder_sent)
       VALUES ($1, $2, NOW(), 'confirmed', false, 0, false)
       RETURNING *`,
      [opportunityId, parentId]
    );

    // Decrease slots
    await client.query(
      "UPDATE volunteer_opportunities SET slots_remaining = slots_remaining - 1, updated_at = NOW() WHERE id = $1",
      [opportunityId]
    );

    return signup.rows[0];
  });
}

export async function cancelSignup(signupId: string, parentId: string): Promise<void> {
  await withTransaction(async (client) => {
    const signup = await client.query(
      "SELECT * FROM signups WHERE id = $1 AND parent_id = $2 AND status = 'confirmed' FOR UPDATE",
      [signupId, parentId]
    );
    if (!signup.rows[0]) {
      throw new Error("Signup not found");
    }

    await client.query(
      "UPDATE signups SET status = 'cancelled', updated_at = NOW() WHERE id = $1",
      [signupId]
    );

    await client.query(
      "UPDATE volunteer_opportunities SET slots_remaining = slots_remaining + 1, updated_at = NOW() WHERE id = $1",
      [signup.rows[0].opportunity_id]
    );
  });
}

export async function getSignupsForOpportunity(opportunityId: string): Promise<SignupWithDetails[]> {
  return getMany<SignupWithDetails>(
    `SELECT s.*, p.first_name as parent_first_name, p.last_name as parent_last_name,
     p.email as parent_email, p.phone as parent_phone, p.student_names as parent_student_names
     FROM signups s
     JOIN parents p ON s.parent_id = p.id
     WHERE s.opportunity_id = $1 AND s.status = 'confirmed'
     ORDER BY s.signup_date ASC`,
    [opportunityId]
  );
}

export async function markAttendance(
  signupId: string,
  attended: boolean,
  hoursCredit: number
): Promise<{ signup: Signup; parentId: string }> {
  return withTransaction(async (client) => {
    const signup = await client.query(
      "SELECT * FROM signups WHERE id = $1 FOR UPDATE",
      [signupId]
    );
    if (!signup.rows[0]) {
      throw new Error("Signup not found");
    }

    const previouslyAttended = signup.rows[0].attended;
    const previousHours = signup.rows[0].hours_credited;

    // Update signup
    await client.query(
      "UPDATE signups SET attended = $1, hours_credited = $2, updated_at = NOW() WHERE id = $3",
      [attended, attended ? hoursCredit : 0, signupId]
    );

    // Adjust parent hours
    if (attended && !previouslyAttended) {
      // Newly marked as attended
      await client.query(
        "UPDATE parents SET total_hours_completed = total_hours_completed + $1, updated_at = NOW() WHERE id = $2",
        [hoursCredit, signup.rows[0].parent_id]
      );
    } else if (!attended && previouslyAttended) {
      // Unmarked attendance
      await client.query(
        "UPDATE parents SET total_hours_completed = GREATEST(0, total_hours_completed - $1), updated_at = NOW() WHERE id = $2",
        [previousHours, signup.rows[0].parent_id]
      );
    } else if (attended && previouslyAttended && hoursCredit !== previousHours) {
      // Hours adjustment
      const diff = hoursCredit - previousHours;
      await client.query(
        "UPDATE parents SET total_hours_completed = GREATEST(0, total_hours_completed + $1), updated_at = NOW() WHERE id = $2",
        [diff, signup.rows[0].parent_id]
      );
    }

    const updatedSignup = await client.query("SELECT * FROM signups WHERE id = $1", [signupId]);
    return { signup: updatedSignup.rows[0], parentId: signup.rows[0].parent_id };
  });
}

export async function getParentSignupForOpportunity(opportunityId: string, parentId: string): Promise<Signup | null> {
  return getOne<Signup>(
    "SELECT * FROM signups WHERE opportunity_id = $1 AND parent_id = $2 AND status = 'confirmed'",
    [opportunityId, parentId]
  );
}
