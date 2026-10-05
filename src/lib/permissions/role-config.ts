export type AppRole = "super_admin" | "admin" | "pic" | "client";

export type NavItem = {
  label: string;
  href: string;
  icon: string;
};

const commonAccount: NavItem = {
  label: "Akun",
  href: "/app/account",
  icon: "⚙",
};

export const roleNavigation: Record<AppRole, NavItem[]> = {
  super_admin: [
    { label: "Dashboard", href: "/app/dashboard", icon: "▦" },
    { label: "Pekerjaan", href: "/app/reporting", icon: "▤" },
    { label: "Manajemen User", href: "/app/users", icon: "♙" },
    { label: "Data Stockpoint", href: "/app/master-data", icon: "◆" },
    commonAccount,
  ],
  admin: [
    { label: "Dashboard", href: "/app/dashboard", icon: "▦" },
    { label: "Pekerjaan", href: "/app/reporting", icon: "▤" },
    { label: "Manajemen User", href: "/app/users", icon: "♙" },
    { label: "Data Stockpoint", href: "/app/master-data", icon: "◆" },
    commonAccount,
  ],
  pic: [
    { label: "Dashboard", href: "/app/dashboard", icon: "▦" },
    { label: "Input Branding", href: "/app/submissions", icon: "＋" },
    { label: "Pekerjaan Saya", href: "/app/reporting", icon: "▤" },
    commonAccount,
  ],
  client: [
    { label: "Dashboard", href: "/app/dashboard", icon: "▦" },
    { label: "Laporan", href: "/app/reporting", icon: "▤" },
    commonAccount,
  ],
};

export const roleLabels: Record<AppRole, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  pic: "PIC",
  client: "Klien",
};

export function isAppRole(value: string | null): value is AppRole {
  return ["super_admin", "admin", "pic", "client"].includes(value ?? "");
}
