import "dotenv/config";
import { db } from "../src/db";
import { users, projects, projectMembers } from "../src/db/schema";
import { hashPassword } from "../src/lib/auth";
import { eq } from "drizzle-orm";

async function main() {
  console.log("Starting Phase 9 migration...");

  // 1. Create development seed user if not exists
  const seedEmail = "developer@researchtex.local";
  let [seedUser] = await db.select().from(users).where(eq(users.email, seedEmail));

  if (!seedUser) {
    console.log(`Creating seed user: ${seedEmail}`);
    const passwordHash = await hashPassword("password123");
    
    [seedUser] = await db.insert(users).values({
      name: "Developer Admin",
      email: seedEmail,
      passwordHash,
    }).returning();
    console.log(`Created seed user with ID: ${seedUser.id}`);
  } else {
    console.log(`Seed user already exists: ${seedUser.id}`);
  }

  // 2. Re-assign all "local-user" projects to the seed user
  // (In Drizzle, we can't directly query where ownerId = "local-user" if we changed the schema type to uuid,
  // but if it fails it means it's already migrated)
  
  try {
    const allProjects = await db.select().from(projects);
    let updatedCount = 0;
    
    for (const project of allProjects) {
      // Check if it's the old 'local-user' or some other invalid UUID
      if (project.ownerId === "local-user" || project.ownerId.length < 30) {
        console.log(`Reassigning project ${project.id} from ${project.ownerId} to ${seedUser.id}`);
        
        await db.update(projects)
          .set({ ownerId: seedUser.id })
          .where(eq(projects.id, project.id));
          
        updatedCount++;
      }
      
      // Also ensure project_members exists for the owner
      const [member] = await db.select()
        .from(projectMembers)
        .where(eq(projectMembers.projectId, project.id));
        
      if (!member) {
        await db.insert(projectMembers).values({
          projectId: project.id,
          userId: project.ownerId === "local-user" || project.ownerId.length < 30 ? seedUser.id : project.ownerId,
          role: "OWNER"
        });
      }
    }
    
    console.log(`Migration complete! Reassigned ${updatedCount} legacy projects to seed user.`);
    console.log(`You can now log in with email: ${seedEmail} and password: password123`);
  } catch (err) {
    console.error("Migration error:", err);
  }
  
  process.exit(0);
}

main();
