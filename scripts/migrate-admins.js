// scripts/migrate-admins.js
const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
});

const schema = `
-- Admin users table
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'admin',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login TIMESTAMP WITH TIME ZONE,
  UNIQUE(school_id, email)
);

CREATE INDEX IF NOT EXISTS idx_admin_users_email ON admin_users(email);
CREATE INDEX IF NOT EXISTS idx_admin_users_school_id ON admin_users(school_id);

-- Migrate existing school admin into admin_users table if not already there
INSERT INTO admin_users (school_id, email, password_hash, first_name, last_name, role)
SELECT id, admin_email, admin_password_hash, 'School', 'Admin', 'super_admin'
FROM schools
WHERE NOT EXISTS (
  SELECT 1 FROM admin_users WHERE admin_users.email = schools.admin_email AND admin_users.school_id = schools.id
);
`;

async function migrate() {
  console.log("🚀 Running admin users migration...");
  try {
    await pool.query(schema);
    console.log("✅ Admin users migration completed!");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrate();
