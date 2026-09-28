import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { getSession } from "@/lib/auth";
import { logoutAction } from "@/app/actions/auth";

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {}

export async function Sidebar({ className, ...props }: SidebarProps) {
  const session = await getSession();

  return (
    <aside
      className={cn(
        "flex h-screen w-64 flex-col border-r border-border bg-background",
        className
      )}
      {...props}
    >
      <div className="flex h-14 items-center border-b border-border px-4">
        <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
          <svg
            width="24"
            height="24"
            viewBox="0 0 48 48"
            fill="none"
            aria-hidden="true"
          >
            <rect width="48" height="48" rx="10" fill="hsl(var(--primary))" />
            <text
              x="50%"
              y="55%"
              dominantBaseline="middle"
              textAnchor="middle"
              fontSize="24"
              fontFamily="serif"
              fill="white"
              fontWeight="bold"
            >
              R
            </text>
          </svg>
          <span className="text-lg tracking-tight">ResearchTex</span>
        </Link>
      </div>

      <nav className="flex-1 space-y-1 p-4">
        <Link
          href="/dashboard"
          className="flex items-center gap-3 rounded-md bg-muted px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
        >
          Dashboard
        </Link>
        <Link
          href="/projects"
          className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          Projects
        </Link>
      </nav>

      <div className="border-t border-border p-4">
        <div className="flex flex-col gap-2">
          {session ? (
            <>
              <div className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-foreground">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground font-bold uppercase">
                  {session.name.charAt(0)}
                </div>
                <span className="truncate">{session.name}</span>
              </div>
              <form action={logoutAction}>
                <button type="submit" className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                  Logout
                </button>
              </form>
            </>
          ) : (
            <Link href="/login" className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
              Login
            </Link>
          )}
        </div>
      </div>
    </aside>
  );
}
