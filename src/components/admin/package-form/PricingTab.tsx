import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";

export const PricingTab = ({
  form,
  hasHemat,
  hasNyaman,
  hasFiveStar,
  hasPelataranHemat,
  renderTierSection
}: any) => {
  return (
    <div className="space-y-8">
      {/* Tier Selection - clickable boxes */}
      <Card data-form-section className="shadow-md border-slate-200 overflow-hidden mb-6">
        <CardHeader className="bg-slate-50/80 border-b border-slate-100 pb-4">
          <CardTitle>Tier Paket</CardTitle>
          <CardDescription>Pilih satu tier untuk paket ini</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <FormField
            control={form.control}
            name="available_tiers"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <RadioGroup
                    value={field.value?.[0] || ""}
                    onValueChange={(val) => field.onChange([val])}
                    className="grid grid-cols-2 md:grid-cols-4 gap-3"
                  >
                    {[
                      { value: "hemat", label: "Hemat" },
                      { value: "nyaman", label: "Nyaman" },
                      { value: "five-star", label: "Five Star" },
                      { value: "pelataran-hemat", label: "Pelataran Hemat" },
                    ].map((tier) => (
                      <label
                        key={tier.value}
                        htmlFor={`tier-${tier.value}`}
                        className={cn(
                          "flex items-center gap-2 rounded-lg border p-3 cursor-pointer transition-all",
                          field.value?.[0] === tier.value
                            ? "border-primary bg-primary/5 ring-2 ring-primary/20 opacity-100"
                            : "opacity-50 hover:opacity-100 hover:bg-slate-50 border-slate-200"
                        )}
                      >
                        <RadioGroupItem value={tier.value} id={`tier-${tier.value}`} />
                        <span className="font-medium text-sm">{tier.label}</span>
                      </label>
                    ))}
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </CardContent>
      </Card>

      {/* Tier Sections */}
      {hasHemat && renderTierSection("Hemat", "hemat_makkah", "hemat_madinah", "hemat_price", "hemat_transport")}
      {hasNyaman && renderTierSection("Nyaman", "makkah", "madinah", "price", "best_seller_transport")}
      {hasFiveStar && renderTierSection("Five Star", "five_star_makkah", "five_star_madinah", "five_star_price", "five_star_transport")}
      {hasPelataranHemat && renderTierSection("Pelataran Hemat", "pelataran_makkah", "pelataran_madinah", "pelataran_price", "pelataran_transport")}
    </div>
  );
};
