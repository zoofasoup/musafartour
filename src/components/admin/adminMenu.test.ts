import { describe, expect, it, vi } from "vitest";
import { getAdminHomePath, getMenuSectionsForRole } from "./adminMenu";
import { menuBadgeFor } from "@/hooks/useAdminWorkCounts";
import { findActiveItem } from "@/components/shell/navMatch";
import type { ShellNavGroup } from "@/components/shell/types";

// useAdminWorkCounts imports the supabase client, which needs browser localStorage; vitest runs in node.
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));

const paths = (role: string) => getMenuSectionsForRole(role).flatMap((s) => s.items.map((i) => i.path));

describe("menu Pendaftaran Masuk", () => {
  it("ada untuk CS dan owner, tidak untuk finance", () => {
    expect(paths("cs_admin")).toContain("/admin/jamaah/masuk");
    expect(paths("admin")).toContain("/admin/jamaah/masuk");
    expect(paths("finance")).not.toContain("/admin/jamaah/masuk");
  });

  it("tampil tepat sebelum Data Jamaah", () => {
    const list = paths("cs_admin");
    expect(list.indexOf("/admin/jamaah/masuk")).toBe(list.indexOf("/admin/jamaah") - 1);
  });

  it("lencana pendaftaran pindah ke menu barunya", () => {
    const counts = { intakes_new: 4 };
    expect(menuBadgeFor("/admin/jamaah/masuk", counts)).toBe(4);
    expect(menuBadgeFor("/admin/jamaah", counts)).toBe(0);
  });

  it("rute /admin/jamaah/masuk menyorot menu barunya, bukan Data Jamaah", () => {
    const groups: ShellNavGroup[] = [
      {
        label: "x",
        items: [
          { title: "Pendaftaran Masuk", url: "/admin/jamaah/masuk", icon: (() => null) as never },
          { title: "Data Jamaah", url: "/admin/jamaah", icon: (() => null) as never, alsoActive: ["/admin/jamaah/semua"] },
        ],
      },
    ];
    expect(findActiveItem(groups, "/admin/jamaah/masuk")?.title).toBe("Pendaftaran Masuk");
    expect(findActiveItem(groups, "/admin/jamaah/semua")?.title).toBe("Data Jamaah");
  });
});

describe("beranda per peran", () => {
  it.each([
    ["cs_admin", "/admin/jamaah/masuk"],
    ["agent_admin", "/admin/agents"],
    ["content_admin", "/admin/articles"],
    ["advertiser", "/admin/analytics"],
    ["finance", "/admin/pembayaran-komisi"],
    ["product_admin", "/admin/packages"],
  ])("%s mendarat di %s", (role, path) => {
    expect(getAdminHomePath(role)).toBe(path);
  });

  it("owner tetap di Dashboard", () => {
    expect(getAdminHomePath("admin")).toBeNull();
    expect(getAdminHomePath("superadmin")).toBeNull();
  });

  it("setiap beranda ada di menu peran itu", () => {
    for (const role of ["cs_admin", "agent_admin", "content_admin", "advertiser", "finance", "product_admin"]) {
      expect(paths(role)).toContain(getAdminHomePath(role));
    }
  });
});
