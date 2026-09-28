"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings } from "lucide-react";
import { useRouter } from "next/navigation";

export function SettingsDialog() {
  const [open, setOpen] = React.useState(false);
  const [apiKey, setApiKey] = React.useState("");
  const router = useRouter();

  React.useEffect(() => {
    // Load existing key from localStorage
    const saved = localStorage.getItem("GEMINI_API_KEY");
    if (saved) {
      setApiKey(saved);
    }
  }, []);

  const handleSave = () => {
    if (apiKey) {
      localStorage.setItem("GEMINI_API_KEY", apiKey);
      // We also need to send this to the server so it can use it, or pass it via headers in requests.
      // For now, setting it in localStorage is standard for client-side API keys, 
      // but if the server needs it for AI features, we might need an API endpoint to set it in a cookie.
      document.cookie = `gemini_api_key=${apiKey}; path=/; max-age=31536000`;
    } else {
      localStorage.removeItem("GEMINI_API_KEY");
      document.cookie = `gemini_api_key=; path=/; max-age=0`;
    }
    setOpen(false);
    router.refresh(); // Refresh to apply changes on the server
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground" title="Settings">
          <Settings className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Project Settings</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="apiKey">Gemini API Key</Label>
            <Input
              id="apiKey"
              type="password"
              placeholder="AIzaSy..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Required for AI explanation and auto-fix features. Stored securely in your browser.
            </p>
          </div>
        </div>
        <div className="flex justify-end">
          <Button onClick={handleSave}>Save changes</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
