import { describe, expect, it, vi } from "vitest";
import { buildWorkQueue } from "./workQueue";

// workQueue imports modules that pull the supabase client, which needs browser localStorage; vitest runs in node.
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));

describe("buildWorkQueue", () => {
  it("menyebut langkah dan nominal pada pembayaran menunggu", () => {
    const q = buildWorkQueue({ payments_pending: { count: 3, amount: 16750000 } });
    const item = q.find((x) => x.key === "payments")!;
    expect(item.label).toBe("Verifikasi pembayaran");
    expect(item.hint).toBe("3 menunggu, Rp 16.750.000");
    expect(item.to).toBe("/admin/jamaah/pembayaran");
  });

  it("antrean yang punya pekerjaan dan mendesak tampil lebih dulu", () => {
    const q = buildWorkQueue({ belum_dp: 44, agents_pending: 5, intakes_new: 0 });
    expect(q[0].key).toBe("agen");
    expect(q.findIndex((x) => x.key === "intakes")).toBeGreaterThan(q.findIndex((x) => x.key === "belumdp"));
  });

  it("jatuh tempo menyebut yang sudah lewat", () => {
    const q = buildWorkQueue({ lunas_due: { count: 12, amount: 2786100000 }, lunas_overdue: 93 });
    expect(q.find((x) => x.key === "lunas")!.hint).toContain("93 sudah lewat");
  });

  it("tanpa data tidak melempar galat", () => {
    expect(() => buildWorkQueue({})).not.toThrow();
    expect(buildWorkQueue({}).every((x) => x.value === 0)).toBe(true);
  });
});
