// lib/coop.ts

export const RATE_PER_HOUR = 30.0;

/**
 * Calculate required hours for a family based on student count.
 * 12 hours per child, max 30 hours per family.
 */
export function calculateRequiredHours(
  studentCount: number,
  hoursPerStudent: number = 12,
  maxFamilyHours: number = 30
): number {
  return Math.min(studentCount * hoursPerStudent, maxFamilyHours);
}

/**
 * Calculate the effective required hours after rollover.
 * If rollover covers part of the requirement, the remaining is lower.
 */
export function calculateEffectiveRequired(
  requiredHours: number,
  rolloverHours: number
): number {
  return Math.max(0, requiredHours - rolloverHours);
}

/**
 * Calculate running total: completed volunteer hours + purchase hours + rollover
 */
export function calculateRunningTotal(
  volunteerHoursCompleted: number,
  purchaseHoursCompleted: number,
  rolloverHours: number
): number {
  return volunteerHoursCompleted + purchaseHoursCompleted + rolloverHours;
}

/**
 * Calculate balance due (hours short * rate)
 */
export function calculateBalanceDue(
  requiredHours: number,
  runningTotal: number,
  ratePerHour: number = RATE_PER_HOUR
): { hoursShort: number; amountDue: number } {
  const hoursShort = Math.max(0, requiredHours - runningTotal);
  return {
    hoursShort,
    amountDue: hoursShort * ratePerHour,
  };
}

/**
 * Calculate banked/surplus hours for rollover to next year
 */
export function calculateBankedHours(
  requiredHours: number,
  runningTotal: number
): number {
  return Math.max(0, runningTotal - requiredHours);
}

/**
 * Convert purchase amount to Co-op hours
 * $30 = 1 hour
 */
export function purchaseToHours(
  amountSpent: number,
  ratePerHour: number = RATE_PER_HOUR
): number {
  return Math.round((amountSpent / ratePerHour) * 10) / 10;
}

/**
 * Get the current academic year string (e.g., "2025-2026")
 * Academic year starts in September
 */
export function getCurrentAcademicYear(startMonth: number = 9): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  if (month >= startMonth) {
    return `${year}-${year + 1}`;
  }
  return `${year - 1}-${year}`;
}

/**
 * Check if we're past the April billing deadline
 */
export function isPastBillingDeadline(deadlineMonth: number = 4): boolean {
  const now = new Date();
  const month = now.getMonth() + 1;
  return month > deadlineMonth;
}

/**
 * Prorate hours for families joining after the first month
 * Based on months remaining in the academic year
 */
export function prorateHours(
  fullRequirement: number,
  enrollmentDate: Date,
  academicYearStartMonth: number = 9,
  billingDeadlineMonth: number = 4
): number {
  const enrollment = new Date(enrollmentDate);
  const enrollMonth = enrollment.getMonth() + 1;
  const enrollYear = enrollment.getFullYear();

  // Calculate total months in the co-op period (Sept through April = 8 months)
  const totalMonths = billingDeadlineMonth >= academicYearStartMonth
    ? billingDeadlineMonth - academicYearStartMonth + 1
    : (12 - academicYearStartMonth + 1) + billingDeadlineMonth;

  // If enrolled in the start month, full requirement
  let startYear = enrollYear;
  if (enrollMonth < academicYearStartMonth) {
    startYear = enrollYear - 1;
  }

  // Months remaining from enrollment to April deadline
  let monthsRemaining: number;
  if (enrollMonth <= billingDeadlineMonth) {
    monthsRemaining = billingDeadlineMonth - enrollMonth + 1;
  } else if (enrollMonth >= academicYearStartMonth) {
    monthsRemaining = (12 - enrollMonth + 1) + billingDeadlineMonth;
  } else {
    monthsRemaining = 0;
  }

  // First month doesn't count (joined after first month = prorated)
  if (monthsRemaining >= totalMonths) return fullRequirement;

  const prorated = Math.round((fullRequirement * (monthsRemaining / totalMonths)) * 10) / 10;
  return prorated;
}
