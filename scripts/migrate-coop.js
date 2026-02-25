// scripts/migrate-coop.js
const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
});

const schema = `
-- Add Co-op tracking columns to parents table
ALTER TABLE parents ADD COLUMN IF NOT EXISTS student_count INTEGER NOT NULL DEFAULT 1;
ALTER TABLE parents ADD COLUMN IF NOT EXISTS required_hours_override DECIMAL(6,1) DEFAULT NULL;
ALTER TABLE parents ADD COLUMN IF NOT EXISTS rollover_hours DECIMAL(6,1) NOT NULL DEFAULT 0;
ALTER TABLE parents ADD COLUMN IF NOT EXISTS academic_year VARCHAR(9) NOT NULL DEFAULT '2025-2026';
ALTER TABLE parents ADD COLUMN IF NOT EXISTS enrollment_date DATE DEFAULT CURRENT_DATE;
ALTER TABLE parents ADD COLUMN IF NOT EXISTS prorated BOOLEAN NOT NULL DEFAULT false;

-- Purchase credits table
CREATE TABLE IF NOT EXISTS purchase_credits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_id UUID NOT NULL REFERENCES parents(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  amount_spent DECIMAL(8,2) NOT NULL,
  hours_credited DECIMAL(4,1) NOT NULL,
  description TEXT,
  receipt_url TEXT,
  academic_year VARCHAR(9) NOT NULL DEFAULT '2025-2026',
  credited_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_purchase_credits_parent_id ON purchase_credits(parent_id);
CREATE INDEX IF NOT EXISTS idx_purchase_credits_academic_year ON purchase_credits(academic_year);

-- Billing records table
CREATE TABLE IF NOT EXISTS billing_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_id UUID NOT NULL REFERENCES parents(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  academic_year VARCHAR(9) NOT NULL,
  hours_short DECIMAL(6,1) NOT NULL DEFAULT 0,
  rate_per_hour DECIMAL(6,2) NOT NULL DEFAULT 30.00,
  amount_due DECIMAL(8,2) NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  billed_date DATE,
  paid_date DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_billing_records_parent_id ON billing_records(parent_id);
CREATE INDEX IF NOT EXISTS idx_billing_records_academic_year ON billing_records(academic_year);
CREATE INDEX IF NOT EXISTS idx_billing_records_status ON billing_records(status);

-- Hour adjustment log for transparency
CREATE TABLE IF NOT EXISTS hour_adjustments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_id UUID NOT NULL REFERENCES parents(id) ON DELETE CASCADE,
  adjustment_type VARCHAR(30) NOT NULL,
  hours DECIMAL(6,1) NOT NULL,
  description TEXT,
  academic_year VARCHAR(9) NOT NULL DEFAULT '2025-2026',
  adjusted_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hour_adjustments_parent_id ON hour_adjustments(parent_id);

-- Update schools table with Co-op settings
ALTER TABLE schools ADD COLUMN IF NOT EXISTS hours_per_student DECIMAL(4,1) NOT NULL DEFAULT 12;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS max_family_hours DECIMAL(4,1) NOT NULL DEFAULT 30;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS billing_rate_per_hour DECIMAL(6,2) NOT NULL DEFAULT 30.00;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS billing_deadline_month INTEGER NOT NULL DEFAULT 4;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS academic_year_start_month INTEGER NOT NULL DEFAULT 9;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS current_academic_year VARCHAR(9) NOT NULL DEFAULT '2025-2026';
`;

async function migrate() {
  console.log("Running Co-op program migration...");
  try {
    await pool.query(schema);
    console.log("Co-op program migration completed!");
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrate();
