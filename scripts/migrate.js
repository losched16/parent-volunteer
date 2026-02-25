// scripts/migrate.js
const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
});

const schema = `
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Schools table
CREATE TABLE IF NOT EXISTS schools (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  subdomain VARCHAR(100),
  admin_email VARCHAR(255) NOT NULL UNIQUE,
  admin_password_hash VARCHAR(255) NOT NULL,
  required_hours_per_year DECIMAL(5,1) NOT NULL DEFAULT 20,
  ghl_api_key TEXT,
  ghl_location_id VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Parents table
CREATE TABLE IF NOT EXISTS parents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  phone VARCHAR(50),
  student_names TEXT,
  total_hours_completed DECIMAL(6,1) NOT NULL DEFAULT 0,
  ghl_contact_id VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login TIMESTAMP WITH TIME ZONE,
  UNIQUE(school_id, email)
);

-- Volunteer opportunities table
CREATE TABLE IF NOT EXISTS volunteer_opportunities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  event_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  hours_credit DECIMAL(4,1) NOT NULL DEFAULT 1,
  total_slots INTEGER NOT NULL DEFAULT 10,
  slots_remaining INTEGER NOT NULL DEFAULT 10,
  location VARCHAR(255),
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Signups table
CREATE TABLE IF NOT EXISTS signups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  opportunity_id UUID NOT NULL REFERENCES volunteer_opportunities(id) ON DELETE CASCADE,
  parent_id UUID NOT NULL REFERENCES parents(id) ON DELETE CASCADE,
  signup_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status VARCHAR(20) NOT NULL DEFAULT 'confirmed',
  attended BOOLEAN NOT NULL DEFAULT false,
  hours_credited DECIMAL(4,1) NOT NULL DEFAULT 0,
  notes TEXT,
  reminder_sent BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(opportunity_id, parent_id, status)
);

-- Email logs table
CREATE TABLE IF NOT EXISTS email_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_id UUID REFERENCES parents(id) ON DELETE SET NULL,
  email_type VARCHAR(50) NOT NULL,
  subject VARCHAR(500),
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status VARCHAR(20) NOT NULL DEFAULT 'sent',
  error_message TEXT
);

-- Admin settings table
CREATE TABLE IF NOT EXISTS admin_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  setting_key VARCHAR(100) NOT NULL,
  setting_value TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(school_id, setting_key)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_parents_school_id ON parents(school_id);
CREATE INDEX IF NOT EXISTS idx_parents_email ON parents(email);
CREATE INDEX IF NOT EXISTS idx_opportunities_school_id ON volunteer_opportunities(school_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_event_date ON volunteer_opportunities(event_date);
CREATE INDEX IF NOT EXISTS idx_opportunities_status ON volunteer_opportunities(status);
CREATE INDEX IF NOT EXISTS idx_signups_opportunity_id ON signups(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_signups_parent_id ON signups(parent_id);
CREATE INDEX IF NOT EXISTS idx_signups_status ON signups(status);
CREATE INDEX IF NOT EXISTS idx_email_logs_parent_id ON email_logs(parent_id);
CREATE INDEX IF NOT EXISTS idx_admin_settings_school_key ON admin_settings(school_id, setting_key);
`;

async function migrate() {
  console.log("🚀 Running database migration...");
  try {
    await pool.query(schema);
    console.log("✅ Migration completed successfully!");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrate();
