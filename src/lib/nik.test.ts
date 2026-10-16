import { describe, expect, it } from "vitest";
import { nikProblem } from "./nik";

describe("nikProblem", () => {
  it("accepts a well-formed NIK", () => expect(nikProblem("3171231501900001")).toBeNull());
  it("rejects wrong length", () => expect(nikProblem("12345")).toMatch(/16 angka/));
  it("rejects an unknown province code", () => expect(nikProblem("9999234567890001")).toMatch(/provinsi/));
  it("rejects an impossible birth month", () => expect(nikProblem("3171231513900001")).toMatch(/Tanggal lahir/));
  it("accepts a woman's birth day (day + 40)", () => expect(nikProblem("3171235501900001")).toBeNull());
});
