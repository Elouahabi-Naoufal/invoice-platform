import {
  LayoutDashboard, FileText, Users, Building2, Settings, Package, Repeat, Bell,
  Shield, Handshake, Globe, FileDown, BarChart3,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  exact?: boolean;
}

export const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: "Overview",
    items: [
      { href: "/", label: "Dashboard", icon: LayoutDashboard, exact: true },
      { href: "/reports", label: "Reports", icon: BarChart3 },
    ],
  },
  {
    label: "Sales",
    items: [
      { href: "/invoices", label: "Invoices", icon: FileText },
      { href: "/clients", label: "Clients", icon: Users },
      { href: "/products", label: "Products", icon: Package },
    ],
  },
  {
    label: "Billing",
    items: [
      { href: "/recurring", label: "Recurring", icon: Repeat },
      { href: "/relances", label: "Reminders", icon: Bell },
      { href: "/lettrage", label: "Lettrage", icon: Handshake },
    ],
  },
  {
    label: "Sharing",
    items: [
      { href: "/portal", label: "Client portal", icon: Globe },
      { href: "/exports", label: "Exports", icon: FileDown },
    ],
  },
  {
    label: "Organization",
    items: [
      { href: "/members", label: "Team", icon: Shield },
      { href: "/companies", label: "Companies", icon: Building2 },
      { href: "/settings", label: "Settings", icon: Settings },
    ],
  },
];

/** Flat list used by the command palette and search. */
export const NAV_FLAT = NAV_GROUPS.flatMap((g) => g.items.map((i) => ({ ...i, group: g.label })));
