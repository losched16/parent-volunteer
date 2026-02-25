// scripts/reset.js
const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
});

async function reset() {
  console.log("⚠️  Resetting database (dropping all tables)...");
  try {
    await pool.query(`
      DROP TABLE IF EXISTS email_logs CASCADE;
      DROP TABLE IF EXISTS admin_settings CASCADE;
      DROP TABLE IF EXISTS signups CASCADE;
      DROP TABLE IF EXISTS volunteer_opportunities CASCADE;
      DROP TABLE IF EXISTS parents CASCADE;
      DROP TABLE IF EXISTS schools CASCADE;
    `);
    console.log("✅ All tables dropped.");
    console.log("Run 'npm run db:migrate' followed by 'npm run db:seed' to set up again.");
  } catch (error) {
    console.error("❌ Reset failed:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

reset();
