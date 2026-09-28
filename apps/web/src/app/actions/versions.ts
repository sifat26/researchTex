"use server";

import { db } from "@/db";
import { fileVersions, files, users } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireProjectAccess, requireAuth } from "@/lib/auth";

/**
 * Creates a new version by flushing Yjs state and capturing current content.
 * Prevents identical consecutive versions.
 */
export async function createVersionAction(projectId: string, path: string, message?: string) {
  const session = await requireAuth();
  await requireProjectAccess(projectId, "EDITOR"); // Must be EDITOR or OWNER

  // Flush collaboration server to persist any pending Yjs changes to DB
  try {
    const collabUrl = process.env.NEXT_PUBLIC_COLLABORATION_URL 
      ? process.env.NEXT_PUBLIC_COLLABORATION_URL.replace('ws://', 'http://').replace('wss://', 'https://')
      : 'http://localhost:1234';
      
    await fetch(`${collabUrl}/collaboration/project/${projectId}/flush`, {
      method: 'POST',
      headers: {
        'x-internal-api-key': process.env.INTERNAL_API_KEY || 'development_secret_key'
      }
    });
  } catch (err) {
    console.error('Failed to flush collaboration server before versioning:', err);
  }

  // Get current file
  const [fileRecord] = await db
    .select()
    .from(files)
    .where(and(eq(files.projectId, projectId), eq(files.path, path), eq(files.isBinary, false)));

  if (!fileRecord) {
    throw new Error("Text file not found");
  }
  
  if (!fileRecord.content) {
    throw new Error("File is empty or binary");
  }

  // Deduplication check: get latest version
  const [latestVersion] = await db
    .select()
    .from(fileVersions)
    .where(eq(fileVersions.fileId, fileRecord.id))
    .orderBy(desc(fileVersions.createdAt))
    .limit(1);

  if (latestVersion && latestVersion.content === fileRecord.content) {
    // Exact duplicate, don't create unless a specific message is supplied
    if (!message || message.trim() === "") {
      return { success: true, duplicated: true };
    }
  }

  await db.insert(fileVersions).values({
    fileId: fileRecord.id,
    projectId,
    content: fileRecord.content,
    message: message && message.trim() !== "" ? message : undefined,
    createdBy: session.userId,
  });

  return { success: true, duplicated: false };
}

/**
 * List all versions for a file.
 */
export async function getVersionsAction(projectId: string, path: string) {
  await requireProjectAccess(projectId, "VIEWER");

  const [fileRecord] = await db
    .select({ id: files.id })
    .from(files)
    .where(and(eq(files.projectId, projectId), eq(files.path, path)));

  if (!fileRecord) return [];

  const versions = await db
    .select({
      id: fileVersions.id,
      content: fileVersions.content,
      message: fileVersions.message,
      createdAt: fileVersions.createdAt,
      authorName: users.name,
    })
    .from(fileVersions)
    .leftJoin(users, eq(fileVersions.createdBy, users.id))
    .where(eq(fileVersions.fileId, fileRecord.id))
    .orderBy(desc(fileVersions.createdAt));

  return versions.map(v => ({
    ...v,
    createdAt: v.createdAt.toISOString()
  }));
}

/**
 * Restores a specific version. Requires pushing an update to Collab Server to keep clients synced.
 */
export async function restoreVersionAction(projectId: string, path: string, versionId: string) {
  const session = await requireAuth();
  await requireProjectAccess(projectId, "EDITOR");

  const [versionRecord] = await db
    .select()
    .from(fileVersions)
    .where(and(eq(fileVersions.id, versionId), eq(fileVersions.projectId, projectId)));

  if (!versionRecord) {
    throw new Error("Version not found");
  }

  // Tell Collaboration Server to inject the restored content into the active Yjs document
  try {
    const collabUrl = process.env.NEXT_PUBLIC_COLLABORATION_URL 
      ? process.env.NEXT_PUBLIC_COLLABORATION_URL.replace('ws://', 'http://').replace('wss://', 'https://')
      : 'http://localhost:1234';
      
    const res = await fetch(`${collabUrl}/collaboration/project/${projectId}/file/${encodeURIComponent(path)}/restore`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-api-key': process.env.INTERNAL_API_KEY || 'development_secret_key'
      },
      body: JSON.stringify({ content: versionRecord.content })
    });
    
    if (!res.ok) {
      throw new Error(`Collab server returned ${res.status}`);
    }
  } catch (err) {
    console.error('Failed to restore collaboration server state:', err);
    throw new Error("Failed to restore version securely to active clients");
  }

  // After pushing to Yjs, the Collab Server automatically persists it to PostgreSQL.
  // We can immediately create a new version snapshot so the restore is captured in history.
  await createVersionAction(projectId, path, `Restored from version ${versionId.substring(0, 8)}`);

  revalidatePath(`/editor/${projectId}`);
  return { success: true };
}
