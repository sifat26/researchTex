import * as React from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProjectService } from "@/services/project.service";
import { CreateProjectForm } from "@/components/project/create-project-form";
import { DeleteProjectButton } from "@/components/project/delete-project-button";
import { ImportProjectForm } from "@/components/project/import-project-form";

import { requireAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const session = await requireAuth();
  const projects = await ProjectService.listProjects(session.userId);

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">All Projects</h1>
          <p className="text-sm text-muted-foreground">Browse and manage all your documents.</p>
        </div>
        <div className="flex items-center gap-2">
          <ImportProjectForm />
          <CreateProjectForm />
        </div>
      </div>

      <div className="space-y-4">
        {projects.length === 0 ? (
          <div className="rounded-md border border-border bg-card p-8 text-center shadow-sm">
            <h3 className="text-lg font-medium text-foreground">No Projects</h3>
            <p className="text-sm text-muted-foreground mt-1">You don&apos;t have any projects yet.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <Link key={project.id} href={`/editor/${project.id}`}>
                <Card className="transition-colors hover:bg-muted/50 h-full flex flex-col justify-between">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base leading-snug">{project.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-between items-center text-xs text-muted-foreground">
                      <span>{project.updatedAt.toLocaleDateString()}</span>
                      <DeleteProjectButton id={project.id} />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
