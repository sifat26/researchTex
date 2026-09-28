import * as React from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProjectService } from "@/services/project.service";
import { CreateProjectForm } from "@/components/project/create-project-form";
import { DeleteProjectButton } from "@/components/project/delete-project-button";

import { requireAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await requireAuth();
  const projects = await ProjectService.listProjects(session.userId);

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Projects</h1>
          <p className="text-sm text-muted-foreground">Manage your research documents and templates.</p>
        </div>
        <CreateProjectForm />
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-medium tracking-tight">Recent Projects</h2>
        {projects.length === 0 ? (
          <div className="text-sm text-muted-foreground">No projects found. Create one above.</div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <Link key={project.id} href={`/editor/${project.id}`}>
                <Card className="transition-colors hover:bg-muted/50 h-full flex flex-col justify-between">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                        <polyline points="14 2 14 8 20 8"/>
                        <line x1="16" y1="13" x2="8" y2="13"/>
                        <line x1="16" y1="17" x2="8" y2="17"/>
                        <polyline points="10 9 9 9 8 9"/>
                      </svg>
                      <span className="capitalize">Document</span>
                    </div>
                    <CardTitle className="text-base leading-snug">{project.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-between items-center text-xs text-muted-foreground">
                      <span>{project.createdAt.toLocaleDateString()}</span>
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
