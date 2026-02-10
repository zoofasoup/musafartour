import { z } from "zod";

export const packagePriceSchema = z.object({
  quad: z.number(),
  triple: z.number(),
  double: z.number(),
});

export type PackagePrice = z.infer<typeof packagePriceSchema>;

export const parsePackagePrice = (raw: unknown): PackagePrice => {
  const result = packagePriceSchema.safeParse(raw);
  if (result.success) return result.data;
  return { quad: 0, triple: 0, double: 0 };
};
