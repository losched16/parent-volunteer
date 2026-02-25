// app/api/admin/coop/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { query, getOne, getMany } from "@/lib/db";
import { purchaseToHours, calculateRequiredHours, calculateRunningTotal, calculateBalanceDue, calculateBankedHours, getCurrentAcademicYear } from "@/lib/coop";
import { z } from "zod";

export const dynamic = "force-dynamic";

// Log a purchase credit
const purchaseSchema = z.object({
  parent_id: z.string().uuid(),
  amount_spent: z.number().positive("Amount must be greater than 0"),
  description: z.string().min(1, "Description required"),
  receipt_url: z.string().optional(),
});

// Manual hour adjustment
const adjustmentSchema = z.object({
  parent_id: z.string().uuid(),
  hours: z.number(),
  adjustment_type: z.enum(["rollover", "manual_credit", "manual_debit", "purchase_credit"]),
  description: z.string().min(1, "Description required"),
});

// Override required hours
const overrideSchema = z.object({
  parent_id: z.string().uuid(),
  required_hours_override: z.number().nullable(),
  student_count: z.number().int().min(1).optional(),
  rollover_hours: z.number().min(0).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const parentId = searchParams.get("parent_id");
    const type = searchParams.get("type");
    const academicYear = searchParams.get("academic_year") || getCurrentAcademicYear();

    if (type === "billing_summary") {
      // Get billing summary for all families
      const school = await getOne("SELECT * FROM schools WHERE id = $1", [session.user.school_id]);
      const parents = await getMany(
        `SELECT p.*, 
          COALESCE((SELECT SUM(pc.hours_credited) FROM purchase_credits pc WHERE pc.parent_id = p.id AND pc.academic_year = $2), 0) as purchase_hours
        FROM parents p WHERE p.school_id = $1 ORDER BY p.last_name, p.first_name`,
        [session.user.school_id, academicYear]
      );

      const summary = parents.map((p: any) => {
        const requiredHours = p.required_hours_override !== null
          ? parseFloat(p.required_hours_override)
          : calculateRequiredHours(p.student_count || 1, parseFloat(school.hours_per_student), parseFloat(school.max_family_hours));
        const purchaseHours = parseFloat(p.purchase_hours) || 0;
        const volunteerHours = parseFloat(p.total_hours_completed) || 0;
        const rollover = parseFloat(p.rollover_hours) || 0;
        const runningTotal = calculateRunningTotal(volunteerHours, purchaseHours, rollover);
        const { hoursShort, amountDue } = calculateBalanceDue(requiredHours, runningTotal, parseFloat(school.billing_rate_per_hour));
        const banked = calculateBankedHours(requiredHours, runningTotal);

        return {
          ...p,
          required_hours: requiredHours,
          volunteer_hours: volunteerHours,
          purchase_hours: purchaseHours,
          rollover_hours: rollover,
          running_total: runningTotal,
          hours_short: hoursShort,
          amount_due: amountDue,
          banked_hours: banked,
          progress_pct: Math.min(100, Math.round((runningTotal / requiredHours) * 100)),
        };
      });

      return NextResponse.json({
        summary,
        academic_year: academicYear,
        school_settings: {
          hours_per_student: school.hours_per_student,
          max_family_hours: school.max_family_hours,
          billing_rate: school.billing_rate_per_hour,
        },
      });
    }

    if (parentId) {
      // Get purchase credits for a specific parent
      const purchases = await getMany(
        "SELECT * FROM purchase_credits WHERE parent_id = $1 AND academic_year = $2 ORDER BY created_at DESC",
        [parentId, academicYear]
      );
      const adjustments = await getMany(
        "SELECT * FROM hour_adjustments WHERE parent_id = $1 AND academic_year = $2 ORDER BY created_at DESC",
        [parentId, academicYear]
      );
      const billing = await getMany(
        "SELECT * FROM billing_records WHERE parent_id = $1 AND academic_year = $2 ORDER BY created_at DESC",
        [parentId, academicYear]
      );

      return NextResponse.json({ purchases, adjustments, billing });
    }

    return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
  } catch (error) {
    console.error("Co-op GET error:", error);
    return NextResponse.json({ error: "Failed to load data" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const action = body.action;

    if (action === "purchase") {
      const data = purchaseSchema.parse(body);
      const hoursCredit = purchaseToHours(data.amount_spent);
      const academicYear = getCurrentAcademicYear();

      await query(
        `INSERT INTO purchase_credits (parent_id, school_id, amount_spent, hours_credited, description, receipt_url, academic_year, credited_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [data.parent_id, session.user.school_id, data.amount_spent, hoursCredit, data.description, data.receipt_url || null, academicYear, session.user.school_id]
      );

      return NextResponse.json({
        message: "Purchase credit added",
        hours_credited: hoursCredit,
        amount_spent: data.amount_spent,
      }, { status: 201 });
    }

    if (action === "adjustment") {
      const data = adjustmentSchema.parse(body);
      const academicYear = getCurrentAcademicYear();

      await query(
        `INSERT INTO hour_adjustments (parent_id, adjustment_type, hours, description, academic_year, adjusted_by)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [data.parent_id, data.adjustment_type, data.hours, data.description, academicYear, session.user.school_id]
      );

      // If it's a manual credit/debit, update the parent's total
      if (data.adjustment_type === "manual_credit") {
        await query(
          "UPDATE parents SET total_hours_completed = total_hours_completed + $1 WHERE id = $2",
          [data.hours, data.parent_id]
        );
      } else if (data.adjustment_type === "manual_debit") {
        await query(
          "UPDATE parents SET total_hours_completed = GREATEST(0, total_hours_completed - $1) WHERE id = $2",
          [Math.abs(data.hours), data.parent_id]
        );
      } else if (data.adjustment_type === "rollover") {
        await query(
          "UPDATE parents SET rollover_hours = $1 WHERE id = $2",
          [data.hours, data.parent_id]
        );
      }

      return NextResponse.json({ message: "Adjustment recorded" }, { status: 201 });
    }

    if (action === "override") {
      const data = overrideSchema.parse(body);

      const updates: string[] = [];
      const values: any[] = [];
      let idx = 1;

      if (data.required_hours_override !== undefined) {
        updates.push(`required_hours_override = $${idx}`);
        values.push(data.required_hours_override);
        idx++;
      }
      if (data.student_count !== undefined) {
        updates.push(`student_count = $${idx}`);
        values.push(data.student_count);
        idx++;
      }
      if (data.rollover_hours !== undefined) {
        updates.push(`rollover_hours = $${idx}`);
        values.push(data.rollover_hours);
        idx++;
      }

      if (updates.length > 0) {
        values.push(data.parent_id);
        await query(
          `UPDATE parents SET ${updates.join(", ")}, updated_at = NOW() WHERE id = $${idx}`,
          values
        );
      }

      return NextResponse.json({ message: "Override saved" });
    }

    if (action === "generate_billing") {
      const academicYear = body.academic_year || getCurrentAcademicYear();
      const school = await getOne("SELECT * FROM schools WHERE id = $1", [session.user.school_id]);
      const rate = parseFloat(school.billing_rate_per_hour);

      const parents = await getMany(
        `SELECT p.*,
          COALESCE((SELECT SUM(pc.hours_credited) FROM purchase_credits pc WHERE pc.parent_id = p.id AND pc.academic_year = $2), 0) as purchase_hours
        FROM parents p WHERE p.school_id = $1`,
        [session.user.school_id, academicYear]
      );

      let billCount = 0;
      for (const p of parents) {
        const requiredHours = p.required_hours_override !== null
          ? parseFloat(p.required_hours_override)
          : calculateRequiredHours(p.student_count || 1, parseFloat(school.hours_per_student), parseFloat(school.max_family_hours));
        const purchaseHours = parseFloat(p.purchase_hours) || 0;
        const volunteerHours = parseFloat(p.total_hours_completed) || 0;
        const rollover = parseFloat(p.rollover_hours) || 0;
        const runningTotal = calculateRunningTotal(volunteerHours, purchaseHours, rollover);
        const { hoursShort, amountDue } = calculateBalanceDue(requiredHours, runningTotal, rate);

        if (hoursShort > 0) {
          // Check if billing record already exists
          const existing = await getOne(
            "SELECT id FROM billing_records WHERE parent_id = $1 AND academic_year = $2",
            [p.id, academicYear]
          );

          if (!existing) {
            await query(
              `INSERT INTO billing_records (parent_id, school_id, academic_year, hours_short, rate_per_hour, amount_due, status, billed_date)
               VALUES ($1, $2, $3, $4, $5, $6, 'pending', CURRENT_DATE)`,
              [p.id, session.user.school_id, academicYear, hoursShort, rate, amountDue]
            );
            billCount++;
          }
        }
      }

      return NextResponse.json({ message: `Generated ${billCount} billing records`, count: billCount });
    }

    if (action === "year_end_rollover") {
      const fromYear = body.from_year || getCurrentAcademicYear();
      const school = await getOne("SELECT * FROM schools WHERE id = $1", [session.user.school_id]);

      const parents = await getMany(
        `SELECT p.*,
          COALESCE((SELECT SUM(pc.hours_credited) FROM purchase_credits pc WHERE pc.parent_id = p.id AND pc.academic_year = $2), 0) as purchase_hours
        FROM parents p WHERE p.school_id = $1`,
        [session.user.school_id, fromYear]
      );

      let rolloverCount = 0;
      for (const p of parents) {
        const requiredHours = p.required_hours_override !== null
          ? parseFloat(p.required_hours_override)
          : calculateRequiredHours(p.student_count || 1, parseFloat(school.hours_per_student), parseFloat(school.max_family_hours));
        const purchaseHours = parseFloat(p.purchase_hours) || 0;
        const volunteerHours = parseFloat(p.total_hours_completed) || 0;
        const rollover = parseFloat(p.rollover_hours) || 0;
        const runningTotal = calculateRunningTotal(volunteerHours, purchaseHours, rollover);
        const banked = calculateBankedHours(requiredHours, runningTotal);

        if (banked > 0) {
          // Calculate next academic year
          const [startYr] = fromYear.split("-").map(Number);
          const nextYear = `${startYr + 1}-${startYr + 2}`;

          await query(
            "UPDATE parents SET rollover_hours = $1, total_hours_completed = 0, academic_year = $2 WHERE id = $3",
            [banked, nextYear, p.id]
          );

          await query(
            `INSERT INTO hour_adjustments (parent_id, adjustment_type, hours, description, academic_year, adjusted_by)
             VALUES ($1, 'rollover', $2, $3, $4, $5)`,
            [p.id, banked, `Rollover from ${fromYear}`, nextYear, session.user.school_id]
          );

          rolloverCount++;
        } else {
          const [startYr] = fromYear.split("-").map(Number);
          const nextYear = `${startYr + 1}-${startYr + 2}`;
          await query(
            "UPDATE parents SET rollover_hours = 0, total_hours_completed = 0, academic_year = $1 WHERE id = $2",
            [nextYear, p.id]
          );
        }
      }

      return NextResponse.json({ message: `Rolled over ${rolloverCount} families`, count: rolloverCount });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    console.error("Co-op POST error:", error);
    return NextResponse.json({ error: "Failed to process request" }, { status: 500 });
  }
}
