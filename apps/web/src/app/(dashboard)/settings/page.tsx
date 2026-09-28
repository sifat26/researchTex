import * as React from "react";
import { Button } from "@/components/ui/button";

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your account and application preferences.</p>
      </div>

      <div className="space-y-6">
        <div className="rounded-md border border-border bg-card shadow-sm">
          <div className="p-6 border-b border-border">
            <h3 className="text-lg font-medium text-foreground">Profile Settings</h3>
            <p className="text-sm text-muted-foreground mt-1">Settings backend will be implemented in a future phase.</p>
          </div>
          <div className="p-6">
             <Button disabled>Save Changes</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
