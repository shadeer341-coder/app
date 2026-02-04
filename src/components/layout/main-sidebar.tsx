
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
  HelpCircle,
  AreaChart,
  FolderKanban,
  CreditCard,
  ShoppingCart,
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

const userLinks = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/dashboard/interviews", label: "My Interviews", icon: FileText },
  { href: "/dashboard/progress", label: "My Progress", icon: BarChart },
];

const agencyLinks = [
    { href: "/dashboard/agency", label: "Dashboard", icon: Building },
    { href: "/dashboard/agency/students", label: "Manage Students", icon: Users },
    { href: "/dashboard/agency/interviews", label: "Recent Interviews", icon: FileText },
    { href: "/dashboard/agency/usage", label: "Usage", icon: AreaChart },
    { href: "/dashboard/agency/plan", label: "Plan", icon: CreditCard },
    { href: "/dashboard/agency/recharge", label: "Recharge", icon: ShoppingCart },
];

const adminLinks = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/dashboard/questions", label: "Questions", icon: HelpCircle },
  { href: "/dashboard/categories", label: "Categories", icon: FolderKanban },
  { href: "/dashboard/admin", label: "Users", icon: Users },
  { href: "/dashboard/admin/agencies", label: "Agencies", icon: Building },
  { href: "/dashboard/admin/analytics", label: "Analytics", icon: AreaChart },
];

export function MainSidebar({ user }: { user: User }) {
  const pathname = usePathname();

  if (!user) return null;

  let links;
  let dashboardPath = '/dashboard';

  if (user.role === 'admin') {
    links = adminLinks;
  } else if (user.role === 'agency') {
    links = agencyLinks;
    dashboardPath = '/dashboard/agency';
  } else {
    links = userLinks;
  }

  return (
    <Sidebar>
      <SidebarHeader>
        <Link href={dashboardPath} className="flex items-center gap-2 font-headline text-xl font-bold">
            <Logo className="h-8 w-8 text-primary" />
            <span className="group-data-[collapsible=icon]:hidden">precasprep</span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {links.map((link) => {
             const isDashboardLink = link.href === '/dashboard' || link.href === '/dashboard/agency';
             const isActive = (isDashboardLink && pathname === link.href) || (!isDashboardLink && pathname.startsWith(link.href));

            return (
                <SidebarMenuItem key={link.href}>
                <SidebarMenuButton
                    asChild
                    isActive={isActive}
                    tooltip={link.label}
                >
                    <Link href={link.href}>
                    <link.icon />
                    <span>{link.label}</span>
                    </Link>
                </SidebarMenuButton>
                </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
            <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Settings" isActive={pathname === '/dashboard/settings'}>
                    <Link href="/dashboard/settings">
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
