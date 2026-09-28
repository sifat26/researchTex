"use server";

import { FileService } from "@/services/file.service";
import { revalidatePath } from "next/cache";
import { requireProjectAccess } from "@/lib/auth";

export async function createFileAction(projectId: string, path: string, content: string = "") {
  await requireProjectAccess(projectId, "EDITOR");
  await FileService.writeFile(projectId, path, content);
  revalidatePath(`/editor/${projectId}`);
}

export async function createFolderAction(projectId: string, path: string) {
  await requireProjectAccess(projectId, "EDITOR");
  await FileService.createDirectory(projectId, path);
  revalidatePath(`/editor/${projectId}`);
}

export async function deleteFileAction(projectId: string, path: string) {
  await requireProjectAccess(projectId, "EDITOR");
  await FileService.deleteFile(projectId, path);
  revalidatePath(`/editor/${projectId}`);
}

export async function deleteFolderAction(projectId: string, path: string) {
  await requireProjectAccess(projectId, "EDITOR");
  await FileService.deleteDirectory(projectId, path);
  revalidatePath(`/editor/${projectId}`);
}

export async function updateFileContentAction(projectId: string, path: string, content: string) {
  await requireProjectAccess(projectId, "EDITOR");
  await FileService.writeFile(projectId, path, content);
  revalidatePath(`/editor/${projectId}`);
}
