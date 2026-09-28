"use server";

import { ProjectService } from "@/services/project.service";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAuth, requireProjectAccess } from "@/lib/auth";
import type { CreateProjectInput } from "@researchtex/types";

export async function createProjectAction(formData: FormData) {
  const session = await requireAuth();
  
  const name = formData.get("name") as string;
  if (!name || name.trim() === "") {
    throw new Error("Project name is required.");
  }
  
  // Need to pass ownerId to ProjectService.createProject
  // We'll update ProjectService shortly
  const project = await ProjectService.createProject({ name, ownerId: session.userId });
  revalidatePath("/dashboard");
  revalidatePath("/projects");
  redirect(`/editor/${project.id}`);
}

export async function duplicateProjectAction(id: string, newName: string) {
  const session = await requireAuth();
  await requireProjectAccess(id, "VIEWER"); // Must have read access to duplicate
  
  if (!newName || newName.trim() === "") {
    throw new Error("New project name is required.");
  }

  const project = await ProjectService.duplicateProject(id, newName, session.userId);
  if (!project) throw new Error("Source project not found.");

  revalidatePath("/dashboard");
  revalidatePath("/projects");
  redirect(`/editor/${project.id}`);
}

export async function deleteProjectAction(id: string) {
  await requireProjectAccess(id, "OWNER");
  await ProjectService.deleteProject(id);
  revalidatePath("/dashboard");
  revalidatePath("/projects");
}
