import { db } from "@/db";
import { projects, files, projectMembers } from "@/db/schema";
import { eq, desc, and, inArray } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import type { Project, CreateProjectInput, UpdateProjectInput } from "@researchtex/types";

export class ProjectService {
  /**
   * List all active projects for a specific user.
   */
  static async listProjects(userId: string): Promise<Project[]> {
    // Find all projects where the user is a member
    const memberships = await db
      .select({ projectId: projectMembers.projectId })
      .from(projectMembers)
      .where(eq(projectMembers.userId, userId));
      
    if (memberships.length === 0) return [];

    const projectIds = memberships.map(m => m.projectId);

    const results = await db
      .select()
      .from(projects)
      .where(and(eq(projects.status, "active"), inArray(projects.id, projectIds)))
      .orderBy(desc(projects.updatedAt));

    return results.map((r) => ({
      ...r,
      description: r.description ?? undefined,
      tags: [],
      status: r.status as Project["status"],
    }));
  }

  /**
   * Get a single project by ID.
   */
  static async getProject(id: string): Promise<Project | null> {
    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    if (!project) return null;

    return {
      ...project,
      description: project.description ?? undefined,
      tags: [],
      status: project.status as Project["status"],
    };
  }

  /**
   * Create a new project, seeding it with a default main.tex.
   */
  static async createProject(input: CreateProjectInput & { ownerId: string }): Promise<Project> {
    const projectId = uuidv4();
    const now = new Date();

    const [project] = await db
      .insert(projects)
      .values({
        id: projectId,
        name: input.name,
        description: input.description,
        rootFile: input.rootFile ?? "main.tex",
        ownerId: input.ownerId,
      })
      .returning();

    if (!project) throw new Error("Failed to create project");

    // Add owner to members
    await db.insert(projectMembers).values({
      projectId: project.id,
      userId: input.ownerId,
      role: "OWNER",
    });

    // Create default main.tex
    const defaultContent = `\\documentclass{article}\n\n\\begin{document}\n\n\\section{Introduction}\n\nStart writing your research paper here.\n\n\\end{document}`;
    await db.insert(files).values({
      id: uuidv4(),
      projectId: project.id,
      name: "main.tex",
      path: "main.tex",
      type: "file",
      fileType: "tex",
      content: defaultContent,
      sizeBytes: Buffer.byteLength(defaultContent, "utf8"),
    });

    return {
      ...project,
      description: project.description ?? undefined,
      tags: [],
      status: project.status as Project["status"],
    };
  }

  /**
   * Update project metadata.
   */
  static async updateProject(id: string, input: UpdateProjectInput): Promise<Project | null> {
    const [project] = await db
      .update(projects)
      .set({
        ...input,
        updatedAt: new Date(),
      })
      .where(eq(projects.id, id))
      .returning();

    if (!project) return null;

    return {
      ...project,
      description: project.description ?? undefined,
      tags: [],
      status: project.status as Project["status"],
    };
  }

  /**
   * Delete a project. Because of ON DELETE CASCADE, this will also delete all files and members.
   */
  static async deleteProject(id: string): Promise<boolean> {
    const result = await db.delete(projects).where(eq(projects.id, id));
    return true; 
  }

  /**
   * Duplicate a project and all its files, preserving paths.
   */
  static async duplicateProject(id: string, newName: string, newOwnerId: string): Promise<Project | null> {
    const sourceProject = await this.getProject(id);
    if (!sourceProject) return null;

    const newProject = await this.createProject({
      name: newName,
      description: sourceProject.description,
      rootFile: sourceProject.rootFile,
      ownerId: newOwnerId,
    });

    // We created a default main.tex, let's delete it so we can copy everything exactly
    await db.delete(files).where(eq(files.projectId, newProject.id));

    // Copy all files
    const sourceFiles = await db.select().from(files).where(eq(files.projectId, id));

    // We must remap parentIds to preserve the folder structure.
    const idMap = new Map<string, string>();
    for (const f of sourceFiles) {
      idMap.set(f.id, uuidv4());
    }

    if (sourceFiles.length > 0) {
      const newFiles = sourceFiles.map((f) => ({
        ...f,
        id: idMap.get(f.id)!,
        projectId: newProject.id,
        parentId: f.parentId ? idMap.get(f.parentId) : null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      // Insert all new files
      await db.insert(files).values(newFiles);
    }

    return newProject;
  }
}
