"use server";

import { db } from "@/db";
import { projectMembers, users } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireProjectAccess } from "@/lib/auth";

export async function addMemberAction(projectId: string, email: string, role: "EDITOR" | "VIEWER") {
  // Only owners can add members
  await requireProjectAccess(projectId, "OWNER");

  const [user] = await db.select().from(users).where(eq(users.email, email));
  if (!user) {
    throw new Error("User with that email not found");
  }

  // check if already a member
  const [existing] = await db
    .select()
    .from(projectMembers)
    .where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, user.id)));

  if (existing) {
    // update role
    await db
      .update(projectMembers)
      .set({ role, updatedAt: new Date() })
      .where(eq(projectMembers.id, existing.id));
  } else {
    // insert
    await db.insert(projectMembers).values({
      projectId,
      userId: user.id,
      role,
    });
  }

  revalidatePath(`/editor/${projectId}`);
}

export async function removeMemberAction(projectId: string, userId: string) {
  await requireProjectAccess(projectId, "OWNER");

  // Prevent removing owner
  const [member] = await db
    .select()
    .from(projectMembers)
    .where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, userId)));

  if (member?.role === "OWNER") {
    throw new Error("Cannot remove the project owner");
  }

  await db
    .delete(projectMembers)
    .where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, userId)));

  revalidatePath(`/editor/${projectId}`);
}

export async function getProjectMembersAction(projectId: string) {
  await requireProjectAccess(projectId, "VIEWER");

  const members = await db
    .select({
      id: projectMembers.id,
      userId: projectMembers.userId,
      role: projectMembers.role,
      name: users.name,
      email: users.email,
    })
    .from(projectMembers)
    .innerJoin(users, eq(projectMembers.userId, users.id))
    .where(eq(projectMembers.projectId, projectId));

  return members;
}
