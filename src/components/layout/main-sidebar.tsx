
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
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
} from "@/components/ui/sidebar";
import { Logo } from "@/components/icons";
import type { User } from "@/lib/types";
import { cn } from "@/lib/utils";

const commonLinks = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/dashboard/interviews", label: "My Interviews", icon: FileText },
  { href: "/dashboard/progress", label: "My Progress", icon: BarChart },
];

const agencySubLinks = [
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
  
  const isAgencyPage = pathname.startsWith('/dashboard/agency');

  // Admin has a completely separate sidebar
  if (user.role === 'admin') {
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
                {adminLinks.map((link) => (
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
    )
  }

  // Combined sidebar for user and agency
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
          {commonLinks.map((link) => (
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
          
          {user.role === 'agency' && (
            <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isAgencyPage && pathname === '/dashboard/agency'} tooltip="Agency">
                    <Link href="/dashboard/agency">
                        <Building />
                        <span>Agency</span>
                    </Link>
                </SidebarMenuButton>
                <SidebarMenuSub>
                    {agencySubLinks.map((subLink) => (
                        <SidebarMenuSubItem key={subLink.href}>
                            <SidebarMenuSubButton asChild isActive={pathname === subLink.href}>
                                <Link href={subLink.href}>
                                    <subLink.icon />
                                    <span>{subLink.label}</span>
                                </Link>
                            </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                    ))}
                </SidebarMenuSub>
            </SidebarMenuItem>
          )}

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
