// scripts/seed.js
const { Pool } = require("pg");
const bcrypt = require("bcryptjs");
require("dotenv").config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
});

async function seed() {
  console.log("🌱 Seeding database...");

  try {
    // Create admin account
    const adminPassword = "SalemAdmin2024!";
    const adminHash = await bcrypt.hash(adminPassword, 12);

    const schoolResult = await pool.query(`
      INSERT INTO schools (name, subdomain, admin_email, admin_password_hash, required_hours_per_year)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (admin_email) DO UPDATE SET name = $1
      RETURNING id
    `, ["Salem Montessori School", "salemmontessori", "admin@salemmontessori.com", adminHash, 20]);

    const schoolId = schoolResult.rows[0].id;
    console.log("✅ School created:", schoolId);
    console.log("📧 Admin email: admin@salemmontessori.com");
    console.log("🔑 Admin password:", adminPassword);

    // Create sample opportunities
    const opportunities = [
      {
        title: "Library Book Organization",
        description: "Help organize and shelve books in the school library. Great for book lovers!",
        event_date: getFutureDate(7),
        start_time: "09:00",
        end_time: "11:00",
        hours_credit: 2,
        total_slots: 8,
        location: "School Library",
      },
      {
        title: "Garden Cleanup Day",
        description: "Join us for a spring garden cleanup. We'll be weeding, planting, and beautifying the school garden.",
        event_date: getFutureDate(14),
        start_time: "08:30",
        end_time: "11:30",
        hours_credit: 3,
        total_slots: 15,
        location: "School Garden",
      },
      {
        title: "Classroom Art Supply Prep",
        description: "Help prepare art supplies for the upcoming semester. Cut, sort, and organize materials for each classroom.",
        event_date: getFutureDate(10),
        start_time: "13:00",
        end_time: "15:00",
        hours_credit: 2,
        total_slots: 6,
        location: "Art Room 103",
      },
      {
        title: "Spring Festival Setup",
        description: "Help set up booths, decorations, and activities for the annual Spring Festival.",
        event_date: getFutureDate(21),
        start_time: "07:00",
        end_time: "12:00",
        hours_credit: 5,
        total_slots: 20,
        location: "Main Courtyard",
      },
      {
        title: "Lunch Program Assistance",
        description: "Assist with lunch preparation, serving, and cleanup. Hairnets provided!",
        event_date: getFutureDate(5),
        start_time: "10:30",
        end_time: "13:00",
        hours_credit: 2.5,
        total_slots: 4,
        location: "School Cafeteria",
      },
    ];

    for (const opp of opportunities) {
      await pool.query(`
        INSERT INTO volunteer_opportunities (school_id, title, description, event_date, start_time, end_time, hours_credit, total_slots, slots_remaining, location, status, created_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8, $9, 'active', $10)
      `, [schoolId, opp.title, opp.description, opp.event_date, opp.start_time, opp.end_time, opp.hours_credit, opp.total_slots, opp.location, schoolId]);
    }

    console.log(`✅ Created ${opportunities.length} sample opportunities`);

    // Create a sample parent
    const parentPassword = "Parent2024!";
    const parentHash = await bcrypt.hash(parentPassword, 12);

    await pool.query(`
      INSERT INTO parents (school_id, email, password_hash, first_name, last_name, phone, student_names, total_hours_completed)
      VALUES ($1, $2, $3, $4, $5, $6, $7, 0)
      ON CONFLICT (school_id, email) DO NOTHING
    `, [schoolId, "parent@example.com", parentHash, "Jane", "Smith", "(555) 123-4567", "Emma Smith, Jack Smith"]);

    console.log("✅ Sample parent created");
    console.log("📧 Parent email: parent@example.com");
    console.log("🔑 Parent password:", parentPassword);

    console.log("\n🎉 Seeding complete!");
    console.log("\n--- LOGIN CREDENTIALS ---");
    console.log("Admin:  admin@salemmontessori.com / " + adminPassword);
    console.log("Parent: parent@example.com / " + parentPassword);
    console.log("-------------------------\n");
  } catch (error) {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

function getFutureDate(daysFromNow) {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return date.toISOString().split("T")[0];
}

seed();
