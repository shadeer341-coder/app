"use client"

import Link from "next/link";
import Image from 'next/image';
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
import type { User } from "@/lib/types";

const userLinks = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/dashboard/interviews", label: "My Interviews", icon: FileText },
  { href: "/dashboard/progress", label: "My Progress", icon: BarChart },
];

const agencyLinks = [
    { href: "/dashboard", label: "Dashboard", icon: Building },
    { href: "/dashboard/students", label: "Manage Students", icon: Users },
    { href: "/dashboard/interviews", label: "Recent Interviews", icon: FileText },
    { href: "/dashboard/usage", label: "Usage", icon: AreaChart },
    { href: "/dashboard/recharge", label: "Recharge", icon: CreditCard },
];

const adminLinks = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/dashboard/questions", label: "Questions", icon: HelpCircle },
  { href: "/dashboard/categories", label: "Categories", icon: FolderKanban },
  { href: "/dashboard/admin", label: "Users", icon: Users },
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
  } else {
    links = [...userLinks];
    // Any user with the 'individual' role can recharge their own account.
    if (user.role === 'individual') {
        links.push({ href: "/dashboard/recharge", label: "Recharge", icon: ShoppingCart });
    }
  }

  return (
    <Sidebar>
      <SidebarHeader>
        <Link href={dashboardPath} className="flex items-center justify-center h-10 px-2">
            <Image src="/precasprep-logo.webp" alt="Precasprep Logo" width={120} height={24} style={{ objectFit: 'contain' }} className="group-data-[collapsible=icon]:hidden" />
            <Image src="/precasprep-logo.webp" alt="Precasprep Logo" width={28} height={28} style={{ objectFit: 'contain' }} className="hidden group-data-[collapsible=icon]:block" />
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {links.map((link) => {
             const isDashboardLink = link.href === '/dashboard';
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
