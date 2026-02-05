
import { SidebarTrigger } from "@/components/ui/sidebar";
import { UserNav } from "@/components/layout/user-nav";
import type { User } from "@/lib/types";
import { Repeat } from "lucide-react";

export function Header({ user }: { user: User }) {
    if (!user) return null;
  return (
    <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background px-4 md:px-8">
      <div className="flex items-center gap-2 md:hidden">
        <SidebarTrigger />
      </div>
      <div className="flex w-full items-center justify-end gap-4">
        {user.role !== 'admin' && (
            <div className="flex items-center gap-2 rounded-full border bg-secondary px-3 py-1 text-sm">
                <Repeat className="h-4 w-4 text-muted-foreground" />
                <span className="font-semibold text-foreground">{user.interview_quota ?? 0}</span>
                <span className="text-muted-foreground hidden sm:inline">attempts left</span>
            </div>
        )}
        <UserNav user={user} />
      </div>
    </header>
  );
}
