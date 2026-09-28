"use client";

import { deleteProjectAction } from "@/app/actions/projects";
import { Button } from "@/components/ui/button";

export function DeleteProjectButton({ id }: { id: string }) {
  return (
    <Button
      variant="destructive"
      size="sm"
      className="h-8 text-xs font-normal"
      onClick={async (e) => {
        e.preventDefault(); // prevent link navigation
        await deleteProjectAction(id);
      }}
    >
      Delete
    </Button>
  );
}
