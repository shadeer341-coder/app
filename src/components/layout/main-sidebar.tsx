"use client"

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  FileText,
  BarChart,
  Users,
  Settings,
  Building,
  HardHat,
  HelpCircle
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Logo } from "@/components/icons";
import type { User } from "@/lib/types";
import { cn } from "@/lib/utils";

const commonLinks = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/dashboard/interviews", label: "Interviews", icon: FileText },
  { href: "/dashboard/progress", label: "Progress", icon: BarChart },
];

const agencyLinks = [
  { href: "/dashboard/agency", label: "Agency", icon: Building },
];

const adminLinks = [
  { href: "/dashboard/questions", label: "Questions", icon: HelpCircle },
  { href: "/dashboard/admin", label: "Admin", icon: HardHat },
];

export function MainSidebar({ user }: { user: User }) {
  const pathname = usePathname();

  if (!user) return null;

  const userLinks = [
    ...commonLinks,
    ...(user.role === 'agency_admin' ? agencyLinks : []),
    ...(user.role === 'admin' ? adminLinks : []),
  ];

  return (
    <Sidebar>
      <SidebarHeader>
        <Link href="/dashboard" className="flex items-center gap-2 font-headline text-xl font-bold">
            <Logo className="h-8 w-8 text-primary" />
            <span className="group-data-[collapsible=icon]:hidden">precasprep</span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {userLinks.map((link) => (
            <SidebarMenuItem key={link.href}>
              <SidebarMenuButton
                asChild
                isActive={pathname.startsWith(link.href) && (link.href !== '/dashboard' || pathname === '/dashboard')}
                tooltip={link.label}
              >
                <Link href={link.href}>
                  <link.icon />
                  <span>{link.label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
            <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Settings">
                    <Link href="#">
                        <Settings />
                        <span>Settings</span>
                    </Link>
                </SidebarMenuButton>
            </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
