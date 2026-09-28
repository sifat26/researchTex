import pg from "pg";
import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcryptjs";

const { Client } = pg;

async function run() {
  const client = new Client({
    connectionString: "postgresql://postgres:postgres@localhost:5432/researchtex",
  });

  await client.connect();

  console.log("Connected to DB.");

  // 1. Create users table temporarily to insert the seed user
  await client.query(`
    CREATE TABLE IF NOT EXISTS "users" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "name" varchar(255) NOT NULL,
      "email" varchar(255) NOT NULL UNIQUE,
      "password_hash" varchar(255) NOT NULL,
      "avatar" varchar(255),
      "created_at" timestamp DEFAULT now() NOT NULL,
      "updated_at" timestamp DEFAULT now() NOT NULL
    );
  `);

  // 2. Insert seed user
  const email = "developer@researchtex.local";
  const pass = await bcrypt.hash("password123", 10);
  const id = uuidv4();

  const res = await client.query(`SELECT id FROM users WHERE email = $1`, [email]);
  let userId = id;
  if (res.rowCount === 0) {
    await client.query(
      `INSERT INTO users (id, name, email, password_hash) VALUES ($1, $2, $3, $4)`,
      [id, "Developer Admin", email, pass]
    );
    console.log(`Inserted seed user with ID: ${id}`);
  } else {
    userId = res.rows[0].id;
    console.log(`Seed user already exists with ID: ${userId}`);
  }

  // 3. Update any invalid owner_ids in projects to the seed user
  const updateRes = await client.query(`
    UPDATE projects SET owner_id = $1 WHERE length(owner_id) < 30 OR owner_id = 'local-user';
  `, [userId]);
  
  console.log(`Updated ${updateRes.rowCount} projects to new owner.`);

  // 4. Now we alter the column type to UUID safely, since all rows have valid UUID strings.
  // Using explicit casting
  await client.query(`
    ALTER TABLE projects ALTER COLUMN owner_id TYPE uuid USING owner_id::uuid;
  `);
  
  console.log("Altered projects.owner_id to UUID successfully.");

  await client.end();
}

run().catch(console.error);
