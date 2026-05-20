"use client";

import { usePathname } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { AuthGuard } from "@/components/auth/AuthGuard";
import {
  MEMBER_NAV,
  STUDENT_NAV,
  LEADER_NAV,
  G12_NAV,
  ADMIN_NAV,
  SUPERADMIN_NAV,
  type NavItem,
} from "@/components/layout/RoleNav";
import { useSessionUser } from "@/application/hooks/useSessionUser";
import { useAppSelector } from "@/application/hooks/useAppSelector";

const TITLE_MAP: Array<{ test: RegExp; title: string }> = [
  { test: /^\/home/, title: "Home" },
  { test: /^\/school/, title: "Bible School" },
  { test: /^\/apply\/student\/pending/, title: "Application Submitted" },
  { test: /^\/apply\/student/, title: "Apply to Become a Student" },
  { test: /^\/my-requests/, title: "My Requests" },
  { test: /^\/my-cells\/[^/]+/, title: "Cell" },
  { test: /^\/my-cells/, title: "My Cells" },
  { test: /^\/profile/, title: "Profile" },
  { test: /^\/notifications/, title: "Notifications" },
];

/**
 * Universal authenticated shell.
 *
 * For most routes this is the Member cross-module hub — the sidebar shows
 * MEMBER_NAV regardless of the viewer's elevated roles, so a G12 / Leader /
 * Student clicking "Home" gets the full Member experience.
 *
 * For `/my-requests` the rule flips: the page is the user's *own* requests,
 * so the sidebar follows the user's highest-priority active role. A Student
 * clicking "My Requests" from their Student sidebar stays in the Student
 * shell; a Leader stays in Leader shell; a pure Member stays in MEMBER_NAV.
 * This stops the route from yanking the user out of their working context.
 */
export default function AuthedLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "";
  const title = TITLE_MAP.find((m) => m.test.test(pathname))?.title ?? "TCCR";
  const user = useSessionUser();
  // Profile and notifications are personal account pages — always show MEMBER_NAV.
  // They are not role-specific surfaces; the content is identical regardless of role.
  let navItems: NavItem[] = MEMBER_NAV;
  let roleLabel = "Member";
  let dashboardHref = "/home";

  return (
    <AuthGuard allowedRoles={["member", "student", "leader", "g12", "admin", "super_admin"]}>
      <AppShell
        navItems={navItems}
        user={user}
        roleLabel={roleLabel}
        title={title}
        dashboardHref={dashboardHref}
      >
        {children}
      </AppShell>
    </AuthGuard>
  );
}
