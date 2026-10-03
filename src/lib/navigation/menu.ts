import type { AppRole } from "../../types/domain";
import {
  LayoutDashboard, BriefcaseBusiness, FilePlus2, FileCheck2, FileClock,
  Users, Database, ClipboardList, UserRound, ShieldCheck, BarChart3
} from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon: any;
};

export type NavGroup = {
  label?: string;
  icon?: any;
  items: NavItem[];
};

export const menuByRole: Record<AppRole, NavGroup[]> = {
  super_admin: [
    { items: [{ label: "Dashboard", href: "/app/dashboard", icon: LayoutDashboard }] },
    {
      label: "Pekerjaan",
      icon: BriefcaseBusiness,
      items: [
        { label: "Data Pekerjaan", href: "/app/jobs", icon: ClipboardList },
      ],
    },
    {
      label: "Data & Pengguna",
      icon: Database,
      items: [
        { label: "Master Data", href: "/app/master-data", icon: Database },
        { label: "Manajemen User", href: "/app/users", icon: Users },
        { label: "Manajemen PIC", href: "/app/pics", icon: UserRound },
      ],
    },
    {
      label: "Sistem",
      icon: ShieldCheck,
      items: [
        { label: "Audit Log", href: "/app/audit", icon: ShieldCheck },
      ],
    },
    { items: [{ label: "Akun", href: "/app/account", icon: UserRound }] },
  ],
  admin: [
    { items: [{ label: "Dashboard", href: "/app/dashboard", icon: LayoutDashboard }] },
    {
      label: "Pekerjaan",
      icon: BriefcaseBusiness,
      items: [
        { label: "Data Pekerjaan", href: "/app/jobs", icon: ClipboardList },
      ],
    },
    {
      label: "Data & Pengguna",
      icon: Database,
      items: [
        { label: "Master Data", href: "/app/master-data", icon: Database },
        { label: "Manajemen User", href: "/app/users", icon: Users },
        { label: "Manajemen PIC", href: "/app/pics", icon: UserRound },
      ],
    },
    { items: [{ label: "Akun", href: "/app/account", icon: UserRound }] },
  ],
  pic: [
    { items: [{ label: "Dashboard", href: "/app/dashboard", icon: LayoutDashboard }] },
    {
      label: "Pekerjaan",
      icon: BriefcaseBusiness,
      items: [
        { label: "Input Branding", href: "/app/submissions", icon: FilePlus2 },
        { label: "Draft Saya", href: "/app/my-work?status=draft", icon: FileClock },
        { label: "Pekerjaan Selesai", href: "/app/my-work?status=done", icon: FileCheck2 },
      ],
    },
    { items: [{ label: "Akun", href: "/app/account", icon: UserRound }] },
  ],
  client: [
    { items: [{ label: "Dashboard", href: "/app/dashboard", icon: LayoutDashboard }] },
    {
      label: "Data",
      icon: ClipboardList,
      items: [
        { label: "Laporan", href: "/app/reporting", icon: BarChart3 },
      ],
    },
    { items: [{ label: "Akun", href: "/app/account", icon: UserRound }] },
  ],
};
