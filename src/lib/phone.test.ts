import { describe, expect, it } from "vitest";
import { formatPhone } from "./phone";

describe("formatPhone", () => {
  it.each([
    ["081234567890", "0812 3456 7890"],
    ["+62 812-3456-7890", "0812 3456 7890"],
    ["62812 3456 7890", "0812 3456 7890"],
    ["812 3456 7890", "0812 3456 7890"],
    ["(0812) 3456 7890", "0812 3456 7890"],
    ["0062 812 3456 7890", "0812 3456 7890"],
  ])("%s -> %s", (raw, out) => expect(formatPhone(raw)).toBe(out));

  it("keeps partial input readable while typing", () => {
    expect(formatPhone("0812")).toBe("0812");
    expect(formatPhone("08123")).toBe("0812 3");
  });
});
