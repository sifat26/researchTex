"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { createProjectAction } from "@/app/actions/projects";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Creating..." : "New Project"}
    </Button>
  );
}

export function CreateProjectForm() {
  return (
    <form action={createProjectAction} className="flex gap-2">
      <input
        type="text"
        name="name"
        placeholder="Project Name..."
        required
        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
      />
      <SubmitButton />
    </form>
  );
}
